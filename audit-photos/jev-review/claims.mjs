// Claim ledger for the first-pass audit (audit-photos/flagged-downloads/README.md + findings.csv).
// Re-run:  node audit-photos/jev-review/claims.mjs      (writes claims.json, prints a summary table)
//
// Sources checked against (all under audit-photos/): jev-review/facts.json (native size + per-viewport
// placements), inventory.json (100 page visits), details.json (per-figure + lightbox captures),
// assets.json (61 deduped assets, sha via reference-assets/), carousels.json, screenshots/.
//
// Conventions
//  - viewport names: desktop=1440x1000@1, wide=1920x1080@1, tablet=768x1024@2, mobile=390x844@3, small-mobile=320x740@2
//  - "at 1440px the homepage" => facts placement page 'home', viewport 'desktop'; Work carousel => page 'work', role
//    'carousel-slide'; project-page figure/poster/hero => page 'work--<slug>'.
//  - crop_loss_pct (facts.json) is the % of source AREA hidden by object-fit. For object-fit:cover the source is scaled
//    to fill the box on one axis, so the hidden fraction of the cropped axis (height for wide crops) equals the hidden
//    area fraction; first-pass "% of height" claims are therefore compared with crop_loss_pct.
//  - tolerance: 'rel5%' => |measured-claimed| <= 5% of claimed; '1px' => <= 1 CSS px; 'exact' => equal;
//    'predicate' => a documented threshold test (see note).
//  - headroom = native width / (rendered CSS width * dpr) for the stated placement(s). <1 means the file has fewer
//    pixels than the device needs (upscaled on that device); >=1 means enough pixels.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..'); // audit-photos/
const repo = path.resolve(root, '..');
const J = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const facts = J('jev-review/facts.json');
const assets = J('assets.json');
const inv = J('inventory.json');
const details = J('details.json');
const carousels = J('carousels.json');
const readme = fs.readFileSync(path.join(root, 'flagged-downloads/README.md'), 'utf8');
const csvText = fs.readFileSync(path.join(root, 'flagged-downloads/findings.csv'), 'utf8');
const norm = (s) => s.replace(/\s+/g, ' ');
const corpus = norm(readme) + ' ' + norm(csvText.replace(/""/g, '"'));

const F = (id) => facts.find((f) => f.id === id);
const P = (id, page, viewport, role) =>
  F(id).placements.find((p) => p.page === page && p.viewport === viewport && (!role || p.role === role));
const need = (p, what) => { if (!p) throw new Error('missing placement ' + what); return p; };
const projectIds = (...slugs) => facts.filter((f) => slugs.includes(f.project)).map((f) => f.id);
const r2 = (x) => Math.round(x * 100) / 100;
const PRIO = {};
for (const i of [6, 2, 22, 3, 54, 58]) PRIO[i] = 'high';
for (const i of [1, 21, 4, 12, 30, 35, 45, 37]) PRIO[i] = 'medium';
for (const i of [17, 18, 19, 20, 23, 34, 44, 55]) PRIO[i] = 'candidate';

const claims = [];
function add(o) { claims.push({ claim_id: 'C' + String(claims.length + 1).padStart(3, '0'), asset_id: null, first_pass_priority: null, ...o }); }
const base = (id, quote, text) => ({ asset_id: id, first_pass_priority: id == null ? null : PRIO[id], text, quote });

function approx(id, text, quote, measured, value, claimed, unit, tol, note = '') {
  const diff = Math.abs(value - claimed);
  const allowed = tol === '1px' ? 1 : tol === 'exact' ? 0 : 0.05 * claimed;
  add({ ...base(id, quote, text), kind: 'numeric', claimed, measured, value: r2(value), unit, tolerance: tol,
    verdict: diff <= allowed + 1e-9 ? 'holds' : 'off', note });
}
function pred(id, text, quote, measured, value, unit, ok, note) {
  add({ ...base(id, quote, text), kind: 'numeric', measured, value: r2(value), unit, tolerance: 'predicate', verdict: ok ? 'holds' : 'off', note });
}
function cannot(id, text, quote, kind, measured, note, extra = {}) {
  add({ ...base(id, quote, text), kind, ...(kind === 'numeric' ? { measured, value: null, unit: null, tolerance: null } : {}), verdict: 'cannot-check', note, ...extra });
}
function sem(id, text, quote, evidence) {
  add({ ...base(id, quote, text), kind: 'semantic', evidence_ids: [...new Set(evidence ?? (id == null ? [] : [id]))] });
}
function proc(text, quote, measure) {
  // measure() => {measured, value, unit, ok, note} | null (=> cannot-check with note string)
  const m = measure();
  if (m.cannot) add({ ...base(null, quote, text), kind: 'process', verdict: 'cannot-check', note: m.cannot });
  else add({ ...base(null, quote, text), kind: 'process', measured: m.measured, value: m.value, unit: m.unit, tolerance: 'exact', verdict: m.ok ? 'holds' : 'off', note: m.note ?? '' });
}
const native = (id, quote, nw = F(id).native.w, nh = F(id).native.h) => {
  approx(id, `Asset ${id} native width is ${nw} px.`, quote, `facts.json[id=${id}].native.w`, F(id).native.w, nw, 'px', 'exact', 'Also stated in README table "Original pixels" and findings.csv width column.');
  approx(id, `Asset ${id} native height is ${nh} px.`, quote, `facts.json[id=${id}].native.h`, F(id).native.h, nh, 'px', 'exact', 'Also stated in README table "Original pixels" and findings.csv height column.');
};
const renderPair = (id, page, vp, role, w, h, quote, label) => {
  const p = need(P(id, page, vp, role), `${id} ${page} ${vp} ${role}`);
  approx(id, `${label} renders ${w} px wide.`, quote, `facts.json[id=${id}] placement ${page}/${vp}/${role} render.w`, p.render.w, w, 'css px', '1px');
  approx(id, `${label} renders ${h} px tall.`, quote, `same placement render.h`, p.render.h, h, 'css px', '1px');
};
const cropClaim = (id, page, vp, role, pct, text, quote, extraNote = '') => {
  const p = need(P(id, page, vp, role), `${id} crop`);
  approx(id, text, quote, `crop_loss_pct of placement ${page}/${vp}/${role} (=100 - visible_area_pct; cover crop => equals hidden height fraction for a same-width crop)`, p.crop_loss_pct, pct, '%', 'rel5%', extraNote + ` fit=${p.fit}; ${p.crop_note}`);
};
// headroom: native.w / (render.w*dpr), taking min across the named placements
const headroom = (id, sel) => {
  const rows = F(id).placements.filter(sel).map((p) => ({ p, h: F(id).native.w / (p.render.w * p.dpr) }));
  if (!rows.length) throw new Error('no headroom rows ' + id);
  rows.sort((a, b) => a.h - b.h);
  return { min: rows[0].h, rows, worst: rows[0].p };
};

