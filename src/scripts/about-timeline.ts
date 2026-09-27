/**
 * The About timeline's constellation (AboutTimeline.astro; Portfolio.dc.html, Claude Design,
 * Sept 2026), wide layouts only. Behind the stops, a canvas draws a drifting field of points
 * with faint links, the path through every stop (a bent waypoint between each pair), and an
 * accent trace along that path which follows the reader: it runs to wherever a sensor line 78%
 * down the viewport crosses the path, easing after it, with a fading tail and a glowing head.
 * Each stop's text rises in as the trace reaches its node (a square flash marks the hit) and
 * drops back out if the reader scrolls back above it. When the trace completes, a reticle
 * closes on the last node and the whole path glows once.
 *
 * Motion gate (src/scripts/motion.ts): with motion off the trace is simply drawn complete, every
 * stop is shown, the field holds still, and nothing loops. With motion on, a frame loop runs
 * only while the timeline is within 200px of the viewport. Nothing here listens to `scroll`: the
 * loop reads the timeline's position once a frame while it's on screen.
 *
 * Node positions come from the page (the stops' static node markers, laid out by CSS from
 * src/lib/timeline.ts), so the canvas and the text can never disagree about where a stop is.
 */
import { readTokenColors } from './canvas-colors';
import { motionAllowed, onMotionChange } from './motion';

/** Where the reader "is": this far down the viewport. */
const SENSOR = 0.78;
/** A reached stop hides again only once the trace is this far (px) back above its node. */
const HYSTERESIS = 28;
/** Points closer than this (px) are linked, fainter with distance. */
const LINK = 125;
const MAX_DPR = 2;
const MAX_STEP_MS = 50;
/** The trace eases toward its target: slower forward than back (ms time constants). */
const TAU_FORWARD = 260;
const TAU_BACK = 170;
/** …but never slower than this (px per ms), so a long jump still arrives. */
const MIN_SPEED = 0.25;
const TAIL = 120;
const TAIL_SLICES = 12;
const FLASH_MS = 700;
const LOCK_MS = 1400;
const LOCK_SNAP_MS = 220;
/** The field of drifting points sits in the middle band, between the two columns of text. */
const FIELD_FROM = 0.345;
const FIELD_TO = 0.655;
const FIELD_DENSITY = 30; // px of height per point
const WIDE = '(width >= 62.5rem)';

interface Point {
  x: number;
  y: number;
  /** A bend between two stops (drawn as a small dot), not a stop. */
  bend?: boolean;
}

interface Drifter extends Point {
  bx: number;
  by: number;
  square: boolean;
  ax: number;
  ay: number;
  wx: number;
  wy: number;
  px: number;
  py: number;
}

