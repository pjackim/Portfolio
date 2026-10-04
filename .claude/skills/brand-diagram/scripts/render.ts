/**
 * Render a brand-diagram fragment to an image at 2x.
 *
 *   node .claude/skills/brand-diagram/scripts/render.ts <fragment.html> [--out <file.png|file.webp>] [--size 1200x720]
 *
 * The fragment is just markup: one `<main class="canvas">…</main>`. This script wraps it with
 * kit.css and the Geist fonts (from node_modules), waits for fonts and images, and screenshots
 * `.canvas`. `{{ROOT}}` in the fragment becomes the repo root as a file URL, so it can embed
 * repo images (`<img src="{{ROOT}}/src/assets/…">`). A `.webp` output is encoded from the PNG.
 * Runs on Node's native TypeScript type-stripping, so erasable syntax only.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../../..');
const FONTS = join(ROOT, 'node_modules/@fontsource-variable');

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { out: { type: 'string' }, size: { type: 'string', default: '1200x720' } },
});
const input = positionals[0];
const size = /^(\d{3,4})x(\d{3,4})$/.exec(values.size);
if (!input || !size) {
  console.error(
    'usage: node render.ts <fragment.html> [--out <file.png|file.webp>] [--size 1200x720]',
  );
  process.exit(1);
}
const [width, height] = [Number(size[1]), Number(size[2])];

const fragmentPath = resolve(input);
const out = resolve(
  values.out ?? join(dirname(fragmentPath), `${basename(fragmentPath, extname(fragmentPath))}.png`),
);

const fontFace = (family: string, file: string): string =>
  `@font-face{font-family:'${family}';font-weight:100 900;src:url('${pathToFileURL(file).href}') format('woff2');}`;

const kit = await readFile(join(HERE, '../kit.css'), 'utf8');
const body = (await readFile(fragmentPath, 'utf8')).replaceAll(
  '{{ROOT}}',
  pathToFileURL(ROOT).href.replace(/\/$/, ''),
);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${[
  fontFace('Geist Variable', join(FONTS, 'geist/files/geist-latin-wght-normal.woff2')),
  fontFace(
    'Geist Mono Variable',
    join(FONTS, 'geist-mono/files/geist-mono-latin-wght-normal.woff2'),
  ),
  kit,
  `:root{--w:${width}px;--h:${height}px}`,
].join('\n')}</style></head><body>${body}</body></html>`;

await mkdir(dirname(out), { recursive: true });
const browser = await chromium.launch();
const doc = join(dirname(out), `.${basename(out, extname(out))}.render.html`);
try {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  });
  // setContent runs on about:blank, which may not load file: fonts; go through a real file URL.
  await writeFile(doc, html);
  await page.goto(pathToFileURL(doc).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() =>
    Promise.all([...document.images].map((img) => img.decode().catch(() => undefined))),
  );
  const canvas = page.locator('.canvas');
  if ((await canvas.count()) !== 1) throw new Error('fragment needs exactly one .canvas element');
  // Fail loudly if content spills the canvas or an image is broken instead of shipping it.
  const problems = await page.evaluate(() => {
    const c = document.querySelector('.canvas') as HTMLElement;
    const box = c.getBoundingClientRect();
    const spill = [...c.querySelectorAll<HTMLElement>('*')]
      .filter((el) => !el.closest('svg') || el.tagName === 'svg')
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > box.right + 0.5 || r.bottom > box.bottom + 0.5);
      })
      .map((el) => `overflow: ${el.tagName.toLowerCase()}.${el.className}`);
    const broken = [...document.images]
      .filter((img) => img.naturalWidth === 0)
      .map((img) => `broken image: ${img.getAttribute('src')}`);
    return [...spill, ...broken];
  });
  if (problems.length) throw new Error(`${width}x${height} canvas: ${problems.join('; ')}`);
  const png = await canvas.screenshot({ type: 'png' });
  if (extname(out).toLowerCase() === '.webp') {
    await sharp(png).webp({ quality: 92, effort: 6 }).toFile(out);
  } else {
    await writeFile(out, png);
  }
  console.log(`✔ ${out}`);
} finally {
  await rm(doc, { force: true });
  await browser.close();
}