// ---------- Header / scope ----------
const csvRows = csvText.trim().split('\n').slice(1).map((l) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')));
const groups = csvRows.reduce((a, r) => ((a[r[1]] = (a[r[1]] || 0) + 1), a), {});
proc('22 files were flagged in total.', 'Downloaded **22 flagged files', () => ({ measured: 'data rows in findings.csv', value: csvRows.length, unit: 'rows', ok: csvRows.length === 22 }));
proc('14 of the flagged files are confirmed presentation/source issues.', '14 confirmed presentation/source issues', () => ({ measured: 'findings.csv rows with group=confirmed', value: groups.confirmed, unit: 'rows', ok: groups.confirmed === 14 }));
proc('8 of the flagged files are lower-priority review candidates.', '8 lower-priority review candidates', () => ({ measured: 'findings.csv rows with group=review-candidate', value: groups['review-candidate'], unit: 'rows', ok: groups['review-candidate'] === 8 }));
{
  let match = 0, total = 0, urlMatch = 0; const bad = [];
  for (const r of csvRows) {
    const id = Number(r[0]); const a = assets.find((x) => x.id === id); total++;
    const sha = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, a.file))).digest('hex');
    if (sha === r[13]) match++; else bad.push(id);
    if (a.url === r[12]) urlMatch++;
  }
  proc('The 22 flagged files are unmodified copies of the deployed WebP assets (sha256 in CSV equals sha256 of the reference download).', 'Files are unmodified copies of the deployed WebP assets', () => ({
    measured: 'CSV sha256 column vs sha256 of audit-photos/<assets.json file> for each flagged id', value: match, unit: `of ${total} matching`, ok: match === total,
    note: `sha mismatches: ${bad.join(',') || 'none'}; downloadUrl equals assets.json url for ${urlMatch}/${total}. Compares CSV hash to reference-assets, not to a fresh fetch of the live site.` }));
}

