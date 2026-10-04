/*
 * facts.mjs — code-measured facts for the Jev second-pass photo review.
 * Run from the repo root:  node audit-photos/jev-review/facts.mjs
 * Writes (next to this file): facts.json (AssetFacts[], schema in CONTRACT.md) and inplace/*.png.
 * No judgment lives here: only measurements and thresholds, so Jev can be given buckets, not numbers.
 *
 * BLINDNESS: this script reads only assets.json, inventory.json, carousels.json and the
 * reference-assets/ images. It never touches the first-pass folders named in CONTRACT.md.
 *
 * ── PIXEL FACTS (sharp) ────────────────────────────────────────────────────────────────────
 * Working copy: alpha flattened onto white, greyscale, resized to fit inside 1024x1024 with
 * NO enlargement (small assets stay native, so we never measure interpolation as detail).
 *   sharpness      variance of the 3x3 Laplacian [0 1 0; 1 -4 1; 0 1 0] over interior pixels of
 *                  the 8-bit grey copy.
 *   sharpness_bucket  < SHARP_VERY_SOFT (40)  -> very-soft
 *                     < SHARP_SOFT (150)      -> soft
 *                     < SHARP_MODERATE (500)  -> moderate
 *                     otherwise               -> crisp
 *                  (brief's suggested cut-offs; see the distribution in the report).
 *   mean_luma, luma_p5, luma_p95, luma_spread (=p95-p5): from the 256-bin grey histogram.
 *   near_black_pct  % of pixels with grey <= NEAR_BLACK (16); near_white_pct: grey >= NEAR_WHITE (239).
 *   empty_margin_pct  per edge: scan rows (top/bottom) or columns (left/right) inward from the
 *                  edge while the line's pixel std < UNIFORM_STD (4); result = scanned depth as a
 *                  % of the image height (top/bottom) or width (left/right). 0 = the outermost
 *                  line already has content.
 *   exposure_bucket   blown     mean_luma > 215 OR near_white_pct >= 50
 *                     very-dark mean_luma < 40  OR near_black_pct >= 60
 *                     dark      mean_luma < 90
 *                     bright    mean_luma > 170
 *                     balanced  otherwise            (checked in that order)
 *   contrast_bucket   luma_spread < 50 very-low; < 100 low; <= 180 normal; > 180 high.
 *
 * ── PLACEMENT FACTS (inventory.json + carousels.json) ──────────────────────────────────────
 * Every rendered <img> with a non-zero box whose src file-key (`name.HASH` before the first `_`,
 * same key rule as assets.mjs) equals an asset key is a placement; <video poster> entries
 * (inventory `posters`) are placements too. Hidden images (0x0) are skipped. The /work/ showcase
 * carousel hides all but one slide in the inventory, so its 15 slides per viewport come from
 * carousels.json (role carousel-slide). Exact duplicates (page, viewport, role, box, fit) collapse.
 *   scale (CSS px per source px, source = naturalWidth/Height of currentSrc):
 *     cover  max(rw/nw, rh/nh)     contain min(rw/nw, rh/nh)      fill rw/nw
 *     none   1                     scale-down min(contain, 1)
 *   device_px_per_source_px = scale * dpr. (CONTRACT text says render.w*dpr/source.w; identical
 *     for width-limited cover/contain, and more truthful when cover is height-limited.)
 *   visible_area_pct: cover 100*min(1, rw*rh/(nw*s*nh*s)); contain/fill/scale-down 100;
 *     none 100*min(rw,nw)*min(rh,nh)/(nw*nh). crop_loss_pct = 100 - visible_area_pct.
 *   Posters (<video poster>) have no fit in the inventory; the video box matches the poster's
 *   aspect ratio, so fit is recorded as "contain" with source_used = the asset's own size.
 *   resolution_note: r>1.02 upscaled; 0.98..1.02 ~1:1; r<0.98 downscaled (source has 1/r x more pixels).
 *   role: cover-card (card__img, work-row__thumb, m-reel__cover), carousel-slide (lead__img and
 *     carousels.json), poster (yt__poster, <video poster>), figure (figure__img and other
 *     untagged body images), hero (untagged `cover.*` on a project page), other (photos).
 *
 * ── IN-PLACE CAPTURES (playwright chromium, LIVE site) ─────────────────────────────────────
 * Light colour scheme, reducedMotion, localStorage motion=off. Viewports: desktop 1440x1000 dpr1
 * and mobile 390x844 dpr3 (device-scale PNGs). Per asset per viewport up to 2 placements: the
 * project-page one (page work--<project>, else the first) and the one with the largest
 * crop_loss_pct (deduped). Captured region = nearest ancestor `a, figure, [data-lead], .card, .work-row` (cards use a stretched link in their body, so the .card/.work-row wrapper is the meaningful unit) of the
 * element (so overlays/captions show); if that is >2.5 viewports tall or wider than the viewport,
 * the element box padded by 24px. Fixed/sticky chrome that does not contain the target is
 * hidden during capture so it cannot cover the image. File: inplace/<NN>--<viewport>--<k>.png.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AP = path.resolve(HERE, '..');
const LIVE = 'https://pjackim.github.io/Portfolio/';

const SHARP_VERY_SOFT = 40, SHARP_SOFT = 150, SHARP_MODERATE = 500;
const NEAR_BLACK = 16, NEAR_WHITE = 239, UNIFORM_STD = 4;
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const keyOf = (s) => s.split('/').pop().split('_')[0];

// ───────────────────────── pixel facts ─────────────────────────
async function pixelFacts(file) {
  const abs = path.join(AP, file);
  const { bytes } = { bytes: (await fs.stat(abs)).size };
  const meta = await sharp(abs).metadata();
  const { data, info } = await sharp(abs)
    .flatten({ background: '#ffffff' })
    .greyscale()
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  // Laplacian variance
  let s = 0, s2 = 0, n = 0;
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const l = data[i - 1] + data[i + 1] + data[i - W] + data[i + W] - 4 * data[i];
      s += l; s2 += l * l; n++;
    }
  const sharpness = n ? s2 / n - (s / n) ** 2 : 0;
  // histogram / luma
  const hist = new Array(256).fill(0);
  const rowS = new Float64Array(H), rowS2 = new Float64Array(H), colS = new Float64Array(W), colS2 = new Float64Array(W);
  let sum = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const v = data[y * W + x];
      hist[v]++; sum += v;
      rowS[y] += v; rowS2[y] += v * v; colS[x] += v; colS2[x] += v * v;
    }
  const pct = (p) => { let c = 0; for (let v = 0; v < 256; v++) { c += hist[v]; if (c >= p * N) return v; } return 255; };
  const mean = sum / N, p5 = pct(0.05), p95 = pct(0.95);
  let nb = 0, nw = 0;
  for (let v = 0; v <= NEAR_BLACK; v++) nb += hist[v];
  for (let v = NEAR_WHITE; v < 256; v++) nw += hist[v];
  const nearBlack = (100 * nb) / N, nearWhite = (100 * nw) / N;
  const std = (S, S2, len) => Math.sqrt(Math.max(0, S2 / len - (S / len) ** 2));
  const scan = (get, count, len) => { let d = 0; for (let k = 0; k < count; k++) { if (get(k) < UNIFORM_STD) d++; else break; } return d; };
  const rs = (y) => std(rowS[y], rowS2[y], W), cs = (x) => std(colS[x], colS2[x], H);
  const empty_margin_pct = {
    top: round((100 * scan((k) => rs(k), H)) / H),
    bottom: round((100 * scan((k) => rs(H - 1 - k), H)) / H),
    left: round((100 * scan((k) => cs(k), W)) / W),
    right: round((100 * scan((k) => cs(W - 1 - k), W)) / W),
  };
  const sharpness_bucket = sharpness < SHARP_VERY_SOFT ? 'very-soft' : sharpness < SHARP_SOFT ? 'soft' : sharpness < SHARP_MODERATE ? 'moderate' : 'crisp';
  const spread = p95 - p5;
  const exposure_bucket = mean > 215 || nearWhite >= 50 ? 'blown' : mean < 40 || nearBlack >= 60 ? 'very-dark' : mean < 90 ? 'dark' : mean > 170 ? 'bright' : 'balanced';
  const contrast_bucket = spread < 50 ? 'very-low' : spread < 100 ? 'low' : spread <= 180 ? 'normal' : 'high';
  return {
    native: { w: meta.width, h: meta.height, bytes },
    pixels: {
      sharpness: round(sharpness), sharpness_bucket,
      mean_luma: round(mean), luma_p5: p5, luma_p95: p95, luma_spread: spread,
      near_black_pct: round(nearBlack), near_white_pct: round(nearWhite),
      empty_margin_pct, exposure_bucket, contrast_bucket,
    },
  };
}

// ───────────────────────── placement maths ─────────────────────────
function fitMath(fit, rw, rh, nw, nh) {
  let scale, visible;
  if (fit === 'cover') { scale = Math.max(rw / nw, rh / nh); visible = Math.min(1, (rw * rh) / (nw * scale * nh * scale)) * 100; }
  else if (fit === 'contain') { scale = Math.min(rw / nw, rh / nh); visible = 100; }
  else if (fit === 'scale-down') { scale = Math.min(rw / nw, rh / nh, 1); visible = 100; }
  else if (fit === 'fill') { scale = rw / nw; visible = 100; }
  else if (fit === 'none') { scale = 1; visible = (100 * Math.min(rw, nw) * Math.min(rh, nh)) / (nw * nh); }
  else { scale = Math.max(rw / nw, rh / nh); visible = 100; }
  return { scale, visible };
}
function notes(fit, rw, rh, nw, nh, dpr, position) {
  const { scale, visible } = fitMath(fit, rw, rh, nw, nh);
  const r = scale * dpr;
  const resolution_note = r > 1.02 ? `shown ${round(r)}x larger than its pixels (upscaled)`
    : r >= 0.98 ? 'shown at about 1:1 with its pixels'
    : `source has ${round(1 / r)}x more pixels than needed (downscaled)`;
  const loss = 100 - visible;
  let crop_note;
  if (fit === 'cover') {
    const axis = rw / nw >= rh / nh ? 'top and bottom' : 'left and right';
    crop_note = loss < 1 ? 'cover crop hides under 1% of the image'
      : `cover crop hides ${round(loss, 1)}% of the image (cut from ${axis}${position ? `, object-position ${position}` : ''})`;
  } else if (fit === 'none') crop_note = loss < 1 ? 'shown at native size, nothing cropped' : `native-size box hides ${round(loss, 1)}% of the image`;
  else crop_note = 'shown whole (nothing cropped)';
  return { device_px_per_source_px: round(r, 3), visible_area_pct: round(visible, 2), crop_loss_pct: round(loss, 2), resolution_note, crop_note };
}
function roleOf(cls, key, slug) {
  if (!cls) return key.startsWith('cover.') && slug.startsWith('work--') ? 'hero' : 'figure';
  if (/yt__poster/.test(cls)) return 'poster';
  if (/lead__img/.test(cls)) return 'carousel-slide';
  if (/card__img|work-row__thumb|m-reel__cover/.test(cls)) return 'cover-card';
  if (/figure__img/.test(cls)) return 'figure';
  return 'other';
}

// ───────────────────────── main ─────────────────────────
const assets = JSON.parse(await fs.readFile(path.join(AP, 'assets.json'), 'utf8'));
const inv = JSON.parse(await fs.readFile(path.join(AP, 'inventory.json'), 'utf8'));
const carousels = JSON.parse(await fs.readFile(path.join(AP, 'carousels.json'), 'utf8'));
const byKey = new Map(assets.map((a) => [a.key, a]));
const sizes = new Map(inv.records.map((r) => [r.size.name, r.size]));
const slugUrl = new Map(inv.records.map((r) => [r.slug, r.url]));

const facts = new Map();
for (const a of assets) {
  const f = await pixelFacts(a.file);
  const proj = a.pages.map((p) => p.match(/^work--(.+)$/)?.[1]).find(Boolean) ?? null;
  facts.set(a.id, { id: a.id, file: a.file, project: proj, ...f, placements: [] });
}

const seen = new Set();
const addPlacement = (a, p) => {
  const k = [a.id, p.page, p.viewport, p.role, round(p.render.w, 1), round(p.render.h, 1), p.fit].join('|');
  if (seen.has(k)) return;
  seen.add(k);
  facts.get(a.id).placements.push(p);
};
for (const rec of inv.records) {
  const dpr = rec.size.dpr;
  for (const im of rec.images) {
    if (!im.src || !(im.width > 0 && im.height > 0)) continue;
    const a = byKey.get(keyOf(im.src));
    if (!a) continue;
    const cls = (im.html.match(/class="([^"]*)"/) || [])[1];
    const role = roleOf(cls, a.key, rec.slug);
    addPlacement(a, {
      page: rec.slug, viewport: rec.size.name, dpr, render: { w: round(im.width, 1), h: round(im.height, 1) },
      fit: im.fit, role, source_used: { w: im.naturalWidth, h: im.naturalHeight },
      ...notes(im.fit, im.width, im.height, im.naturalWidth, im.naturalHeight, dpr, im.position), _pos: im.position,
    });
  }
  for (const po of rec.posters || []) {
    const a = byKey.get(keyOf(po.src));
    if (!a || !(po.width > 0)) continue;
    addPlacement(a, {
      page: rec.slug, viewport: rec.size.name, dpr, render: { w: round(po.width, 1), h: round(po.height, 1) },
      fit: 'contain', role: 'poster', source_used: { w: a.width, h: a.height },
      ...notes('contain', po.width, po.height, a.width, a.height, dpr, null),
    });
  }
}
// carousel slides (hidden in inventory except one): need natural size of the served variant
const dimCache = new Map();
async function dimsOf(url) {
  if (!dimCache.has(url)) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`fetch ${url} ${r.status}`);
    const m = await sharp(Buffer.from(await r.arrayBuffer())).metadata();
    dimCache.set(url, { w: m.width, h: m.height });
  }
  return dimCache.get(url);
}
for (const c of carousels) {
  const a = byKey.get(keyOf(c.src));
  if (!a) continue;
  const d = await dimsOf(c.currentSrc);
  const dpr = sizes.get(c.size).dpr;
  addPlacement(a, {
    page: 'work', viewport: c.size, dpr, render: { w: round(c.w, 1), h: round(c.h, 1) }, fit: c.fit,
    role: 'carousel-slide', source_used: d, ...notes(c.fit, c.w, c.h, d.w, d.h, dpr, c.position),
    _pos: c.position, _slide: c.id,
  });
}

// ───────────────────────── capture selection ─────────────────────────
const CAP_VIEWPORTS = {
  desktop: { width: 1440, height: 1000, deviceScaleFactor: 1 },
  mobile: { width: 390, height: 844, deviceScaleFactor: 3 },
};
const pad2 = (n) => String(n).padStart(2, '0');
const jobs = []; // {asset, viewport, k, placement}
for (const f of facts.values()) {
  for (const vp of Object.keys(CAP_VIEWPORTS)) {
    const cand = f.placements.filter((p) => p.viewport === vp);
    if (!cand.length) continue;
    const primary = cand.find((p) => f.project && p.page === `work--${f.project}`) ?? cand[0];
    const worst = cand.reduce((m, p) => (p.crop_loss_pct > m.crop_loss_pct ? p : m), cand[0]);
    const picks = [primary];
    if (worst !== primary && !(worst.page === primary.page && worst.role === primary.role && worst.render.w === primary.render.w && worst.render.h === primary.render.h)) picks.push(worst);
    picks.forEach((p, i) => jobs.push({ f, vp, k: i + 1, p }));
  }
}

await fs.rm(path.join(HERE, 'inplace'), { recursive: true, force: true });
await fs.mkdir(path.join(HERE, 'inplace'), { recursive: true });
const captureFailures = [];
const browser = await chromium.launch();
for (const [vp, cfg] of Object.entries(CAP_VIEWPORTS)) {
  const ctx = await browser.newContext({ viewport: { width: cfg.width, height: cfg.height }, deviceScaleFactor: cfg.deviceScaleFactor, reducedMotion: 'reduce', colorScheme: 'light' });
  await ctx.addInitScript(() => { try { localStorage.setItem('motion', 'off'); } catch {} });
  const byPage = new Map();
  for (const j of jobs.filter((x) => x.vp === vp)) byPage.set(j.p.page, [...(byPage.get(j.p.page) ?? []), j]);
  for (const [slug, list] of byPage) {
    const page = await ctx.newPage();
    await page.goto(slugUrl.get(slug) ?? LIVE, { waitUntil: 'networkidle' });
    await page.evaluate(() => { document.documentElement.dataset.motion = 'off'; });
    for (const j of list) {
      const { f, p } = j;
      const key = keyOf(assets.find((a) => a.id === f.id).url);
      try {
        if (p._slide) {
          const grp = page.locator('[data-showcase]', { has: page.locator(`[data-lead="${p._slide}"]`) }).first();
          await grp.locator(`[data-lead]:not([hidden]) [data-tick="${p._slide}"]`).click();
          await page.waitForTimeout(150);
        }
        const found = await page.evaluate(({ key, w, h, slide }) => {
          document.querySelectorAll('[data-jev-target]').forEach((e) => e.removeAttribute('data-jev-target'));
          let best = null, bd = 1e9;
          for (const el of document.querySelectorAll('img, video')) {
            const src = el.tagName === 'VIDEO' ? el.getAttribute('poster') : el.getAttribute('src');
            if (!src || src.split('/').pop().split('_')[0] !== key) continue;
            if (slide && !el.closest(`[data-lead="${slide}"]`)) continue;
            const r = el.getBoundingClientRect();
            if (!(r.width > 0)) continue;
            const d = Math.abs(r.width - w) + Math.abs(r.height - h);
            if (d < bd) { bd = d; best = el; }
          }
          if (!best || bd > 6) return { ok: false, bd };
          best.setAttribute('data-jev-target', '1');
          return { ok: true, bd };
        }, { key, w: p.render.w, h: p.render.h, slide: p._slide ?? null });
        if (!found.ok) throw new Error(`no matching element (best diff ${found.bd})`);
        const target = page.locator('[data-jev-target]');
        await target.scrollIntoViewIfNeeded();
        await target.evaluate((e) => (e.tagName === 'IMG' ? e.decode().catch(() => {}) : null));
        await page.waitForTimeout(250);
        const clip = await page.evaluate(({ vw, vh }) => {
          const t = document.querySelector('[data-jev-target]');
          const cont = t.closest('a, figure, [data-lead], .card, .work-row');
          // hide fixed/sticky chrome that does not contain the target
          for (const el of document.querySelectorAll('body *')) {
            const pos = getComputedStyle(el).position;
            if ((pos === 'fixed' || pos === 'sticky') && !el.contains(t)) el.style.visibility = 'hidden';
          }
          const sx = scrollX, sy = scrollY;
          let r = (cont ?? t).getBoundingClientRect();
          let padded = false;
          if (!cont || r.height > vh * 2.5 || r.width > vw + 2) {
            const tr = t.getBoundingClientRect();
            r = { left: tr.left - 24, top: tr.top - 24, width: tr.width + 48, height: tr.height + 48 };
            padded = true;
          }
          const left = Math.max(0, r.left + sx), top = Math.max(0, r.top + sy);
          const right = Math.min(document.documentElement.scrollWidth, r.left + sx + r.width);
          return { x: left, y: top, width: right - left, height: r.height - (top - (r.top + sy)), padded };
        }, { vw: cfg.width, vh: cfg.height });
        const file = `inplace/${pad2(f.id)}--${vp}--${j.k}.png`;
        await page.screenshot({ path: path.join(HERE, file), fullPage: true, clip: { x: clip.x, y: clip.y, width: clip.width, height: clip.height } });
        p.capture = `${pad2(f.id)}--${vp}--${j.k}.png`;
        await page.evaluate(() => document.querySelectorAll('[style*="visibility: hidden"]').forEach((e) => (e.style.visibility = '')));
      } catch (err) {
        captureFailures.push(`${pad2(f.id)} ${vp} ${slug}: ${err.message.split('\n')[0]}`);
        await page.evaluate(() => document.querySelectorAll('[style*="visibility: hidden"]').forEach((e) => (e.style.visibility = ''))).catch(() => {});
      }
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();

// ───────────────────────── output + validation ─────────────────────────
const out = [...facts.values()].sort((a, b) => a.id - b.id).map((f) => ({ ...f, placements: f.placements.map(({ _pos, _slide, ...p }) => p) }));
const EXPO = ['very-dark', 'dark', 'balanced', 'bright', 'blown'], CONT = ['very-low', 'low', 'normal', 'high'], SHARP = ['very-soft', 'soft', 'moderate', 'crisp'];
const VPS = ['desktop', 'wide', 'tablet', 'mobile', 'small-mobile'], ROLES = ['cover-card', 'hero', 'carousel-slide', 'figure', 'poster', 'other'];
const num = (v) => typeof v === 'number' && Number.isFinite(v);
function validate(f) {
  const e = [];
  if (!Number.isInteger(f.id)) e.push('id');
  if (typeof f.file !== 'string') e.push('file');
  if (!(f.project === null || typeof f.project === 'string')) e.push('project');
  if (!(num(f.native?.w) && num(f.native?.h) && num(f.native?.bytes))) e.push('native');
  const px = f.pixels || {};
  for (const k of ['sharpness', 'mean_luma', 'luma_p5', 'luma_p95', 'luma_spread', 'near_black_pct', 'near_white_pct']) if (!num(px[k])) e.push('pixels.' + k);
  for (const k of ['top', 'bottom', 'left', 'right']) if (!num(px.empty_margin_pct?.[k])) e.push('margin.' + k);
  if (!SHARP.includes(px.sharpness_bucket)) e.push('sharp bucket');
  if (!EXPO.includes(px.exposure_bucket)) e.push('exposure bucket');
  if (!CONT.includes(px.contrast_bucket)) e.push('contrast bucket');
  if (!Array.isArray(f.placements)) e.push('placements');
  else f.placements.forEach((p, i) => {
    if (typeof p.page !== 'string') e.push(`p${i}.page`);
    if (!VPS.includes(p.viewport)) e.push(`p${i}.viewport`);
    if (!ROLES.includes(p.role)) e.push(`p${i}.role`);
    for (const k of ['dpr', 'device_px_per_source_px', 'visible_area_pct', 'crop_loss_pct']) if (!num(p[k])) e.push(`p${i}.${k}`);
    if (!(num(p.render?.w) && num(p.render?.h) && num(p.source_used?.w) && num(p.source_used?.h))) e.push(`p${i}.dims`);
    if (typeof p.fit !== 'string' || typeof p.resolution_note !== 'string' || typeof p.crop_note !== 'string') e.push(`p${i}.strings`);
  });
  return e;
}
const errs = out.flatMap((f) => validate(f).map((m) => `asset ${f.id}: ${m}`));
if (out.length !== 61) errs.push(`expected 61 entries, got ${out.length}`);
if (errs.length) { console.error('VALIDATION FAILED\n' + errs.join('\n')); process.exit(1); }
await fs.writeFile(path.join(HERE, 'facts.json'), JSON.stringify(out, null, 2));

const stats = (arr) => { const s = [...arr].sort((a, b) => a - b); return { min: s[0], median: s.length % 2 ? s[(s.length - 1) / 2] : round((s[s.length / 2 - 1] + s[s.length / 2]) / 2), max: s.at(-1) }; };
const unplaced = out.filter((f) => !f.placements.length).map((f) => f.id);
const files = (await fs.readdir(path.join(HERE, 'inplace'))).filter((x) => x.endsWith('.png'));
const captured = new Set(files.map((x) => +x.slice(0, 2)));
const bc = (key) => out.reduce((m, f) => ((m[f.pixels[key]] = (m[f.pixels[key]] || 0) + 1), m), {});
console.log(JSON.stringify({
  validated: out.length, unplaced, placements: out.reduce((n, f) => n + f.placements.length, 0),
  sharpness: stats(out.map((f) => f.pixels.sharpness)), sharpness_buckets: bc('sharpness_bucket'),
  exposure_buckets: bc('exposure_bucket'), contrast_buckets: bc('contrast_bucket'),
  crop_loss_pct_all_placements: stats(out.flatMap((f) => f.placements.map((p) => p.crop_loss_pct))),
  crop_loss_pct_max_per_asset: stats(out.filter((f) => f.placements.length).map((f) => Math.max(...f.placements.map((p) => p.crop_loss_pct)))),
  inplace_images: files.length, placed_assets_captured: captured.size, uncaptured_placed: out.filter((f) => f.placements.length && !captured.has(f.id)).map((f) => f.id),
  captureFailures,
  anchor6: out[5].placements.filter((p) => p.page === 'home' && p.viewport === 'desktop').map((p) => [p.render, p.crop_loss_pct]),
  anchor2: out[1].native,
}, null, 1));