export function createTimeline(root: HTMLElement): void {
  const canvas = root.querySelector('canvas');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;
  const stops = [...root.querySelectorAll<HTMLElement>('.timeline__stop')];
  const marks = stops.map((stop) => stop.querySelector<HTMLElement>('.timeline__mark'));
  if (stops.length < 2 || marks.some((m) => !m)) return;
  const isNow = stops.map((stop) => stop.hasAttribute('data-now'));
  const wide = matchMedia(WIDE);
  const systemDark = matchMedia('(prefers-color-scheme: dark)');

  let w = 0;
  let h = 0;
  let path: Point[] = [];
  /** Path length up to each point. */
  let along: number[] = [];
  let length = 0;
  /** Index into `path` of each stop's node, and its distance along the path. */
  let nodeIndex: number[] = [];
  let nodeAt: number[] = [];
  let field: Drifter[] = [];
  let everything: Point[] = [];

  let current = 0;
  let target = 0;
  let raf = 0;
  let last = 0;
  /** When the trace completed (for the lock-on), or null while it's still travelling. */
  let lockedAt: number | null = null;
  const flashAt = new Map<number, number>();
  const reached = stops.map(() => true);
  let live = false;
  let onScreen = false;
  let colors = { edge: '#686c72', accent: '#f2893d', bg: '#0c0d10' };

  const readColors = () => {
    colors = readTokenColors(canvas, { edge: '--line-ui', accent: '--accent', bg: '--bg' });
  };

  function measure(): void {
    const box = root.getBoundingClientRect();
    w = box.width;
    h = box.height;
    const dpr = Math.min(MAX_DPR, devicePixelRatio || 1);
    canvas!.width = Math.round(w * dpr);
    canvas!.height = Math.round(h * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Seeded, so the constellation is the same shape on every visit and every resize.
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const nodes = marks.map((mark) => {
      const r = mark!.getBoundingClientRect();
      return { x: r.left - box.left, y: r.top - box.top };
    });
    path = [];
    nodeIndex = [];
    nodes.forEach((node, i) => {
      const prev = nodes[i - 1];
      if (prev) {
        // A bend off the straight line between stops, alternating sides.
        const dx = node.x - prev.x;
        const dy = node.y - prev.y;
        const len = Math.hypot(dx, dy) || 1;
        const offset = (i % 2 ? 1 : -1) * (16 + rnd() * 20);
        const f = 0.4 + rnd() * 0.2;
        path.push({
          x: prev.x + dx * f - (dy / len) * offset,
          y: prev.y + dy * f + (dx / len) * offset,
          bend: true,
        });
      }
      nodeIndex.push(path.length);
      path.push({ ...node });
    });
    along = [0];
    for (let k = 1; k < path.length; k++) {
      along.push(
        along[k - 1]! + Math.hypot(path[k]!.x - path[k - 1]!.x, path[k]!.y - path[k - 1]!.y),
      );
    }
    length = along[along.length - 1]!;
    nodeAt = nodeIndex.map((k) => along[k]!);

    const x0 = w * FIELD_FROM;
    const x1 = w * FIELD_TO;
    field = [];
    for (let i = 0; i < Math.round(h / FIELD_DENSITY); i++) {
      const x = x0 + rnd() * (x1 - x0);
      const y = 10 + rnd() * (h - 40);
      field.push({
        bx: x,
        by: y,
        x,
        y,
        square: rnd() < 0.2,
        ax: 5 + rnd() * 7,
        ay: 4 + rnd() * 6,
        wx: (0.22 + rnd() * 0.3) / 1000,
        wy: (0.18 + rnd() * 0.28) / 1000,
        px: rnd() * Math.PI * 2,
        py: rnd() * Math.PI * 2,
      });
    }
    everything = [...field, ...path];
  }

  /** How far along the path the sensor line is. */
  function sense(): void {
    const y = innerHeight * SENSOR - root.getBoundingClientRect().top;
    const first = path[0]!;
    const end = path[path.length - 1]!;
    if (y <= first.y) target = 0;
    else if (y >= end.y) target = length;
    else {
      for (let k = 1; k < path.length; k++) {
        const a = path[k - 1]!;
        const b = path[k]!;
        if (y <= b.y) {
          target = along[k - 1]! + (along[k]! - along[k - 1]!) * ((y - a.y) / (b.y - a.y || 1));
          break;
        }
      }
    }
  }

  const show = (i: number) => delete stops[i]!.dataset.tl;
  const hide = (i: number) => (stops[i]!.dataset.tl = 'off');

  /** Point at distance `d` along the path. */
  function at(d: number): Point {
    for (let k = 1; k < path.length; k++) {
      if (along[k]! >= d) {
        const u = (d - along[k - 1]!) / (along[k]! - along[k - 1]! || 1);
        const a = path[k - 1]!;
        const b = path[k]!;
        return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
      }
    }
    return path[path.length - 1]!;
  }

  function step(now: number, moving: boolean): void {
    const ms = Math.min(MAX_STEP_MS, now - last);
    last = now;
    if (!moving) {
      current = target = length;
    } else {
      const gap = target - current;
      const size = Math.abs(gap);
      if (size > 0.01) {
        const tau = gap > 0 ? TAU_FORWARD : TAU_BACK;
        const move = Math.max(size * (1 - Math.exp(-ms / tau)), MIN_SPEED * ms);
        current += Math.sign(gap) * Math.min(size, move);
      }
    }
    nodeAt.forEach((a, i) => {
      const on = i === 0 ? target > 0 && current > 0.5 : current >= a - 1;
      const off = i === 0 ? target <= 0 && current <= 0.5 : current < a - HYSTERESIS;
      if (!reached[i] && on) {
        reached[i] = true;
        if (moving) flashAt.set(i, now);
        show(i);
      } else if (reached[i] && moving && off) {
        reached[i] = false;
        flashAt.delete(i);
        hide(i);
      }
    });
    if (current >= length - 0.5) lockedAt ??= moving ? now : -Infinity;
    else if (current < length - HYSTERESIS) lockedAt = null;
  }

  function draw(now: number, moving: boolean): void {
    const c = ctx!;
    c.clearRect(0, 0, w, h);
    c.lineWidth = 1;
    c.strokeStyle = colors.edge;
    c.fillStyle = colors.edge;
    if (moving) {
      for (const p of field) {
        p.x = p.bx + p.ax * Math.sin(now * p.wx + p.px);
        p.y = p.by + p.ay * Math.sin(now * p.wy + p.py);
      }
    }
    // Links between every pair of nearby points (field and path alike).
    for (let i = 0; i < everything.length; i++) {
      const a = everything[i]!;
      for (let j = i + 1; j < everything.length; j++) {
        const b = everything[j]!;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d >= LINK) continue;
        c.globalAlpha = 0.38 * (1 - d / LINK);
        c.beginPath();
        c.moveTo(a.x, a.y);
        c.lineTo(b.x, b.y);
        c.stroke();
      }
    }
    c.globalAlpha = 0.8;
    for (const p of field) {
      if (p.square) c.strokeRect(p.x - 2.5, p.y - 2.5, 5, 5);
      else {
        c.beginPath();
        c.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
        c.fill();
      }
    }
    // The path, then its bends.
    c.globalAlpha = 0.55;
    c.beginPath();
    path.forEach((p, k) => (k ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.stroke();
    c.globalAlpha = 0.9;
    for (const p of path) {
      if (!p.bend) continue;
      c.beginPath();
      c.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
      c.fill();
    }

    // The trace: brighter for a moment as it completes, then settling.
    const d = Math.min(current, length);
    const sinceLock = lockedAt === null ? -1 : now - lockedAt;
    let base = 0.6;
    if (sinceLock >= 0 && sinceLock < LOCK_MS) {
      base =
        sinceLock < 400
          ? 0.6 + 0.4 * (sinceLock / 400)
          : 1 - 0.4 * Math.min(1, (sinceLock - 400) / 1000);
    }
    c.strokeStyle = colors.accent;
    c.fillStyle = colors.accent;
    if (d > 0) {
      c.globalAlpha = base;
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(path[0]!.x, path[0]!.y);
      for (let k = 1; k < path.length; k++) {
        if (along[k]! <= d) c.lineTo(path[k]!.x, path[k]!.y);
        else {
          const head = at(d);
          c.lineTo(head.x, head.y);
          break;
        }
      }
      c.stroke();
      if (moving && lockedAt === null) {
        // A tail that fades in toward the head, and the head's glow.
        c.lineWidth = 1.8;
        for (let s = 0; s < TAIL_SLICES; s++) {
          const a = at(Math.max(0, d - TAIL + (TAIL * s) / TAIL_SLICES));
          const b = at(Math.max(0, d - TAIL + (TAIL * (s + 1)) / TAIL_SLICES));
          c.globalAlpha = (s + 1) / TAIL_SLICES;
          c.beginPath();
          c.moveTo(a.x, a.y);
          c.lineTo(b.x, b.y);
          c.stroke();
        }
        const head = at(d);
        c.globalAlpha = 0.18;
        c.beginPath();
        c.arc(head.x, head.y, 10, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 1;
        c.beginPath();
        c.arc(head.x, head.y, 2.6, 0, Math.PI * 2);
        c.fill();
      }
    }

    // Nodes: hollow squares that turn accent once reached; the current stop is a solid bar.
    c.lineWidth = 1;
    nodeIndex.forEach((k, i) => {
      const p = path[k]!;
      const nw = 9;
      const nh = isNow[i] ? 16 : 9;
      c.globalAlpha = 1;
      c.fillStyle = colors.bg;
      c.fillRect(p.x - nw / 2, p.y - nh / 2, nw, nh);
      if (isNow[i] && reached[i]) {
        c.fillStyle = colors.accent;
        c.fillRect(p.x - nw / 2, p.y - nh / 2, nw, nh);
      } else {
        c.strokeStyle = reached[i] ? colors.accent : colors.edge;
        c.strokeRect(p.x - nw / 2 + 0.5, p.y - nh / 2 + 0.5, nw - 1, nh - 1);
      }
      const since = now - (flashAt.get(i) ?? -Infinity);
      if (since >= 0 && since < FLASH_MS) {
        const q = since / FLASH_MS;
        const r = 6 + 10 * q;
        c.strokeStyle = colors.accent;
        c.globalAlpha = 1 - q;
        c.strokeRect(p.x - r, p.y - r, r * 2, r * 2);
      }
    });

    // Lock-on: four brackets close in on the last node.
    if (sinceLock >= 0 || lockedAt === -Infinity) {
      const t = path[path.length - 1]!;
      const e = lockedAt === -Infinity ? 1 : 1 - (1 - Math.min(1, sinceLock / LOCK_SNAP_MS)) ** 3;
      const s = 22 - 8 * e;
      const arm = 5;
      c.globalAlpha = 1;
      c.strokeStyle = colors.accent;
      c.lineWidth = 1.5;
      c.beginPath();
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ] as const) {
        const x = t.x + sx * s;
        const y = t.y + sy * s;
        c.moveTo(x - sx * arm, y);
        c.lineTo(x, y);
        c.lineTo(x, y - sy * arm);
      }
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  const frame = (now: number) => {
    raf = 0;
    if (!live) return;
    const moving = motionAllowed();
    sense();
    step(now, moving);
    draw(now, moving);
    if (moving && onScreen) raf = requestAnimationFrame(frame);
  };

  const kick = () => {
    if (raf || !live) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  /** Stops the trace hasn't reached, and that are out of sight below, wait hidden. */
  function arm(): void {
    root.dataset.arming = '';
    const moving = motionAllowed();
    stops.forEach((stop, i) => {
      reached[i] = !moving || stop.getBoundingClientRect().top < innerHeight;
      if (reached[i]) show(i);
      else hide(i);
    });
    current = 0;
    lockedAt = null;
    requestAnimationFrame(() => delete root.dataset.arming);
  }

  function start(): void {
    if (live) return;
    live = true;
    root.dataset.live = '';
    readColors();
    measure();
    arm();
    kick();
  }

  function stop(): void {
    live = false;
    cancelAnimationFrame(raf);
    raf = 0;
    delete root.dataset.live;
    stops.forEach((_, i) => {
      reached[i] = true;
      show(i);
    });
  }

  const sync = () => (wide.matches ? start() : stop());
  wide.addEventListener('change', sync);
  sync();

  new ResizeObserver(() => {
    if (!live) return;
    measure();
    if (!raf) draw(performance.now(), motionAllowed());
  }).observe(root);

  new IntersectionObserver(
    ([entry]) => {
      onScreen = entry?.isIntersecting ?? false;
      if (onScreen) kick();
    },
    { rootMargin: '200px 0px' },
  ).observe(root);

  onMotionChange((allowed) => {
    if (!live) return;
    if (!allowed) {
      stops.forEach((_, i) => show(i));
      flashAt.clear();
    }
    kick();
  });

  // The scheme changed (toggle or system): re-read the colours and redraw.
  const recolor = () => {
    if (!live) return;
    readColors();
    if (!raf) draw(performance.now(), motionAllowed());
  };
  systemDark.addEventListener('change', recolor);
  new MutationObserver(recolor).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-scheme'],
  });
}