// ---------- Coverage ----------
const wl = inv.urls.length;
proc('20 linked HTML pages were covered.', 'All 20 linked HTML pages', () => ({ measured: 'inventory.json urls.length', value: wl, unit: 'pages', ok: wl === 20 }));
proc('The pages are home, Work, About, Experience, Capabilities and 15 published projects.', 'home, Work, About, Experience, Capabilities, and 15 published projects', () => {
  const proj = new Set(inv.records.filter((r) => r.slug.startsWith('work--')).map((r) => r.slug));
  const top = ['home', 'work', 'about', 'experience', 'capabilities'].every((s) => inv.records.some((r) => r.slug === s));
  return { measured: 'distinct inventory slugs starting work-- (+ presence of the 5 top-level slugs)', value: proj.size, unit: 'project pages', ok: proj.size === 15 && top };
});
const passes = [['desktop', 1440, 1000, 1, 'Five full-site passes include 1440x1000 at 1x.', '1440x1000 at 1x'], ['wide', 1920, 1080, 1, '', '1920x1080 at 1x'], ['tablet', 768, 1024, 2, '', '768x1024 at 2x'], ['mobile', 390, 844, 3, '', '390x844 at 3x'], ['small-mobile', 320, 740, 2, '', '320x740 at 2x']];
for (const [name, w, h, d, , q] of passes) {
  proc(`A full-site pass was run at ${w}x${h} at ${d}x density covering all 20 pages.`, q, () => {
    const rs = inv.records.filter((r) => r.size.name === name);
    const ok = rs.length === 20 && rs.every((r) => r.size.width === w && r.size.height === h && r.size.dpr === d);
    return { measured: `inventory.json records with size.name=${name} and matching width/height/dpr`, value: rs.length, unit: 'page visits', ok };
  });
}
proc('Five full-site passes were run.', 'Five full-site passes', () => {
  const n = new Set(inv.records.map((r) => r.size.name)).size; return { measured: 'distinct size names in inventory.json', value: n, unit: 'passes', ok: n === 5 };
});
proc('The image-focused second pass covers all 15 project pages at all five sizes.', 'all 15 project pages at all five sizes', () => {
  const seen = new Set(inv.records.filter((r) => r.slug.startsWith('work--')).map((r) => r.slug + '|' + r.size.name));
  const dSlugs = new Set(details.filter((d) => d.slug && d.slug.startsWith?.('') && !d.lightbox).map((d) => d.slug + '|' + d.size));
  const projSlugs = [...new Set(inv.records.filter((r) => r.slug.startsWith('work--')).map((r) => r.slug.replace('work--', '')))];
  const cov = projSlugs.flatMap((s) => passes.map((p) => s + '|' + p[0])).filter((k) => dSlugs.has(k)).length;
  return { measured: 'project-slug x size combinations that have >=1 figure capture in details.json (only slugs with figures appear there; slugs without in-page figures cannot appear)', value: cov, unit: 'of 75 combos', ok: cov === 75,
    note: `${seen.size}/75 combos visited in inventory.json; details.json has captures for ${cov}/75 (projects with no captured in-page figure show as missing there but are covered by inventory visits).` };
});
{
  const bySize = {}; for (const c of carousels) bySize[c.size] = (bySize[c.size] || 0) + 1;
  const min = Math.min(...passes.map((p) => bySize[p[0]] || 0));
  proc('All 15 Work carousel slides were exercised at each of the five sizes.', 'all 15 Work carousel slides', () => ({ measured: 'carousels.json entries per size (min over 5 sizes)', value: min, unit: 'slides per size', ok: min === 15 && carousels.length === 75, note: JSON.stringify(bySize) }));
}
proc('All seven capability filters were exercised at all five sizes.', 'all seven capability filters exercised at each size', () => ({ cannot: 'No file records the filter clicks; carousels.mjs only loops over [data-capability] buttons and logs a fixed string. Filter count is not stored in inventory/details/carousels.' }));
proc('61 distinct deployed image/poster assets were inspected.', '61 distinct deployed image/poster assets', () => ({ measured: 'assets.json length (and distinct urls)', value: assets.length, unit: 'assets', ok: assets.length === 61 && new Set(assets.map((a) => a.url)).size === 61 }));
proc('Responsive renditions and repeated placements were grouped into those assets.', 'responsive renditions and repeated placements grouped', () => {
  const multi = assets.filter((a) => a.pages.length > 1).length;
  return { cannot: `Grouping key is not documented in a file; assets.json shows ${multi} assets with repeated page placements but the grouping rule cannot be verified from data.` };
});
proc('All 26 expandable figures were opened at desktop and mobile sizes.', 'All 26 expandable figures opened at desktop and mobile sizes', () => {
  const per = ['desktop', 'mobile'].map((s) => new Set(details.filter((d) => d.lightbox && d.size === s && d.id != null).map((d) => d.id)).size);
  const files = ['desktop', 'mobile'].every((s) => details.filter((d) => d.lightbox && d.size === s).every((d) => fs.existsSync(path.join(root, d.file))));
  return { measured: 'distinct asset ids with lightbox:true entries in details.json, min of desktop/mobile', value: Math.min(...per), unit: 'figures', ok: per[0] === 26 && per[1] === 26 && files, note: `desktop=${per[0]}, mobile=${per[1]}; capture files exist=${files}` };
});
proc('The contact portrait and mobile contact dialog were checked.', 'Contact portrait and mobile contact dialog checked', () => ({ cannot: 'No contact-dialog capture or record exists in inventory/details/screenshots; only page-level screenshots are stored.' }));
proc('All 100 initial page visits returned HTTP 200.', 'All 100 initial page visits returned HTTP 200', () => {
  const n = inv.records.filter((r) => r.status === 200).length; return { measured: 'inventory.json records with status 200', value: n, unit: 'of 100', ok: n === 100 && inv.records.length === 100 };
});
proc('There were 100 initial page visits.', '100 initial page visits', () => ({ measured: 'inventory.json records.length', value: inv.records.length, unit: 'visits', ok: inv.records.length === 100 }));
proc('No broken visible images were found.', 'no broken visible images found', () => {
  const broken = inv.records.flatMap((r) => r.images.filter((i) => i.visible && (!i.complete || !i.naturalWidth)));
  const vis = inv.records.reduce((a, r) => a + r.images.filter((i) => i.visible).length, 0);
  return { measured: 'inventory.json visible img entries with complete=false or naturalWidth=0', value: broken.length, unit: 'broken images', ok: broken.length === 0, note: `${vis} visible img entries examined (img elements only; video posters not included).` };
});
proc('Browser was Chromium with emulated viewport/density, light theme and reduced motion.', 'Chromium with emulated viewport/density, light theme and reduced motion', () => ({ cannot: 'Only viewport sizes and dpr are recorded (and verified); browser engine, theme and reduced-motion flags are not stored in data.' }));
proc('Video poster appearance was reviewed, not entire video playback.', 'Video poster appearance was reviewed, not entire video playback', () => ({ cannot: 'Method statement about scope of review; not verifiable from files.' }));
proc('External social destinations and the resume document were outside the review.', 'External social destinations and resume document are outside this portfolio-photo review', () => ({ cannot: 'Scope statement; not verifiable from files.' }));

