/**
 * Shared pieces of the brand-asset generators (render-default.ts, render-icons.ts): palette,
 * monogram markup, embedded fonts, and SVG rasterizers.
 *
 * Two rasterizers, on purpose:
 *  - `rasterizeWithSharp` (librsvg) for artwork without text — the icons.
 *  - `rasterizeWithChromium` for the OG card. librsvg ignores `@font-face` (embedded fonts fall
 *    back to a system sans), and sharp's FreeType can't read WOFF2, so Geist can't be loaded
 *    that way either. Headless Chromium (the pinned Playwright build already used for the e2e
 *    tests) renders the same SVG with the real variable fonts and kerning; sharp then encodes
 *    the PNG. Regenerating therefore needs that browser: `npx playwright install chromium`.
 *
 * Runs on Node's native TypeScript support: erasable syntax only.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { MONOGRAM, type Rect } from '../../src/lib/monogram.ts';

/** Repository root (scripts/og/ → ../../). */
export const ROOT = resolve(import.meta.dirname, '../..');
export const PUBLIC_DIR = resolve(ROOT, 'public');

/** Dark and light hex values of the tokens in src/styles/tokens.css (spec-design-content §1a). */
export const COLOR = {
  bg: '#0c0d10',
  line: '#2b2e32',
  lineUi: '#686c72',
  text: '#eff0f2',
  textMuted: '#aeb1b6',
  textSubtle: '#8e9398',
  accent: '#f2893d',
  textLight: '#15191d',
  accentLight: '#aa460d',
} as const;

export interface MonogramPaint {
  /** Paint for the letters: a colour or `currentColor`. */
  ink: string;
  /** Paint for the cursor block. */
  accent: string;
}

/**
 * The monogram's elements in its own 22×18 unit grid (src/lib/monogram.ts); position and
 * scale it with a wrapping `<g transform>` or the root `viewBox`. The cursor carries
 * `class="cursor"` so a stylesheet can repaint it.
 */
export function monogramElements({ ink, accent }: MonogramPaint): string {
  const rect = (r: Rect, attrs: string) =>
    `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" ${attrs}/>`;
  return [
    `<g fill="none" stroke="${ink}" stroke-width="${MONOGRAM.strokeWidth}">`,
    ...MONOGRAM.strokes.map((d) => `<path d="${d}"/>`),
    '</g>',
    ...MONOGRAM.rects.map((r) => rect(r, `fill="${ink}"`)),
    rect(MONOGRAM.cursor, `class="cursor" fill="${accent}"`),
  ].join('');
}

export { MONOGRAM };

/** `@font-face` rules embedding the self-hosted Latin variable fonts as base64 WOFF2. */
export async function embeddedFontFaces(): Promise<string> {
  const face = async (family: string, file: string) => {
    const data = await readFile(resolve(ROOT, 'node_modules', file));
    return (
      `@font-face{font-family:'${family}';font-weight:100 900;font-style:normal;` +
      `src:url(data:font/woff2;base64,${data.toString('base64')}) format('woff2')}`
    );
  };
  return (
    (await face('Geist', '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2')) +
    (await face(
      'Geist Mono',
      '@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2',
    ))
  );
}

/** Rasterizes a text-free SVG with sharp (librsvg) at `size`×`size` px. */
export function rasterizeWithSharp(svg: string, size: number): Promise<Buffer> {
  return sharp(Buffer.from(svg), { density: 72 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Renders an SVG document in headless Chromium at 1:1 and returns the PNG screenshot. Before
 * the screenshot, `prepare` runs in the page (fonts loaded) — e.g. to place elements after
 * measured text.
 */
export async function rasterizeWithChromium(
  svg: string,
  width: number,
  height: number,
  prepare?: () => void,
): Promise<Buffer> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.setContent(
      `<!doctype html><html><body style="margin:0;background:${COLOR.bg}">${svg}</body></html>`,
    );
    // An empty result means no @font-face matched: the text would silently use a system font.
    const missing = await page.evaluate(async () => {
      const fonts = ['600 16px Geist', '500 16px "Geist Mono"'];
      const loaded = await Promise.all(fonts.map((font) => document.fonts.load(font)));
      return fonts.filter((_, i) => loaded[i]?.length === 0);
    });
    if (missing.length > 0) throw new Error(`fonts not loaded: ${missing.join(', ')}`);
    if (prepare) await page.evaluate(prepare);
    return await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width, height } });
  } finally {
    await browser.close();
  }
}
