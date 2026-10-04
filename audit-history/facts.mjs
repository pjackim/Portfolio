/*
 * facts.mjs — code-measured facts for the old-snapshot (60c6578) Jev photo review. Run: node facts.mjs
 * Ported unchanged (thresholds included) from the main repo's audit-photos/jev-review/facts.mjs; the placement
 * and in-place capture halves are dropped because the 2024 site is not rebuilt here (standalone judgments only).
 * Measured on the native original (GIFs: frame 1), not the PNG copy. Writes facts.json (AssetFacts[]).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHARP_VERY_SOFT = 40,
  SHARP_SOFT = 150,
  SHARP_MODERATE = 500;
const NEAR_BLACK = 16,
  NEAR_WHITE = 239,
  UNIFORM_STD = 4;
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const keyOf = (s) => s.split('/').pop().split('_')[0];

// ───────────────────────── pixel facts ─────────────────────────
async function pixelFacts(file) {
  const abs = path.join(ROOT, file);
  const { bytes } = { bytes: (await fs.stat(abs)).size };
  const meta = await sharp(abs).metadata();
  const { data, info } = await sharp(abs)
    .flatten({ background: '#ffffff' })
    .greyscale()
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width,
    H = info.height,
    N = W * H;
  // Laplacian variance
  let s = 0,
    s2 = 0,
    n = 0;
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const l = data[i - 1] + data[i + 1] + data[i - W] + data[i + W] - 4 * data[i];
      s += l;
      s2 += l * l;
      n++;
    }
  const sharpness = n ? s2 / n - (s / n) ** 2 : 0;
  // histogram / luma
  const hist = new Array(256).fill(0);
  const rowS = new Float64Array(H),
    rowS2 = new Float64Array(H),
    colS = new Float64Array(W),
    colS2 = new Float64Array(W);
  let sum = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const v = data[y * W + x];
      hist[v]++;
      sum += v;
      rowS[y] += v;
      rowS2[y] += v * v;
      colS[x] += v;
      colS2[x] += v * v;
    }
  const pct = (p) => {
    let c = 0;
    for (let v = 0; v < 256; v++) {
      c += hist[v];
      if (c >= p * N) return v;
    }
    return 255;
  };
  const mean = sum / N,
    p5 = pct(0.05),
    p95 = pct(0.95);
  let nb = 0,
    nw = 0;
  for (let v = 0; v <= NEAR_BLACK; v++) nb += hist[v];
  for (let v = NEAR_WHITE; v < 256; v++) nw += hist[v];
  const nearBlack = (100 * nb) / N,
    nearWhite = (100 * nw) / N;
  const std = (S, S2, len) => Math.sqrt(Math.max(0, S2 / len - (S / len) ** 2));
  const scan = (get, count, len) => {
    let d = 0;
    for (let k = 0; k < count; k++) {
      if (get(k) < UNIFORM_STD) d++;
      else break;
    }
    return d;
  };
  const rs = (y) => std(rowS[y], rowS2[y], W),
    cs = (x) => std(colS[x], colS2[x], H);
  const empty_margin_pct = {
    top: round((100 * scan((k) => rs(k), H)) / H),
    bottom: round((100 * scan((k) => rs(H - 1 - k), H)) / H),
    left: round((100 * scan((k) => cs(k), W)) / W),
    right: round((100 * scan((k) => cs(W - 1 - k), W)) / W),
  };
  const sharpness_bucket =
    sharpness < SHARP_VERY_SOFT
      ? 'very-soft'
      : sharpness < SHARP_SOFT
        ? 'soft'
        : sharpness < SHARP_MODERATE
          ? 'moderate'
          : 'crisp';
  const spread = p95 - p5;
  const exposure_bucket =
    mean > 215 || nearWhite >= 50
      ? 'blown'
      : mean < 40 || nearBlack >= 60
        ? 'very-dark'
        : mean < 90
          ? 'dark'
          : mean > 170
            ? 'bright'
            : 'balanced';
  const contrast_bucket =
    spread < 50 ? 'very-low' : spread < 100 ? 'low' : spread <= 180 ? 'normal' : 'high';
  return {
    native: { w: meta.width, h: meta.height, bytes },
    pixels: {
      sharpness: round(sharpness),
      sharpness_bucket,
      mean_luma: round(mean),
      luma_p5: p5,
      luma_p95: p95,
      luma_spread: spread,
      near_black_pct: round(nearBlack),
      near_white_pct: round(nearWhite),
      empty_margin_pct,
      exposure_bucket,
      contrast_bucket,
    },
  };
}

const assets = JSON.parse(await fs.readFile(path.join(import.meta.dirname, 'assets.json'), 'utf8'));
const facts = [];
for (const a of assets) {
  const { native, pixels } = await pixelFacts(a.original);
  facts.push({
    id: a.id,
    file: a.file,
    original: a.original,
    project: a.project,
    format: a.format,
    animated: a.animated,
    native: { w: native.w, h: native.h, bytes: native.bytes },
    pixels,
    referenced_by: a.referenced_by,
  });
}
await fs.writeFile(path.join(import.meta.dirname, 'facts.json'), JSON.stringify(facts, null, 1));
const count = (k) => facts.reduce((m, f) => ((m[f.pixels[k]] = (m[f.pixels[k]] || 0) + 1), m), {});
console.log(facts.length, 'facts', {
  sharp: count('sharpness_bucket'),
  exposure: count('exposure_bucket'),
  contrast: count('contrast_bucket'),
});
