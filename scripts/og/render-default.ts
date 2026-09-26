/**
 * Renders the default Open Graph card, public/og-default.png (1200×630), used by the home page,
 * /work/ and the 404 (spec-design-content §6). Re-run after changing the monogram or copy:
 *
 *   npm run og
 *
 * The card is an SVG authored below: graphite ground, a 64px hairline grid fading out from the
 * upper right (as the home hero), the monogram, the name in Geist 600 ending in an accent
 * cursor block, and a Geist Mono readout line. Chromium rasterizes it (see lib.ts for why not
 * librsvg); sharp encodes the PNG.
 */

import { resolve } from 'node:path';
import sharp from 'sharp';
import { site } from '../../src/data/site.ts';
import {
  COLOR,
  MONOGRAM,
  PUBLIC_DIR,
  embeddedFontFaces,
  monogramElements,
  rasterizeWithChromium,
} from './lib.ts';

const W = 1200;
const H = 630;
/** Outer margin; the text column starts here. */
const PAD = 80;
const CELL = 64;

const NAME_SIZE = 128;
/** Geist's cap height (710 / 1000 units): the cursor block's height. */
const CAP = 0.71 * NAME_SIZE;
/** Pulls the name left by the P's side bearing, so its stem lines up with the text column. */
const NAME_INSET = 6;
const CURSOR_GAP = 14;
const READOUT = ['Cyber security', 'Reverse engineering', 'Software'];
const READOUT_SIZE = 28;
/** The text block sits on the bottom margin; the name's baseline is on a grid line. */
const READOUT_BASELINE = H - PAD;
const NAME_BASELINE = READOUT_BASELINE - 86;
/** Shown top right; the path keeps its capital P (the site lives at /Portfolio/). */
const URL_TEXT = 'pjackim.github.io/Portfolio';
/** Integer scale, so the monogram's 2-unit stems land on whole pixels. */
const MONOGRAM_SCALE = 3;

/** The readout as <tspan>s: uppercase words, dim middle dots between them. */
const readout = READOUT.map((part) => `<tspan>${part.toUpperCase()}</tspan>`).join(
  '<tspan class="sep"> · </tspan>',
);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<style>${await embeddedFontFaces()}
text{font-kerning:normal;text-rendering:geometricPrecision}
.name{font:600 ${NAME_SIZE}px Geist;letter-spacing:-0.02em;fill:${COLOR.text}}
.readout{font:500 ${READOUT_SIZE}px 'Geist Mono';letter-spacing:0.06em;fill:${COLOR.textMuted}}
.url{font:400 22px 'Geist Mono';letter-spacing:0.02em;fill:${COLOR.textSubtle}}
.sep{fill:${COLOR.lineUi}}
</style>
<pattern id="grid" width="${CELL}" height="${CELL}" patternUnits="userSpaceOnUse" x="${PAD - 1}" y="${NAME_BASELINE % CELL}">
<path d="M0 0.5H${CELL}M0.5 0V${CELL}" fill="none" stroke="${COLOR.line}" stroke-width="1"/>
</pattern>
<radialGradient id="fade" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(${W - 200} 40) scale(820 560)">
<stop offset="0" stop-color="#fff"/>
<stop offset="1" stop-color="#fff" stop-opacity="0"/>
</radialGradient>
<mask id="grid-fade"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>
</defs>
<rect width="${W}" height="${H}" fill="${COLOR.bg}"/>
<rect width="${W}" height="${H}" fill="url(#grid)" mask="url(#grid-fade)"/>
<g transform="translate(${PAD} ${PAD}) scale(${MONOGRAM_SCALE})">${monogramElements({ ink: COLOR.text, accent: COLOR.accent })}</g>
<text class="url" x="${W - PAD}" y="${PAD + (MONOGRAM.height * MONOGRAM_SCALE) / 2 + 8}" text-anchor="end">${URL_TEXT}</text>
<text id="name" class="name" x="${PAD - NAME_INSET}" y="${NAME_BASELINE}">${site.name}</text>
<rect id="cursor" data-gap="${CURSOR_GAP}" x="0" y="${NAME_BASELINE - CAP}" width="${Math.round(NAME_SIZE * 0.11)}" height="${CAP}" fill="${COLOR.accent}"/>
<text class="readout" x="${PAD}" y="${READOUT_BASELINE}">${readout}</text>
</svg>`;

/** Runs in the page, so it reads the gap from the SVG: puts the cursor block after the name. */
function placeCursor(): void {
  const box = document.querySelector<SVGTextElement>('#name')!.getBBox();
  const cursor = document.querySelector<SVGRectElement>('#cursor')!;
  cursor.setAttribute('x', String(Math.round(box.x + box.width + Number(cursor.dataset['gap']))));
}

const png = await rasterizeWithChromium(svg, W, H, placeCursor);
const out = resolve(PUBLIC_DIR, 'og-default.png');
const { width, height, size } = await sharp(png)
  .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 100 })
  .toFile(out);
if (width !== W || height !== H) throw new Error(`og-default.png is ${width}×${height}`);

console.log(`og-default.png ${width}×${height}, ${(size / 1000).toFixed(1)} KB`);