// ---------- Highest priority list ----------
cropClaim(6, 'home', 'desktop', 'cover-card', 73, 'The AES homepage cover crop discards about 73% of the image height.', 'AES homepage crop discards about 73% of the image height');
approx(2, 'Mordhau cover source is 514 px wide.', 'Mordhau has only 514px-wide sources', 'facts.json[2].native.w', F(2).native.w, 514, 'px', 'exact');
approx(22, 'Mordhau gameplay-toggles source is 514 px wide.', 'Mordhau has only 514px-wide sources', 'facts.json[22].native.w', F(22).native.w, 514, 'px', 'exact');
sem(2, 'Mordhau cover has incomplete framing.', 'incomplete framing', [2, 22]);
sem(22, 'Mordhau gameplay-toggles has background text interfering with the menu.', 'background text interference', [22]);
cropClaim(3, 'work', 'desktop', 'carousel-slide', 41, "Trip Planner's portrait cover loses about 41% of its height in the landscape Work carousel (1440px).", "Trip Planner's portrait cover loses about 41% of its height in the landscape carousel", ' Carousel viewport = desktop 1440.');
sem(54, "Ant Game's video poster is extremely dark.", "Ant Game's video poster is extremely dark", [54]);
pred(54, "Ant Game's poster is in the very-dark/dark exposure range.", "Ant Game's video poster is extremely dark", 'facts.json[54].pixels.exposure_bucket / mean_luma', F(54).pixels.mean_luma, 'mean luma 0-255', ['very-dark', 'dark'].includes(F(54).pixels.exposure_bucket), `exposure_bucket=${F(54).pixels.exposure_bucket}, near_black_pct=${F(54).pixels.near_black_pct}; criterion: bucket in {very-dark, dark}.`);
sem(54, "Ant Game's video poster has debug/desktop overlays.", 'has debug/desktop overlays', [54]);
sem(58, "Paradox's old banner has excessive baked-in margins.", "Paradox's old banner has excessive baked-in margins", [58]);
sem(58, "Paradox's old banner has very low contrast.", 'very low contrast', [58]);

