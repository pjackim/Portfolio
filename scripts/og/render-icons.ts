/**
 * Writes the site icons into public/ (spec-design-content §6), all from the shared monogram
 * geometry (src/lib/monogram.ts):
 *
 *  - favicon.svg — the monogram on a transparent ground; an internal `prefers-color-scheme`
 *    stylesheet switches it between the light and dark ink / accent.
 *  - favicon.ico — 32×32, one PNG inside an ICO container. Consumers of the ICO don't evaluate
 *    media queries, so it is the dark tile (light monogram on graphite), legible on any tab bar.
 *  - apple-touch-icon.png — 180×180, the monogram on graphite (iOS rounds the corners itself).
 *
 *   npm run og
 */
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { COLOR, MONOGRAM, PUBLIC_DIR, monogramElements, rasterizeWithSharp } from './lib.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Square viewBox around the 22×18 monogram: full width, centred vertically. */
function faviconSvg(): string {
  const pad = (MONOGRAM.width - MONOGRAM.height) / 2;
  const style =
    `svg{color:${COLOR.textLight}}.cursor{fill:${COLOR.accentLight}}` +
    `@media (prefers-color-scheme:dark){svg{color:${COLOR.text}}.cursor{fill:${COLOR.accent}}}`;
  return (
    `<svg xmlns="${SVG_NS}" viewBox="0 ${-pad} ${MONOGRAM.width} ${MONOGRAM.width}">` +
    `<style>${style}</style>` +
    monogramElements({ ink: 'currentColor', accent: COLOR.accentLight }) +
    '</svg>\n'
  );
}

/**
 * The monogram at an integer `scale` (so every stem lands on whole pixels), centred on a
 * graphite `size`×`size` tile with corner radius `radius`.
 */
function tileSvg(size: number, scale: number, radius: number): string {
  const x = (size - MONOGRAM.width * scale) / 2;
  const y = (size - MONOGRAM.height * scale) / 2;
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new Error(`icon ${size}px: monogram ×${scale} is not pixel-aligned`);
  }
  return (
    `<svg xmlns="${SVG_NS}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<rect width="${size}" height="${size}" rx="${radius}" fill="${COLOR.bg}"/>` +
    `<g transform="translate(${x} ${y}) scale(${scale})">` +
    monogramElements({ ink: COLOR.text, accent: COLOR.accent }) +
    '</g></svg>'
  );
}

/** An ICO file holding a single PNG image (supported since Windows Vista and by all browsers). */
function icoFromPng(png: Buffer, size: number): Buffer {
  const header = Buffer.alloc(6 + 16);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count
  header.writeUInt8(size % 256, 6); // width (0 = 256)
  header.writeUInt8(size % 256, 7); // height
  header.writeUInt8(0, 8); // palette size
  header.writeUInt8(0, 9); // reserved
  header.writeUInt16LE(1, 10); // colour planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(png.length, 14); // image data size
  header.writeUInt32LE(header.length, 18); // image data offset
  return Buffer.concat([header, png]);
}

const outputs: [name: string, data: string | Buffer][] = [
  ['favicon.svg', faviconSvg()],
  ['favicon.ico', icoFromPng(await rasterizeWithSharp(tileSvg(32, 1, 4), 32), 32)],
  ['apple-touch-icon.png', await rasterizeWithSharp(tileSvg(180, 5, 0), 180)],
];

for (const [name, data] of outputs) {
  await writeFile(resolve(PUBLIC_DIR, name), data);
  console.log(`${name} ${(Buffer.byteLength(data) / 1000).toFixed(1)} KB`);
}
