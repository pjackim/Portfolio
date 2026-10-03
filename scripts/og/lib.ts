/**
 * Shared pieces of the brand-asset generators (render-mark.ts, render-default.ts,
 * render-icons.ts): palette, the logo mark, embedded fonts, and SVG rasterizers.
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

/** Repository root (scripts/og/ → ../../). */
export const ROOT = resolve(import.meta.dirname, '../..');
export const PUBLIC_DIR = resolve(ROOT, 'public');
export const BRAND_DIR = resolve(ROOT, 'src/assets/brand');
/** The master logo: a transparent 1254×1254 PNG, the mark centred with generous margins. */
export const LOGO_SOURCE = resolve(BRAND_DIR, 'logo.png');
/** The master cropped to its visible shape (render-mark.ts); what the site's header serves. */
export const LOGO_MARK = resolve(BRAND_DIR, 'logo-mark.webp');

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

/** Alpha above which a pixel counts as part of the mark (the master's edge is anti-aliased). */
const MARK_ALPHA = 8;

/**
 * The master logo cropped to the bounding box of its visible pixels, as a PNG. The master keeps
 * wide transparent margins, which would make every size below depend on them.
 */
export async function trimmedLogo(): Promise<Buffer> {
  const { data, info } = await sharp(LOGO_SOURCE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let [left, top, right, bottom] = [info.width, info.height, -1, -1];
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3]! <= MARK_ALPHA) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) throw new Error(`${LOGO_SOURCE} has no visible pixels`);
  return sharp(LOGO_SOURCE)
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .png()
    .toBuffer();
}

/** The trimmed mark at exactly `height` px tall (Lanczos), as a PNG; width follows its aspect. */
export async function logoAtHeight(height: number): Promise<Buffer> {
  return sharp(await trimmedLogo())
    .resize({ height, kernel: 'lanczos3' })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * The mark centred on a graphite `size`×`size` tile with corner radius `radius`, the mark
 * `markHeight` px tall. The mark's white paper needs a dark ground: it disappears on a light tab
 * bar or home screen.
 */
export async function logoTile(size: number, markHeight: number, radius: number): Promise<Buffer> {
  const mark = await logoAtHeight(markHeight);
  const { width, height } = await sharp(mark).metadata();
  const ground = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${COLOR.bg}"/></svg>`;
  return sharp(Buffer.from(ground))
    .composite([
      {
        input: mark,
        left: Math.round((size - width!) / 2),
        top: Math.round((size - height!) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

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