// ---------- Per-image (README sections + table + CSV) ----------
// 6 aes-256 cover
native(6, 'a 1280x720 desktop capture');
renderPair(6, 'home', 'desktop', 'cover-card', 1150, 177, '1150x177 strip', 'The AES cover on the homepage at 1440px');
cropClaim(6, 'home', 'desktop', 'cover-card', 73, 'At 1440px the AES homepage strip discards about 73% of the image height.', 'about 73% of its height is discarded');
sem(6, 'The AES cover becomes an anonymous dark strip on the homepage.', 'It becomes an anonymous dark strip', [6]);
sem(6, 'The AES case-study poster has very small code.', 'The case-study poster also has very small code', [6]);
// 2 mordhau cover
native(2, 'The 514x321 source');
sem(2, 'The Mordhau 514x321 source already cuts through the top slider/label.', 'already cuts through the top slider/label', [2]);
sem(2, 'The Mordhau cover leaves most of the frame empty.', 'leaves most of the frame empty', [2]);
renderPair(2, 'work', 'desktop', 'carousel-slide', 644, 402, 'to about 644x402 at 1440px', 'The Mordhau cover in the Work carousel at 1440px');
{
  const d = F(2).native.w / need(P(2, 'work', 'desktop', 'carousel-slide')).render.w; const m = headroom(2, (p) => p.page === 'work' && p.viewport === 'mobile' && p.role === 'carousel-slide');
  pred(2, 'The Work carousel enlarges the Mordhau cover beyond its native pixels at 1440px.', 'The Work carousel enlarges it', 'native.w / carousel render.w at desktop (<1 means enlarged)', d, 'ratio', d < 1, `${F(2).native.w}px native vs ${need(P(2, 'work', 'desktop', 'carousel-slide')).render.w}px rendered.`);
  pred(2, 'Phone/retina rendering of the Mordhau cover has less pixel headroom than the 1440px desktop rendering.', 'Phone/retina rendering has even less pixel headroom', 'native.w/(render.w*dpr) at mobile carousel-slide (390px @3x) vs desktop carousel-slide (1440 @1x)', m.min, 'headroom ratio', m.min < d, `mobile ${r2(m.min)} < desktop ${r2(d)}.`);
}
// 22 mordhau gameplay toggles
native(22, 'Only 514x244');
sem(22, 'Background patch-note text shows through the Mordhau gameplay menu and competes with its labels.', 'Background patch-note text shows through the gameplay menu and competes with its labels', [22]);
sem(22, 'The Mordhau gameplay-toggles capture ends tightly at the controls.', 'the capture also ends tightly at the controls', [22]);
sem(22, 'The Mordhau gameplay-toggles contrast problem is in the original file, not caused by responsive CSS.', 'This is visible in the original, not caused by responsive CSS', [22]);
// 3 trip-planner cover
native(3, 'a 901x959 portrait screenshot');
pred(3, 'The Trip Planner cover source is portrait (taller than wide).', 'portrait screenshot', 'facts.json[3].native w/h', F(3).native.w / F(3).native.h, 'w/h ratio', F(3).native.h > F(3).native.w, 'ratio 0.94: portrait by pixels but nearly square.');
{
  const p = need(P(3, 'work', 'desktop', 'carousel-slide'));
  approx(3, 'The Work carousel slot at 1440px is about 16:10 (1.6 aspect).', 'in a 16:10 slot', 'carousel-slide render.w/render.h at work/desktop', p.render.w / p.render.h, 1.6, 'aspect w/h', 'rel5%', `render ${p.render.w}x${p.render.h}.`);
  pred(3, 'The Work carousel uses cover fitting for the Trip Planner cover.', 'uses cover fitting on a 901x959', 'placement fit at work/desktop/carousel-slide', 0, 'n/a', p.fit === 'cover', `fit=${p.fit}.`);
}
cropClaim(3, 'work', 'desktop', 'carousel-slide', 41, 'The Work carousel cover crop cuts away about 41% of the Trip Planner cover height.', 'cutting away about 41% of its height');
sem(3, 'The mobile homepage cuts off the Trip Planner app header/footer.', 'The mobile homepage cuts off the app header/footer', [3]);
renderPair(3, 'home', 'desktop', 'cover-card', 131, 140, 'about 131x140', 'The Trip Planner cover on the desktop homepage');
sem(3, 'The Trip Planner cover at about 131x140 on the desktop homepage is too small to read.', 'too small to read', [3]);
// 54 ant-game poster
native(54, '1280×720');
sem(54, 'The ant is almost a silhouette against the ground.', 'The ant is almost a silhouette against the ground', [54]);
sem(54, 'The original includes development/performance text.', 'development/performance text', [54]);
sem(54, 'The original includes an Activate Windows watermark.', 'Activate Windows watermark', [54]);
sem(54, 'The scene is hard to identify on desktop and mobile.', 'The scene is hard to identify on desktop and mobile', [54]);
// 58 paradox banner
native(58, 'a 1917x1078 file');
{
  const m = F(58).pixels.empty_margin_pct; const s = m.top + m.bottom;
  pred(58, 'Dark empty areas (top and bottom margins) consume most of the Paradox banner image.', 'Dark empty areas consume most of the image', 'empty_margin_pct.top + .bottom (% of height that is near-uniform scanning inward)', s, '% of height', s > 50, `top ${m.top}% + bottom ${m.bottom}%; criterion: more than 50%.`);
  pred(58, 'The Paradox banner file is dark (very-dark/dark exposure bucket).', 'Dark artwork', 'facts.json[58].pixels.exposure_bucket / mean_luma', F(58).pixels.mean_luma, 'mean luma 0-255', ['very-dark', 'dark'].includes(F(58).pixels.exposure_bucket), `exposure_bucket=${F(58).pixels.exposure_bucket}.`);
}
sem(58, 'The visible Paradox banner occupies only a narrow middle band of the file.', 'The visible banner occupies only a narrow middle band', [58]);
sem(58, 'The logo and channel name in the Paradox banner have very low contrast.', 'the logo and channel name have very low contrast', [58]);
sem(58, 'On phones the actual Paradox banner becomes a tiny dark strip.', 'On phones the actual banner becomes a tiny dark strip', [58]);
// 1 credential-correlation cover
native(1, '1280×720');
{
  const p = need(P(1, 'home', 'desktop', 'cover-card'));
  pred(1, 'The homepage desktop cover for Credential Correlation is cropped vertically (cover crop cut from top and bottom).', 'The homepage desktop cover crops the visualizer vertically', 'crop_loss_pct at home/desktop/cover-card and crop_note axis', p.crop_loss_pct, '%', p.crop_loss_pct > 0 && /top and bottom/.test(p.crop_note), p.crop_note);
}
sem(1, 'The homepage cover crop trims interface/annotation content of the visualizer.', 'trimming interface/annotation content', [1]);
sem(1, 'The Credential Correlation cover source is a full desktop/video frame.', 'The source is a full desktop/video frame', [1]);
sem(1, 'The cover has small colored labels over a translucent, busy background.', 'small colored labels over a translucent, busy background', [1]);
sem(1, 'The cover reads poorly as a thumbnail.', 'it reads poorly as a thumbnail', [1]);
// 21
native(21, '1578×1015');
sem(21, 'The visualizer image retains small red, green and blue labels over a translucent desktop background.', 'small red, green and blue labels over a translucent desktop background', [21]);
sem(21, 'Even the expanded (lightbox) visualizer image has weak contrast.', 'Even the expanded image has weak contrast', [21]);
sem(21, 'At phone width the visualizer annotations are difficult to read.', 'reducing it to phone width makes the annotations difficult to read', [21]);
// 4 the-forest cover
native(4, 'this 1709x1021 image');
renderPair(4, 'home', 'desktop', 'cover-card', 563, 177, 'around 563x177', 'The Forest cover on the desktop homepage');
{
  const p = need(P(4, 'home', 'desktop', 'cover-card'));
  approx(4, 'The desktop homepage retains about 53% of the Forest cover height.', 'retaining only about 53% of its height', 'visible_area_pct at home/desktop/cover-card', p.visible_area_pct, 53, '%', 'rel5%', `crop_loss ${p.crop_loss_pct}%.`);
}
sem(4, 'Parts of the Forest menu and HUD are cut off in the homepage crop.', 'Parts of the menu and HUD are cut off', [4]);
sem(4, 'The full Forest project image is much better framed than the homepage crop.', 'The full project image is much better framed', [4]);
// 12 arch-linux
native(12, '1919×1077');
{
  const a = F(12).native.w / F(12).native.h;
  approx(12, 'The Arch Linux cover source is approximately 16:9.', 'The source is approximately 16:9', 'native.w/native.h', a, 16 / 9, 'aspect w/h', 'rel5%');
  const c = need(P(12, 'work', 'desktop', 'carousel-slide')); const h = need(P(12, 'work--arch-linux', 'desktop', 'hero'));
  approx(12, 'The Work carousel slot for the Arch Linux cover is 16:10.', 'the Work carousel and project hero use 16:10 cover fitting', 'work/desktop/carousel-slide render.w/render.h', c.render.w / c.render.h, 1.6, 'aspect w/h', 'rel5%', `fit=${c.fit}`);
  approx(12, 'The Arch Linux project hero slot is 16:10.', 'the Work carousel and project hero use 16:10 cover fitting', 'work--arch-linux/desktop/hero render.w/render.h', h.render.w / h.render.h, 1.6, 'aspect w/h', 'rel5%', `fit=${h.fit}`);
  const hr = headroom(12, () => true);
  pred(12, 'The Arch Linux cover is not a low-resolution original (native width covers device pixels at every placement).', 'not a low-resolution original', 'min over all placements of native.w/(render.w*dpr)', hr.min, 'headroom ratio', hr.min >= 1, `worst ${hr.worst.page}/${hr.worst.viewport}; criterion: >=1 everywhere.`);
}
sem(12, 'The left launcher/avatar and text of the Arch Linux cover get cut at the left edge.', 'The left launcher/avatar and text get cut at the left edge', [12]);
sem(12, 'The Arch Linux problem is a presentation crop, not a low-resolution original.', 'This is a presentation crop, not a low-resolution original', [12]);
// 30 the-forest menu panels
native(30, '905px source');
{
  const hr = headroom(30, (p) => p.dpr >= 2);
  pred(30, 'The 905 px Forest menu-panels source has limited retina headroom (fewer pixels than a 2x/3x device needs).', 'The 905px source also has limited retina headroom', 'min over dpr>=2 placements of native.w/(render.w*dpr)', hr.min, 'headroom ratio', hr.min < 1, `worst ${hr.worst.page}/${hr.worst.viewport}: ${hr.worst.render.w}px x dpr ${hr.worst.dpr} = ${r2(hr.worst.render.w * hr.worst.dpr)} device px vs 905 native; criterion: <1.`);
}
sem(30, 'The Forest menu panels are composited over detailed, dark foliage.', 'composited over detailed, dark foliage', [30]);
sem(30, 'Small text in the Forest menu panels has weak separation from the scene, particularly at 390px and 320px.', 'Small text has weak separation from the scene, particularly at 390px and 320px', [30]);
// 35 aes source code
native(35, '762×920');
sem(35, 'The AES code capture begins partway through a data table.', 'begins partway through a data table', [35]);
sem(35, 'The AES code capture ends at an incomplete function near the lower/right edge.', 'ends at an incomplete function near the lower/right edge', [35]);
sem(35, 'Most of the AES code frame is hexadecimal data.', 'Most of the frame is hexadecimal data', [35]);
sem(35, 'Meaningful code in the AES capture becomes tiny on phones.', 'meaningful code becomes tiny on phones', [35]);
sem(35, 'The source framing problem is present in the native (unscaled) file.', 'Native inspection confirms the source framing', [35]);
// 45 ant-game sculpt
native(45, '1274×772');
sem(45, 'The three-quarter sculpt overview cuts off a lower leg at the bottom edge.', 'cuts off a lower leg at the bottom edge', [45]);
sem(45, 'The sculpt overview retains editor gizmo/cursor residue at the right.', 'retains editor gizmo/cursor residue at the right', [45]);
sem(45, 'The original file has the same framing as seen on the page.', 'The original file has the same framing', [45]);
// 37 hero-trivia
native(37, 'The underlying 1168x920 file');
sem(37, 'On 390px and 320px layouts the Play button covers the right end of the clue at the bottom of the puzzle poster.', 'the Play button covers the right end of the clue at the bottom of the puzzle poster', [37]);
{
  const hr = headroom(37, (p) => p.viewport === 'mobile' || p.viewport === 'small-mobile');
  pred(37, 'The 1168x920 Hero Trivia poster is adequately sized (native width covers device pixels) on the 390px and 320px layouts.', 'is adequately sized', 'min over mobile and small-mobile placements of native.w/(render.w*dpr)', hr.min, 'headroom ratio', hr.min >= 1, `worst ${hr.worst.viewport}; criterion: >=1.`);
}
// 17
native(17, '714x219 search-results capture');
approx(17, 'The password-checker-search screenshot renders about 702 px wide on the 2x tablet.', 'rendered about 702px wide on the 2x tablet', 'work--credential-correlation tablet figure render.w', need(P(17, 'work--credential-correlation', 'tablet', 'figure')).render.w, 702, 'css px', '1px');
sem(17, 'Small result URLs in the password-checker-search screenshot are soft at reduced phone sizes.', 'Small result URLs are soft at reduced phone sizes', [17]);
sem(17, 'The password-checker-search screenshot is readable on normal desktop and is not a broken image.', 'It is readable on normal desktop and is not a broken image', [17]);
// 18
native(18, '756x206 text image');
approx(18, 'The dummy-credentials image renders about 631 px wide on the 2x tablet.', 'rendered about 631px wide on the 2x tablet', 'work--credential-correlation tablet figure render.w', need(P(18, 'work--credential-correlation', 'tablet', 'figure')).render.w, 631, 'css px', '1px');
{
  const hr = headroom(18, (p) => p.viewport === 'tablet');
  pred(18, 'The dummy-credentials asset has little high-density headroom on the 2x tablet.', 'the asset has little high-density headroom', 'native.w/(render.w*dpr) at tablet', hr.min, 'headroom ratio', hr.min < 1, `${F(18).native.w} native vs ${r2(hr.worst.render.w * hr.worst.dpr)} device px; criterion: <1.`);
}
sem(18, 'The short line of text in the dummy-credentials image is still readable.', 'The short line is still readable', [18]);
// 19
native(19, '625x212 screenshot');
sem(19, 'Some secondary labels in the checker-rated-strong screenshot are faint and small.', 'some secondary labels are faint and small', [19]);
sem(19, 'The checker-rated-strong screenshot is readable at normal desktop scale.', 'It is readable at normal desktop scale', [19]);
{
  const hr = headroom(19, (p) => p.viewport === 'tablet');
  pred(19, 'The 625 px checker-rated-strong screenshot cannot provide 2x detail at its tablet display width.', 'cannot provide 2x detail at its tablet display width', 'native.w/(render.w*dpr) at tablet', hr.min, 'headroom ratio', hr.min < 1, `render ${hr.worst.render.w}px x dpr 2 = ${hr.worst.render.w * 2} device px vs 625 native; criterion: <1.`);
}
// 20
native(20, '768x383 screenshot');
sem(20, 'The main result in the checker-crack-time screenshot remains legible.', 'The main result remains legible', [20]);
sem(20, 'Small explanatory copy in the checker-crack-time screenshot is hard to read on phones.', 'small explanatory copy is hard to read on phones', [20]);
{
  const hr = headroom(20, (p) => p.viewport === 'tablet');
  pred(20, 'The 768 px checker-crack-time source is undersized for 2x tablet rendering.', 'the source is undersized for 2x tablet rendering', 'native.w/(render.w*dpr) at tablet', hr.min, 'headroom ratio', hr.min < 1, `render ${hr.worst.render.w}px x 2 = ${r2(hr.worst.render.w * 2)} device px vs 768; criterion: <1.`);
}
// 23
native(23, '901×959');
approx(23, 'The trip-manager modal image is displayed at roughly 308 px wide on mobile.', 'At roughly 308px displayed width on mobile', 'work--trip-planner mobile figure render.w', need(P(23, 'work--trip-planner', 'mobile', 'figure')).render.w, 308, 'css px', '1px');
sem(23, 'The trip-manager modal contains a long list of very small text.', 'contains a long list of very small text', [23]);
sem(23, 'The trip-manager text is difficult to read at about 308 px on mobile.', 'it is difficult to read', [23]);
sem(23, 'The full-size trip-manager source is better than the mobile rendering.', 'The full-size source is better', [23]);
// 34
native(34, '1280×720');
sem(34, 'The Hardpoint poster contains a prominent PHYSX CPU overlay in the upper left.', 'a prominent PHYSX CPU overlay in the upper left', [34]);
sem(34, 'The Hardpoint poster has a large foreground weapon.', 'a large foreground weapon', [34]);
{
  const hr = headroom(34, () => true);
  pred(34, 'The Hardpoint poster resolution is acceptable (native width is at least 90% of the device pixels needed at every placement).', 'Its resolution is acceptable', 'min over all placements of native.w/(render.w*dpr)', hr.min, 'headroom ratio', hr.min >= 0.9, `worst ${hr.worst.page}/${hr.worst.viewport}; criterion >=0.9 (arbitrary "acceptable" threshold; the browser served a 768px variant at tablet so real headroom is lower there).`);
}
// 44
native(44, '487x1009 portrait launcher capture');
approx(44, 'The launcher-panel capture is about 340 px wide on desktop.', 'It is only about 340px wide on desktop', 'work--arch-linux desktop figure render.w', need(P(44, 'work--arch-linux', 'desktop', 'figure')).render.w, 340, 'css px', '1px');
sem(44, 'The launcher-panel capture has small quote/menu text.', 'has small quote/menu text', [44]);
{
  const hr = headroom(44, (p) => p.dpr >= 2);
  pred(44, 'On 2x/3x displays the 487 px launcher-panel exposes limited source resolution.', '2x/3x displays expose its limited source resolution', 'min over dpr>=2 placements of native.w/(render.w*dpr)', hr.min, 'headroom ratio', hr.min < 1, `worst ${hr.worst.viewport}: ${r2(hr.worst.render.w * hr.worst.dpr)} device px vs 487; criterion <1.`);
}
// 55
native(55, 'The source is 1920x1080');
{
  const hr = headroom(55, () => true);
  pred(55, 'The Go Green brochure source is not intrinsically low resolution (native width covers device pixels at every placement).', 'is not intrinsically low resolution', 'min over all placements of native.w/(render.w*dpr)', hr.min, 'headroom ratio', hr.min >= 1, `worst ${hr.worst.page}/${hr.worst.viewport}; criterion >=1.`);
}
sem(55, 'The Go Green brochure paragraph is packed into a small corner.', 'paragraph is packed into a small corner', [55]);
sem(55, 'The Go Green brochure paragraph is illegible at 343 px and 276 px displayed widths.', 'it becomes illegible at 343px and 276px displayed widths', [55]);
approx(55, 'The Go Green brochure is displayed 343 px wide on mobile.', 'at 343px and 276px displayed widths', 'work--go-green mobile figure render.w', need(P(55, 'work--go-green', 'mobile', 'figure')).render.w, 343, 'css px', '1px');
approx(55, 'The Go Green brochure is displayed 276 px wide on small-mobile.', 'at 343px and 276px displayed widths', 'work--go-green small-mobile figure render.w', need(P(55, 'work--go-green', 'small-mobile', 'figure')).render.w, 276, 'css px', '1px');

