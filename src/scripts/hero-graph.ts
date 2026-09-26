/**
 * Hero attack-path graph (interactions spec §2) — successor to the 2021 site's constellation.
 *
 * Hosts drift slowly across the hero; any two closer than LINK px are joined by a hairline. The
 * pointer acts as one more node: it links to hosts within CURSOR_LINK px in the accent colour
 * and they lean slightly toward it. Every 3.5–6 s a signal trace picks an entry host, walks a
 * 3–6 hop chain along live edges, and an accent pulse runs it at 600 px/s; the path then glows,
 * the target gets a lock-on reticle, and both fade over GLOW_MS.
 *
 * Budget: everything lives in preallocated typed arrays (no allocation per frame), neighbours
 * come from a uniform grid of LINK-sized cells, and edges are stroked as one path per alpha
 * bucket. The loop runs only while the hero is on screen, the tab is visible and motion is
 * allowed; otherwise the canvas holds one static frame (hosts and edges, no pulses) and no
 * frame is requested at all. Frames are capped near 60 fps, and all motion is time-based.
 *
 * Colours come from the design tokens (--line-ui, --text-subtle, --accent), resolved through
 * the canvas's own computed `color`, and are re-read when the scheme changes.
 */
import { motionAllowed, onMotionChange } from './motion';

const MIN_NODES = 24;
const MAX_NODES = 70;
/** CSS px² of hero per host. */
const AREA_PER_NODE = 14_000;
/** Hosts closer than this (CSS px) are joined. */
const LINK = 140;
const CURSOR_LINK = 180;
/** Drift speed range: 0.05–0.15 px per 60 fps frame, as px/ms. */
const SPEED_MIN = 0.003;
const SPEED_MAX = 0.009;
/** At most this share of the pointer distance a host leans in (scaled by proximity). */
const PULL = 0.16;
const PULL_EASE_MS = 320;
const CURSOR_EASE_MS = 240;
/** Pulse speed, px/ms (600 px/s), tail length (px) and tail slices. */
const PULSE_SPEED = 0.6;
const TAIL = 110;
const TAIL_SLICES = 10;
const GLOW_MS = 800;
const FLASH_MS = 650;
const LOCK_MS = 200;
const TRACE_GAP_MIN = 3500;
const TRACE_GAP_MAX = 6000;
const FIRST_TRACE_MS = 1400;
const MAX_TRACES = 2;
const MIN_HOPS = 3;
const MAX_HOPS = 6;
/** Edge alpha: EDGE_NEAR at distance 0 → EDGE_FAR at FADE_FROM·LINK → 0 at LINK. */
const EDGE_NEAR = 0.45;
const EDGE_FAR = 0.2;
const FADE_FROM = 0.82;
const BUCKETS = 9;
const CURSOR_BUCKETS = 4;
const CURSOR_ALPHA = 0.38;
/** Share of hosts drawn as hollow "asset" squares rather than plain points. */
const ASSET_SHARE = 0.14;
/** rAF callbacks closer together than this are skipped: ~60 fps on 90/120 Hz screens. */
const MIN_FRAME_MS = 12;
/** Longest step simulated after a stall, so a hiccup never teleports the hosts. */
const MAX_STEP_MS = 50;
const RESIZE_DEBOUNCE_MS = 150;
const MAX_DPR = 2;
/**
 * Where hosts drift (the "field"): the part of the canvas the hero's CSS mask opens onto, so
 * none are simulated under the text column for nothing — right of WIDE_FIELD_LEFT × width on
 * wide screens. Below 60rem the canvas itself is only the top band of the hero (Hero.astro),
 * the one part its mask shows, so there the field is the whole canvas.
 */
const NARROW = '(width < 60rem)';
const WIDE_FIELD_LEFT = 0.3;

const MAX_EDGES = (MAX_NODES * (MAX_NODES - 1)) / 2;
const NONE = -1;

