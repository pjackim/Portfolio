/**
 * Render a brand-diagram fragment to a 2400x1440 PNG.
 *
 *   node .claude/skills/brand-diagram/scripts/render.ts <fragment.html> [--out <file.png>]
 *
 * The fragment is just markup: one `<main class="canvas">…</main>`. This script wraps it with
 * kit.css and the Geist fonts (from node_modules), waits for fonts, and screenshots `.canvas`
 * at 2x. Runs on Node's native TypeScript type-stripping, so erasable syntax only.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../../..');
const FONTS = join(ROOT, 'node_modules/@fontsource-variable');

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { out: { type: 'string' } },
});
const input = positionals[0];
if (!input) {
  console.error('usage: node render.ts <fragment.html> [--out <file.png>]');
  process.exit(1);
}

const fragmentPath = resolve(input);
const out = resolve(
  values.out ?? join(dirname(fragmentPath), `${basename(fragmentPath, extname(fragmentPath))}.png`),
);

const fontFace = (family: string, file: string): string =>
  `@font-face{font-family:'${family}';font-weight:100 900;src:url('${pathToFileURL(file).href}') format('woff2');}`;

const kit = await readFile(join(HERE, '../kit.css'), 'utf8');
const body = await readFile(fragmentPath, 'utf8');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${[
  fontFace('Geist Variable', join(FONTS, 'geist/files/geist-latin-wght-normal.woff2')),
  fontFace(
    'Geist Mono Variable',
    join(FONTS, 'geist-mono/files/geist-mono-latin-wght-normal.woff2'),
  ),
  kit,
].join('\n')}</style></head><body>${body}</body></html>`;

await mkdir(dirname(out), { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 720 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  });
  // setContent runs on about:blank, which may not load file: fonts; go through a real file URL.
  const doc = join(dirname(out), `.${basename(out, '.png')}.render.html`);
  await writeFile(doc, html);
  await page.goto(pathToFileURL(doc).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const canvas = page.locator('.canvas');
  if ((await canvas.count()) !== 1) throw new Error('fragment needs exactly one .canvas element');
  // Fail loudly if content spills the canvas instead of shipping a clipped diagram.
  const spill = await page.evaluate(() => {
    const c = document.querySelector('.canvas') as HTMLElement;
    const box = c.getBoundingClientRect();
    return [...c.querySelectorAll<HTMLElement>('*')]
      .filter((el) => !el.closest('svg') || el.tagName === 'svg')
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > box.right + 0.5 || r.bottom > box.bottom + 0.5);
      })
      .map((el) => `${el.tagName.toLowerCase()}.${el.className}`);
  });
  if (spill.length) throw new Error(`content overflows the 1200x720 canvas: ${spill.join(', ')}`);
  await canvas.screenshot({ path: out });
  await rm(doc, { force: true });
  console.log(`✔ ${out}`);
} finally {
  await browser.close();
}