// ---------- Other observations ----------
proc('At 320px every tested page reports horizontal overflow.', 'At 320px, every tested page reports horizontal overflow', () => {
  const rs = inv.records.filter((r) => r.size.name === 'small-mobile'); const n = rs.filter((r) => r.overflow === true).length;
  return { measured: 'inventory.json small-mobile records with overflow=true (documentElement.scrollWidth > innerWidth)', value: n, unit: `of ${rs.length} pages`, ok: n === rs.length && rs.length === 20 };
});
{
  let value = null, note = '';
  try {
    const sharp = createRequire(path.join(repo, 'package.json'))('sharp');
    const m = await sharp(path.join(root, 'screenshots/small-mobile--work.jpg')).metadata();
    value = m.width; note = `width of screenshots/small-mobile--work.jpg (full-page screenshot at css scale; equals document scrollWidth). Cross-check: desktop--work.jpg width = ${(await sharp(path.join(root, 'screenshots/desktop--work.jpg')).metadata()).width} vs 1440 viewport.`;
  } catch (e) { note = 'sharp unavailable: ' + e.message; }
  if (value == null) proc('The Work page measured 337 px document width at the 320 px viewport.', 'Work measured 337px document width for a 320px viewport', () => ({ cannot: note }));
  else proc('The Work page measured 337 px document width at the 320 px viewport.', 'Work measured 337px document width for a 320px viewport', () => ({ measured: 'small-mobile Work page screenshot pixel width', value, unit: 'px', ok: Math.abs(value - 337) <= 1, note }));
}
sem(null, 'Hero Trivia background blur is deliberate/not bad resolution (not automatically classified as a resolution defect).', 'Hero Trivia background blur', projectIds('hero-trivia'));
sem(null, 'The Arch Linux pixel-art wallpaper is not a resolution defect.', 'the Arch Linux pixel-art wallpaper', projectIds('arch-linux'));
sem(null, 'Deliberate ant detail close-ups are not a resolution defect.', 'deliberate ant detail close-ups', projectIds('ant-game'));
sem(null, 'Smoke/cloud effects were not automatically classified as bad resolution.', 'smoke/cloud effects', projectIds('ant-game', 'hero-trivia', 'over-the-rainbow', 'lost-city', 'nodes'));
sem(null, 'The portrait, logo exports, most renders and scenic images had no material image-quality defect at these sizes.', 'The portrait, logo exports, most renders and scenic images had no material image-quality defect', facts.filter((f) => !PRIO[f.id]).map((f) => f.id));
sem(null, 'Dense diagrams/screenshots benefit from their full-size links.', 'Dense diagrams/screenshots still benefit from their full-size links', [7, 21, 23, 35, 17, 18, 19, 20]);
proc('Contact sheets are overview aids that may resize thumbnails.', 'Contact sheets are overview aids and may resize thumbnails', () => ({ cannot: 'Statement about method; not verifiable.' }));
proc('The audit folder retains all 100 page screenshots.', 'retains all 100 page screenshots', () => {
  const n = fs.readdirSync(path.join(root, 'screenshots')).filter((f) => /\.(jpg|png)$/.test(f)).length; return { measured: 'image files in audit-photos/screenshots/', value: n, unit: 'files', ok: n === 100 };
});
proc('The audit folder retains 61 reference downloads.', '61 reference downloads', () => {
  const n = fs.readdirSync(path.join(root, 'reference-assets')).length; return { measured: 'files in audit-photos/reference-assets/', value: n, unit: 'files', ok: n === 61 };
});
proc('The audit folder retains all lightbox captures (26 figures at desktop and mobile = 52 files).', 'all lightbox captures', () => {
  const n = fs.readdirSync(path.join(root, 'details')).filter((f) => f.includes('--lightbox--')).length; return { measured: 'files in audit-photos/details/ containing --lightbox--', value: n, unit: 'files', ok: n === 52 };
});
proc('The audit folder retains the full asset inventory and repeatable browser scripts.', 'full asset inventory', () => {
  const need = ['assets.json', 'inventory.json', 'crawl.mjs', 'assets.mjs', 'inspect.mjs', 'carousels.mjs'];
  const ok = need.every((f) => fs.existsSync(path.join(root, f))); return { measured: 'existence of assets.json, inventory.json and the .mjs scripts', value: need.filter((f) => fs.existsSync(path.join(root, f))).length, unit: `of ${need.length} files`, ok };
});
proc('Website source files were not edited.', 'Website source files were not edited', () => {
  let out = ''; try { out = execSync('git status --porcelain -- src public', { cwd: repo }).toString().trim(); } catch (e) { return { cannot: 'git unavailable: ' + e.message }; }
  if (out) return { cannot: 'Working tree currently has changes under src/public (cannot attribute to the audit): ' + out.split('\n').slice(0, 5).join('; ') };
  return { measured: 'git status --porcelain -- src public (working tree only; not history)', value: 0, unit: 'changed files', ok: true, note: 'Current working tree clean under src/ and public/; says nothing about commits.' };
});