interface Trace {
  active: boolean;
  /** Host indices along the chain; `count` of them are used. */
  path: Int16Array;
  count: number;
  /** Clock time the pulse left the entry host, and when it reached the target (−1: not yet). */
  start: number;
  arrived: number;
  /** Cumulative distance of each host along the chain, refreshed every frame. */
  at: Float32Array;
  /** Clock time the pulse reached each host (−1: not yet). */
  hit: Float32Array;
}

interface Colors {
  edge: string;
  node: string;
  accent: string;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);
const easeOut = (t: number) => 1 - (1 - t) * (1 - t) * (1 - t);

/**
 * Starts the graph on `canvas` (its backing store follows the element's CSS box); pointer
 * input comes from `surface`, the hero section.
 */
export function createHeroGraph(canvas: HTMLCanvasElement, surface: HTMLElement): void {
  const maybeCtx = canvas.getContext('2d', { alpha: true });
  if (!maybeCtx) return;
  const ctx: CanvasRenderingContext2D = maybeCtx;

  // ── State (all preallocated) ─────────────────────────────────────────────
  const px = new Float32Array(MAX_NODES); // base position (drifts)
  const py = new Float32Array(MAX_NODES);
  const vx = new Float32Array(MAX_NODES); // px/ms
  const vy = new Float32Array(MAX_NODES);
  const ox = new Float32Array(MAX_NODES); // lean toward the pointer (eased)
  const oy = new Float32Array(MAX_NODES);
  const rx = new Float32Array(MAX_NODES); // rendered position = base + lean
  const ry = new Float32Array(MAX_NODES);
  const asset = new Uint8Array(MAX_NODES);

  const edgeA = new Int16Array(MAX_EDGES);
  const edgeB = new Int16Array(MAX_EDGES);
  const edgeBucket = new Uint8Array(MAX_EDGES);
  let edgeCount = 0;
  const bucketAlpha = new Float32Array(BUCKETS);
  for (let b = 0; b < BUCKETS; b++) bucketAlpha[b] = (EDGE_NEAR * (b + 1)) / BUCKETS;

  // Uniform grid: head of each cell's linked list, and the next host in the same cell.
  let cols = 0;
  let rows = 0;
  let cellHead = new Int16Array(0);
  const cellNext = new Int16Array(MAX_NODES);

  // Adjacency (compressed rows), rebuilt only when a trace starts.
  const adjStart = new Int16Array(MAX_NODES + 1);
  const adjFill = new Int16Array(MAX_NODES);
  const adj = new Int16Array(MAX_EDGES * 2);
  const visited = new Uint8Array(MAX_NODES);

  // Cursor links, bucketed like edges.
  const cursorNode = new Int16Array(MAX_NODES);
  const cursorBucket = new Uint8Array(MAX_NODES);
  let cursorCount = 0;

  const traces: Trace[] = [];
  for (let t = 0; t < MAX_TRACES; t++) {
    traces.push({
      active: false,
      path: new Int16Array(MAX_HOPS + 1),
      count: 0,
      start: 0,
      arrived: -1,
      at: new Float32Array(MAX_HOPS + 1),
      hit: new Float32Array(MAX_HOPS + 1),
    });
  }

  let count = 0;
  let w = 0; // canvas box, CSS px
  let h = 0;
  let fx = 0; // the field the hosts drift in: [fx, w] × [0, h]
  const narrow = matchMedia(NARROW);
  let dpr = 1;
  let colors: Colors = { edge: '#686c72', node: '#8e9398', accent: '#5ed9e6' };

  let clock = 0; // ms of simulated time; advances only while running
  let nextTraceAt = FIRST_TRACE_MS;
  let running: boolean | null = null; // null until the first update() decides
  let raf = 0;
  let lastNow = 0;
  let onScreen = false;

  let pointerIn = false;
  let cursorAmt = 0; // 0..1, eased
  let cx = 0; // pointer in canvas space
  let cy = 0;

  // Scratch output of pointAt().
  let ptX = 0;
  let ptY = 0;

  // ── Setup ────────────────────────────────────────────────────────────────

  /**
   * Resolves the tokens (light-dark() compositions) to concrete colours in one style pass: each
   * goes into a colour property that paints nothing on a canvas, and is read back computed.
   */
  function readColors(): void {
    const { style } = canvas;
    style.setProperty('color', 'var(--line-ui)');
    style.setProperty('text-decoration-color', 'var(--text-subtle)');
    style.setProperty('column-rule-color', 'var(--accent)');
    const computed = getComputedStyle(canvas);
    colors = {
      edge: computed.color,
      node: computed.textDecorationColor,
      accent: computed.columnRuleColor,
    };
    style.removeProperty('color');
    style.removeProperty('text-decoration-color');
    style.removeProperty('column-rule-color');
  }

  function seed(i: number): void {
    px[i] = fx + Math.random() * (w - fx);
    py[i] = Math.random() * h;
    const angle = Math.random() * Math.PI * 2;
    const speed = rand(SPEED_MIN, SPEED_MAX);
    vx[i] = Math.cos(angle) * speed;
    vy[i] = Math.sin(angle) * speed;
    ox[i] = 0;
    oy[i] = 0;
    rx[i] = px[i]!;
    ry[i] = py[i]!;
    asset[i] = Math.random() < ASSET_SHARE ? 1 : 0;
  }

  /** Sizes the backing store to the element; rescales existing hosts instead of reseeding. */
  function resize(): boolean {
    const nw = canvas.clientWidth;
    const nh = canvas.clientHeight;
    const nfx = narrow.matches ? 0 : Math.round(nw * WIDE_FIELD_LEFT);
    const ndpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    if (nw === w && nh === h && nfx === fx && ndpr === dpr) return false;
    if (nw === 0 || nh === 0) return false;

    // Count by the canvas area (1 per AREA_PER_NODE, clamped): the hero box on wide screens,
    // the top band on narrow ones.
    const target = clamp(Math.round((nw * nh) / AREA_PER_NODE), MIN_NODES, MAX_NODES);
    if (count === 0) {
      w = nw;
      h = nh;
      fx = nfx;
      for (let i = 0; i < target; i++) seed(i);
    } else {
      // Map each host's place in the old field onto the new one: no reseeding, no pops.
      const sx = (nw - nfx) / (w - fx || 1);
      const sy = nh / (h || 1);
      for (let i = 0; i < count; i++) {
        px[i] = nfx + (px[i]! - fx) * sx;
        py[i] = py[i]! * sy;
        rx[i] = px[i]! + ox[i]!;
        ry[i] = py[i]! + oy[i]!;
      }
      w = nw;
      h = nh;
      fx = nfx;
      for (let i = count; i < target; i++) seed(i);
      // A shrinking hero drops hosts; retire any trace that used one.
      if (target < count) for (let k = 0; k < MAX_TRACES; k++) traces[k]!.active = false;
    }
    count = target;
    dpr = ndpr;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    cols = Math.max(1, Math.ceil(w / LINK));
    rows = Math.max(1, Math.ceil(h / LINK));
    cellHead = new Int16Array(cols * rows);
    return true;
  }

  // ── Simulation ───────────────────────────────────────────────────────────

  function step(dt: number): void {
    cursorAmt += ((pointerIn ? 1 : 0) - cursorAmt) * (1 - Math.exp(-dt / CURSOR_EASE_MS));
    if (cursorAmt < 0.002) cursorAmt = 0;

    const lean = 1 - Math.exp(-dt / PULL_EASE_MS);
    const reach2 = CURSOR_LINK * CURSOR_LINK;
    for (let i = 0; i < count; i++) {
      let x = px[i]! + vx[i]! * dt;
      let y = py[i]! + vy[i]! * dt;
      if (x < fx || x > w) {
        vx[i] = -vx[i]!;
        x = clamp(x, fx, w);
      }
      if (y < 0 || y > h) {
        vy[i] = -vy[i]!;
        y = clamp(y, 0, h);
      }
      px[i] = x;
      py[i] = y;

      let tx = 0;
      let ty = 0;
      if (cursorAmt > 0) {
        const dx = cx - x;
        const dy = cy - y;
        const d2 = dx * dx + dy * dy;
        if (d2 < reach2) {
          const f = PULL * (1 - Math.sqrt(d2) / CURSOR_LINK) * cursorAmt;
          tx = dx * f;
          ty = dy * f;
        }
      }
      ox[i] = ox[i]! + (tx - ox[i]!) * lean;
      oy[i] = oy[i]! + (ty - oy[i]!) * lean;
      rx[i] = x + ox[i]!;
      ry[i] = y + oy[i]!;
    }

    if (clock >= nextTraceAt) {
      startTrace();
      nextTraceAt = clock + rand(TRACE_GAP_MIN, TRACE_GAP_MAX);
    }
  }

  /** Neighbour search over the uniform grid: each pair is tested once, O(n) cells. */
  function buildEdges(): void {
    cellHead.fill(NONE);
    for (let i = 0; i < count; i++) {
      const c = cellOf(rx[i]!, ry[i]!);
      cellNext[i] = cellHead[c]!;
      cellHead[c] = i;
    }
    edgeCount = 0;
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const c = gy * cols + gx;
        for (let i = cellHead[c]!; i !== NONE; i = cellNext[i]!) {
          for (let j = cellNext[i]!; j !== NONE; j = cellNext[j]!) link(i, j);
          if (gx + 1 < cols) linkCell(i, c + 1);
          if (gy + 1 < rows) {
            if (gx > 0) linkCell(i, c + cols - 1);
            linkCell(i, c + cols);
            if (gx + 1 < cols) linkCell(i, c + cols + 1);
          }
        }
      }
    }
  }

  function cellOf(x: number, y: number): number {
    const gx = clamp(Math.floor(x / LINK), 0, cols - 1);
    const gy = clamp(Math.floor(y / LINK), 0, rows - 1);
    return gy * cols + gx;
  }

  function linkCell(i: number, cell: number): void {
    for (let j = cellHead[cell]!; j !== NONE; j = cellNext[j]!) link(i, j);
  }

  function link(i: number, j: number): void {
    const dx = rx[i]! - rx[j]!;
    const dy = ry[i]! - ry[j]!;
    const d2 = dx * dx + dy * dy;
    if (d2 >= LINK * LINK) return;
    const q = Math.sqrt(d2) / LINK;
    const alpha =
      q < FADE_FROM
        ? EDGE_NEAR + (EDGE_FAR - EDGE_NEAR) * (q / FADE_FROM)
        : EDGE_FAR * (1 - (q - FADE_FROM) / (1 - FADE_FROM));
    const bucket = Math.min(BUCKETS - 1, Math.floor((alpha / EDGE_NEAR) * BUCKETS));
    if (alpha < bucketAlpha[0]! * 0.5) return;
    edgeA[edgeCount] = i;
    edgeB[edgeCount] = j;
    edgeBucket[edgeCount] = bucket;
    edgeCount++;
  }

  // ── Signal traces ────────────────────────────────────────────────────────

  /** How visible a point is under the CSS mask: strongest toward the upper right. */
  function prominence(x: number, y: number): number {
    return (x - fx) / (w - fx || 1) - (0.9 * y) / h;
  }

  function buildAdjacency(): void {
    adjStart.fill(0);
    for (let e = 0; e < edgeCount; e++) {
      adjStart[edgeA[e]! + 1]!++;
      adjStart[edgeB[e]! + 1]!++;
    }
    for (let i = 0; i < count; i++) adjStart[i + 1] = adjStart[i + 1]! + adjStart[i]!;
    for (let i = 0; i < count; i++) adjFill[i] = adjStart[i]!;
    for (let e = 0; e < edgeCount; e++) {
      const a = edgeA[e]!;
      const b = edgeB[e]!;
      adj[adjFill[a]!++] = b;
      adj[adjFill[b]!++] = a;
    }
  }

  function startTrace(): void {
    let trace: Trace | undefined;
    for (let k = 0; k < MAX_TRACES; k++) if (!traces[k]!.active) trace = traces[k];
    if (!trace || count < MIN_HOPS + 1) return;
    buildAdjacency();

    for (let attempt = 0; attempt < 6; attempt++) {
      // Entry host: the most prominent of a few random picks that have a neighbour.
      let entry = NONE;
      let best = -Infinity;
      for (let k = 0; k < 5; k++) {
        const i = Math.floor(Math.random() * count);
        if (adjStart[i + 1] === adjStart[i]) continue;
        const score = prominence(rx[i]!, ry[i]!);
        if (score > best) {
          best = score;
          entry = i;
        }
      }
      if (entry === NONE) continue;

      visited.fill(0);
      const hops = MIN_HOPS + Math.floor(Math.random() * (MAX_HOPS - MIN_HOPS + 1));
      trace.path[0] = entry;
      visited[entry] = 1;
      let n = 1;
      let at = entry;
      while (n <= hops) {
        // Random unvisited neighbour (reservoir pick, no allocation).
        let next = NONE;
        let seen = 0;
        for (let k = adjStart[at]!; k < adjStart[at + 1]!; k++) {
          const j = adj[k]!;
          if (visited[j]) continue;
          seen++;
          if (Math.random() * seen < 1) next = j;
        }
        if (next === NONE) break;
        trace.path[n++] = next;
        visited[next] = 1;
        at = next;
      }
      if (n - 1 < MIN_HOPS) continue;

      trace.count = n;
      trace.start = clock;
      trace.arrived = -1;
      trace.hit.fill(-1);
      trace.hit[0] = clock;
      trace.active = true;
      return;
    }
  }

  /** Refreshes cumulative distances along the chain (hosts keep drifting); returns length. */
  function measure(t: Trace): number {
    t.at[0] = 0;
    for (let k = 1; k < t.count; k++) {
      const a = t.path[k - 1]!;
      const b = t.path[k]!;
      t.at[k] = t.at[k - 1]! + Math.hypot(rx[b]! - rx[a]!, ry[b]! - ry[a]!);
    }
    return t.at[t.count - 1]!;
  }

  /** Point at distance `s` along the chain → (ptX, ptY). */
  function pointAt(t: Trace, s: number): void {
    let k = 1;
    while (k < t.count - 1 && t.at[k]! < s) k++;
    const a = t.path[k - 1]!;
    const b = t.path[k]!;
    const seg = t.at[k]! - t.at[k - 1]!;
    const f = seg > 0 ? clamp((s - t.at[k - 1]!) / seg, 0, 1) : 0;
    ptX = rx[a]! + (rx[b]! - rx[a]!) * f;
    ptY = ry[a]! + (ry[b]! - ry[a]!) * f;
  }

  /** Adds the chain between distances s0 and s1 to the current path. */
  function traceRange(t: Trace, s0: number, s1: number): void {
    pointAt(t, s0);
    ctx.moveTo(ptX, ptY);
    for (let k = 1; k < t.count; k++) {
      if (t.at[k]! > s0 && t.at[k]! < s1) {
        const n = t.path[k]!;
        ctx.lineTo(rx[n]!, ry[n]!);
      }
    }
    pointAt(t, s1);
    ctx.lineTo(ptX, ptY);
  }

  function drawTrace(t: Trace): void {
    const length = measure(t);
    const s = (clock - t.start) * PULSE_SPEED;
    if (t.arrived < 0) {
      for (let k = 1; k < t.count; k++) if (t.hit[k]! < 0 && s >= t.at[k]!) t.hit[k] = clock;
      if (s >= length) t.arrived = clock;
    }
    const since = t.arrived < 0 ? 0 : clock - t.arrived;
    if (t.arrived >= 0 && since > GLOW_MS) {
      t.active = false;
      return;
    }
    const glow = t.arrived < 0 ? 0 : 1 - since / GLOW_MS;

    ctx.strokeStyle = colors.accent;
    ctx.fillStyle = colors.accent;

    // Path so far (faint while travelling), then the whole chain glowing and fading.
    ctx.lineWidth = 1;
    ctx.globalAlpha = t.arrived < 0 ? 0.22 : 0.6 * glow * glow;
    ctx.beginPath();
    traceRange(t, 0, Math.min(s, length));
    ctx.stroke();

    // Pulse: a tail brightening toward the head, drained into the target after arrival.
    const head = Math.min(s, length);
    const tailStart = s - TAIL;
    if (tailStart < length) {
      ctx.lineWidth = 1.5;
      const slice = TAIL / TAIL_SLICES;
      for (let k = 0; k < TAIL_SLICES; k++) {
        const s0 = Math.max(0, tailStart + k * slice);
        const s1 = Math.min(head, tailStart + (k + 1) * slice);
        if (s1 <= s0) continue;
        const f = (k + 1) / TAIL_SLICES;
        ctx.globalAlpha = f * f * 0.95;
        ctx.beginPath();
        traceRange(t, s0, s1);
        ctx.stroke();
      }
      if (t.arrived < 0) {
        pointAt(t, head);
        ctx.globalAlpha = 0.16;
        ctx.beginPath();
        ctx.arc(ptX, ptY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(ptX, ptY, 1.75, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Hosts light up as the pulse reaches them.
    for (let k = 0; k < t.count; k++) {
      const hit = t.hit[k]!;
      if (hit < 0) continue;
      const age = clock - hit;
      const lit = k === t.count - 1 ? glow : Math.max(0, 1 - age / FLASH_MS);
      if (lit <= 0) continue;
      const n = t.path[k]!;
      ctx.globalAlpha = lit;
      ctx.fillRect(rx[n]! - 1.5, ry[n]! - 1.5, 3, 3);
    }

    // Target lock-on: corner brackets close in, then fade with the glow.
    if (t.arrived >= 0) {
      const n = t.path[t.count - 1]!;
      const half = 7 + 6 * (1 - easeOut(Math.min(1, since / LOCK_MS)));
      const arm = 3.5;
      const x0 = rx[n]! - half;
      const y0 = ry[n]! - half;
      const x1 = rx[n]! + half;
      const y1 = ry[n]! + half;
      ctx.globalAlpha = glow;
      ctx.lineWidth = 1;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(x0, y0 + arm);
      ctx.lineTo(x0, y0);
      ctx.lineTo(x0 + arm, y0);
      ctx.moveTo(x1 - arm, y0);
      ctx.lineTo(x1, y0);
      ctx.lineTo(x1, y0 + arm);
      ctx.moveTo(x1, y1 - arm);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x1 - arm, y1);
      ctx.moveTo(x0 + arm, y1);
      ctx.lineTo(x0, y1);
      ctx.lineTo(x0, y1 - arm);
      ctx.stroke();
      ctx.lineCap = 'round';
    }
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  function draw(live: boolean): void {
    ctx.clearRect(0, 0, w, h);
    buildEdges();

    // Edges: one path per alpha bucket.
    ctx.lineWidth = 1;
    ctx.strokeStyle = colors.edge;
    for (let b = 0; b < BUCKETS; b++) {
      let any = false;
      ctx.beginPath();
      for (let e = 0; e < edgeCount; e++) {
        if (edgeBucket[e] !== b) continue;
        const i = edgeA[e]!;
        const j = edgeB[e]!;
        ctx.moveTo(rx[i]!, ry[i]!);
        ctx.lineTo(rx[j]!, ry[j]!);
        any = true;
      }
      if (!any) continue;
      ctx.globalAlpha = bucketAlpha[b]!;
      ctx.stroke();
    }

    // The pointer as a node: accent links to hosts in reach, bucketed by proximity.
    if (live && cursorAmt > 0) {
      cursorCount = 0;
      const reach2 = CURSOR_LINK * CURSOR_LINK;
      for (let i = 0; i < count; i++) {
        const dx = rx[i]! - cx;
        const dy = ry[i]! - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 >= reach2) continue;
        const q = 1 - Math.sqrt(d2) / CURSOR_LINK;
        cursorNode[cursorCount] = i;
        cursorBucket[cursorCount] = Math.min(CURSOR_BUCKETS - 1, Math.floor(q * CURSOR_BUCKETS));
        cursorCount++;
      }
      ctx.strokeStyle = colors.accent;
      for (let b = 0; b < CURSOR_BUCKETS; b++) {
        let any = false;
        ctx.beginPath();
        for (let k = 0; k < cursorCount; k++) {
          if (cursorBucket[k] !== b) continue;
          const i = cursorNode[k]!;
          ctx.moveTo(cx, cy);
          ctx.lineTo(rx[i]!, ry[i]!);
          any = true;
        }
        if (!any) continue;
        ctx.globalAlpha = CURSOR_ALPHA * ((b + 1) / CURSOR_BUCKETS) * cursorAmt;
        ctx.stroke();
      }
    }

    // Hosts: points, plus hollow squares for the "asset" hosts.
    ctx.fillStyle = colors.node;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    for (let i = 0; i < count; i++) if (!asset[i]) ctx.rect(rx[i]! - 1, ry[i]! - 1, 2, 2);
    ctx.fill();
    ctx.strokeStyle = colors.node;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < count; i++) if (asset[i]) ctx.rect(rx[i]! - 2.5, ry[i]! - 2.5, 5, 5);
    ctx.stroke();

    if (live) for (let k = 0; k < MAX_TRACES; k++) if (traces[k]!.active) drawTrace(traces[k]!);
    ctx.globalAlpha = 1;
  }

  // ── Loop control ─────────────────────────────────────────────────────────

  function frame(now: number): void {
    raf = requestAnimationFrame(frame);
    const elapsed = now - lastNow;
    if (elapsed < MIN_FRAME_MS) return;
    lastNow = now;
    const dt = Math.min(elapsed, MAX_STEP_MS);
    clock += dt;
    step(dt);
    draw(true);
  }

  /** Runs the loop only while on screen, visible and allowed; otherwise one static frame. */
  function update(): void {
    const run = onScreen && !document.hidden && motionAllowed();
    if (run === running) return;
    const first = running === null;
    running = run;
    // Either way a frame is on the canvas when this returns: the current live frame (the loop
    // continues from the next animation frame) or the static one.
    if (run) {
      draw(true);
      lastNow = performance.now();
      raf = requestAnimationFrame(frame);
    } else {
      cancelAnimationFrame(raf);
      raf = 0;
      draw(false);
    }
    canvas.dataset.state = run ? 'running' : 'static';
    // Fade in once the first frame (static or live) is on the canvas.
    if (first) canvas.classList.add('is-ready');
  }

  // Setup only; the first frame is drawn when the IntersectionObserver first reports (its own
  // task), keeping this one short.
  readColors();
  resize();

  // On screen = the canvas itself (on phones only the hero's top band), parallax included.
  new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? false;
    update();
  }).observe(canvas);
  document.addEventListener('visibilitychange', update);
  onMotionChange(update);

  let resizeTimer = 0;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (resize() && running === false) draw(false);
    }, RESIZE_DEBOUNCE_MS);
  }).observe(canvas);

  const recolor = () => {
    readColors();
    if (running === false) draw(false);
  };
  new MutationObserver(recolor).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-scheme'],
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', recolor);

  surface.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'touch') return;
      // Measured here, not per frame: the canvas box as painted, parallax translate included.
      const r = canvas.getBoundingClientRect();
      cx = ((event.clientX - r.left) * w) / (r.width || 1);
      cy = ((event.clientY - r.top) * h) / (r.height || 1);
      pointerIn = true;
    },
    { passive: true },
  );
  surface.addEventListener('pointerleave', () => (pointerIn = false), { passive: true });
}
