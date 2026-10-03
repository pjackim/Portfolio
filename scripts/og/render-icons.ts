/**
 * Writes the site icons into public/ (spec-design-content §6), all from the master logo
 * (src/assets/brand/logo.png): the mark on a graphite tile, because its white paper vanishes on
 * the light tab bars and home screens these icons land on.
 *
 *  - favicon.ico — 32×32, one PNG inside an ICO container, 4px corner radius.
 *  - icon-192.png — 192×192, the same tile at the favicon's proportions.
 *  - apple-touch-icon.png — 180×180, square (iOS rounds the corners itself).
 *
 *   npm run og
 */
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PUBLIC_DIR, logoTile } from './lib.ts';

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

const outputs: [name: string, data: Buffer][] = [
  ['favicon.ico', icoFromPng(await logoTile(32, 24, 4), 32)],
  ['icon-192.png', await logoTile(192, 144, 24)],
  ['apple-touch-icon.png', await logoTile(180, 135, 0)],
];

for (const [name, data] of outputs) {
  await writeFile(resolve(PUBLIC_DIR, name), data);
  console.log(`${name} ${(data.length / 1000).toFixed(1)} KB`);
}