// ---------- verify quotes exist in the source text ----------
const toks = (s) => norm(s).replace(/[×x]/g, 'x').replace(/`/g, '');
const corp2 = toks(corpus);
let badQuotes = 0;
for (const c of claims) { c.quote_found = corp2.includes(toks(c.quote)); if (!c.quote_found) badQuotes++; }

fs.writeFileSync(path.join(here, 'claims.json'), JSON.stringify(claims, null, 2) + '\n');

// ---------- summary ----------
const tally = {};
for (const c of claims) { const k = c.kind + '/' + (c.verdict ?? 'unverdicted'); tally[k] = (tally[k] || 0) + 1; }
console.log('claim  asset  prio       kind      verdict       value  claimed  text');
for (const c of claims) {
  console.log([c.claim_id, String(c.asset_id ?? '-').padEnd(5), String(c.first_pass_priority ?? '-').padEnd(9), c.kind.padEnd(8), (c.verdict ?? '-').padEnd(12), String(c.value ?? '').padEnd(8), String(c.claimed ?? '').padEnd(8), c.text.slice(0, 90)].join('  '));
}
console.log('\nTOTAL', claims.length, tally);
console.log('quotes not found verbatim in README/CSV:', badQuotes, claims.filter((c) => !c.quote_found).map((c) => c.claim_id).join(','));
const off = claims.filter((c) => c.verdict === 'off');
if (off.length) console.log('\nOFF:\n' + off.map((c) => `${c.claim_id} #${c.asset_id}: ${c.text} measured ${c.value} ${c.unit} (claimed ${c.claimed ?? '-'}) ${c.note}`).join('\n'));
