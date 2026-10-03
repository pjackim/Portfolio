/**
 * Writes the logo asset the site's pages serve, src/assets/brand/logo-mark.webp: the master
 * (src/assets/brand/logo.png) cropped to its visible shape, with its transparency. The header
 * and footer import it through astro:assets, which resizes it per use.
 *
 *   npm run og
 *
 * 288 px tall covers the header's 24 px mark at 3× density. Lossy WebP with a lossless alpha
 * channel keeps the soft paper shading free of banding at a fraction of the PNG's size.
 */
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { LOGO_MARK, trimmedLogo } from './lib.ts';

const HEIGHT = 288;

const { data, info } = await sharp(await trimmedLogo())
  .resize({ height: HEIGHT, kernel: 'lanczos3' })
  .webp({ quality: 92, alphaQuality: 100, effort: 6 })
  .toBuffer({ resolveWithObject: true });

await writeFile(LOGO_MARK, data);
console.log(`logo-mark.webp ${info.width}×${info.height}, ${(data.length / 1000).toFixed(1)} KB`);
