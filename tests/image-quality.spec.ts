/**
 * Image quality, measured on the build (quality first: project media ships at the best quality
 * its master allows). Reads files from `dist/` and `src/content/` with Node, so it needs the
 * local build and skips against a deployed site.
 * - "Full size" links point at the master itself, byte for byte, up to 2 MB (MediaFigure.astro);
 *   a bigger master is delivered as a WebP at its own width.
 * - The widest AVIF and WebP candidates of the BodyCam hero and of a UI screenshot stay close to
 *   the master (PSNR), and the hero keeps a floor on bits per pixel: a tripwire on a change that
 *   quietly lowers the quality. Measured against the masters (AVIF is what nearly everyone gets):
 *   BodyCam hero AVIF 47.3 dB / 0.70 bpp (Astro's default q50: 40.9 / 0.22), WebP 46.6 dB / 0.79
 *   bpp (q80: 40.0 / 0.33); UI screenshot AVIF 48.1 dB (q50: 42.2), WebP 34.5 dB (q80: 32.9).
 *   Lossy WebP is 4:2:0, which caps saturated thin lines near 35 dB whatever the quality.
 * Chromium only: the markup and the files are browser-independent.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';
import { gotoRel } from './helpers/routes.ts';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const CONTENT = fileURLToPath(new URL('../src/content/projects/', import.meta.url));
/** MediaFigure.astro's MASTER_LINK_MAX: up to this size the link is the master as it is. */
const MASTER_LINK_MAX = 2 * 1024 * 1024;

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'files, not rendering: Chromium only');
  test.skip(!!process.env.BASE_URL, 'reads dist/ and src/content/, which a deployed site lacks');
});

/** `/Portfolio/_astro/<name>.<hash>….<ext>` → the file in `dist/`. */
const distFile = (url: string) =>
  join(DIST, new URL(url, 'http://x').pathname.replace(/^\/Portfolio\//, ''));
/** `panel-lobby.<hash>_Z1.avif` → `panel-lobby.webp`, the master it came from. */
const masterName = (url: string) =>
  `${basename(new URL(url, 'http://x').pathname).split('.')[0]}.webp`;
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

/** The widest candidate of one format of the picture around `selector`. */
async function widest(page: Page, selector: string, type: 'avif' | 'webp') {
  return page.locator(selector).evaluate((img, mime) => {
    const source = img.parentElement!.querySelector(`source[type="image/${mime}"]`)!;
    const candidates = source
      .getAttribute('srcset')!
      .split(',')
      .map((candidate) => candidate.trim().split(/\s+/) as [string, string])
      .map(([url, descriptor]) => ({ url, width: Number.parseInt(descriptor, 10) }));
    return candidates.sort((a, b) => b.width - a.width)[0]!;
  }, type);
}

/** PSNR (dB) of a delivered file against its master, which is scaled to the file's width if
    the two differ. */
async function psnr(delivered: Buffer, master: Buffer): Promise<number> {
  const { data: a, info } = await sharp(delivered)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { data: b } = await sharp(master)
    .resize({ width: info.width, kernel: 'lanczos3' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  expect(b.length).toBe(a.length);
  let squares = 0;
  for (let i = 0; i < a.length; i++) squares += (a[i]! - b[i]!) ** 2;
  return 10 * Math.log10((255 * 255) / (squares / a.length));
}

for (const slug of ['bodycam-external', 'credential-correlation']) {
  test(`${slug}: the Full size links are the masters, byte for byte`, async ({ page }) => {
    await gotoRel(page, `work/${slug}/`);
    const hrefs = await page
      .locator('a[data-lightbox-trigger]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')!));
    expect(hrefs.length).toBeGreaterThan(0);
    let masters = 0;
    for (const href of hrefs) {
      const master = readFileSync(join(CONTENT, slug, masterName(href)));
      const file = readFileSync(distFile(href));
      if (master.length <= MASTER_LINK_MAX) {
        masters++;
        expect(sha256(file), `${href} is not the master`).toBe(sha256(master));
      } else {
        // Too big to send as it is: a WebP at the master's own width.
        const [delivered, original] = await Promise.all([
          sharp(file).metadata(),
          sharp(master).metadata(),
        ]);
        expect([delivered.format, delivered.width]).toEqual(['webp', original.width]);
      }
    }
    expect(masters, 'at least one link is a master as it is').toBeGreaterThan(0);
  });
}

test.describe('delivery quality', () => {
  const CASES = [
    {
      name: 'the BodyCam hero',
      path: 'work/bodycam-external/',
      img: '#case-hero img',
      webpDb: 41.5,
      bpp: true,
    },
    {
      name: 'a UI screenshot (credential-correlation, last figure)',
      path: 'work/credential-correlation/',
      img: 'figure[data-kind="image"] img.figure__img >> nth=-1',
      webpDb: 33.5,
      bpp: false,
    },
  ];

  for (const { name, path, img, webpDb, bpp } of CASES) {
    test(`${name} stays close to its master`, async ({ page }, testInfo) => {
      await gotoRel(page, path);
      const results: string[] = [];
      for (const [type, floorDb, floorBpp] of [
        ['avif', 44, 0.45],
        ['webp', webpDb, 0.6],
      ] as const) {
        const top = await widest(page, img, type);
        const file = readFileSync(distFile(top.url));
        const master = readFileSync(join(CONTENT, path.split('/')[1]!, masterName(top.url)));
        const { width, height } = await sharp(file).metadata();
        const db = await psnr(file, master);
        const bitsPerPixel = (file.length * 8) / (width * height);
        results.push(`${type} ${top.width}w ${db.toFixed(1)} dB ${bitsPerPixel.toFixed(2)} bpp`);
        expect(db, `${type} candidate ${top.url}`).toBeGreaterThanOrEqual(floorDb);
        if (bpp) expect(bitsPerPixel, `${type} bits per pixel`).toBeGreaterThanOrEqual(floorBpp);
      }
      testInfo.annotations.push({ type: 'measured', description: results.join('; ') });
    });
  }
});
