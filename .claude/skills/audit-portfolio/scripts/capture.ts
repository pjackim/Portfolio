/**
 * Evidence capture for /audit-portfolio and /design-portfolio: screenshots every page × width ×
 * colour scheme against a running server, plus the mechanical signals an agent can't eyeball
 * reliably (horizontal overflow, third-party requests, JS weight, inline styles, console errors,
 * images without alt). Writes PNGs and `manifest.json` to --out.
 *
 *   node .claude/skills/audit-portfolio/scripts/capture.ts \
 *     --base http://localhost:4400/Portfolio/ --pages ",work/,work/credential-correlation/,404.html" \
 *     --out .cache/captures/run-1
 *
 * Options (all optional): --base, --pages (comma list of paths relative to base; '' = home; may
 * carry a query such as '?variant=B'), --widths (default 390,768,1280,1920), --schemes (default
 * light,dark), --motion (reduce | on | both; default reduce), --out (default
 * .cache/captures/<timestamp>).
 *
 * Reduced motion is the default because it settles scroll reveals and the hero intro, so a
 * full-page shot shows final states. `--motion on` waits for the hero to settle instead.
 * Runs on Node's native type-stripping: erasable syntax only.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium, type Page } from '@playwright/test';

const { values } = parseArgs({
  options: {
    base: { type: 'string', default: 'http://localhost:4321/Portfolio/' },
    pages: { type: 'string', default: ',work/,work/credential-correlation/,404.html' },
    widths: { type: 'string', default: '390,768,1280,1920' },
    schemes: { type: 'string', default: 'light,dark' },
    motion: { type: 'string', default: 'reduce' },
    out: { type: 'string' },
  },
});

const base = values.base.replace(/\/?$/, '/');
const origin = new URL(base).origin;
const pages = values.pages.split(',').map((p) => p.trim());
const widths = values.widths.split(',').map(Number);
const schemes = values.schemes.split(',') as ('light' | 'dark')[];
const motions: ('reduce' | 'on')[] =
  values.motion === 'both' ? ['reduce', 'on'] : [values.motion === 'on' ? 'on' : 'reduce'];
const out =
  values.out ?? join('.cache', 'captures', new Date().toISOString().replace(/[:.]/g, '-'));
mkdirSync(out, { recursive: true });

const slug = (path: string): string =>
  (path.replace(/[?=&/.]+/g, '-').replace(/^-|-$/g, '') || 'home').toLowerCase();

/** Scroll the whole page in steps so reveals and lazy media trigger, then return to the top. */
async function settle(page: Page, motion: 'reduce' | 'on'): Promise<void> {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    scrollTo(0, 0);
  });
  await page.waitForTimeout(motion === 'on' ? 6000 : 400);
}

/** Layout and markup facts from the review checklist (C7, X1). */
function probe(): Record<string, unknown> {
  const doc = document.documentElement;
  const vw = doc.clientWidth;
  const wide = [...document.querySelectorAll<HTMLElement>('body *')]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && (r.right > vw + 1 || r.left < -1);
    })
    .filter((el) => getComputedStyle(el).position !== 'fixed')
    // Inside an intentional scroller or clip (e.g. a chip row), overflow is by design.
    .filter((el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        if (getComputedStyle(p).overflowX !== 'visible') return false;
      }
      return true;
    })
    .slice(0, 8)
    .map(
      (el) =>
        `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).trim().split(/\s+/).join('.') : ''}`,
    );
  return {
    overflowX: doc.scrollWidth > vw,
    scrollWidth: doc.scrollWidth,
    viewportWidth: vw,
    overflowingElements: wide,
    imagesWithoutAlt: [...document.querySelectorAll<HTMLImageElement>('img:not([alt])')]
      .filter((img) => img.getClientRects().length > 0 || img.getAttribute('src'))
      .map((img) => (img as HTMLImageElement).currentSrc || (img as HTMLImageElement).src),
    h1Count: document.querySelectorAll('h1').length,
  };
}

const browser = await chromium.launch();
const results: Record<string, unknown>[] = [];

for (const path of pages) {
  for (const motion of motions) {
    for (const scheme of schemes) {
      for (const width of widths) {
        const context = await browser.newContext({
          viewport: { width, height: width < 600 ? 844 : 900 },
          deviceScaleFactor: 1,
          colorScheme: scheme,
          reducedMotion: motion === 'reduce' ? 'reduce' : 'no-preference',
          hasTouch: width < 600,
        });
        const page = await context.newPage();
        const consoleErrors: string[] = [];
        const thirdParty = new Set<string>();
        let jsBytes = 0;
        page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
        page.on('pageerror', (e) => consoleErrors.push(String(e)));
        page.on('request', (r) => {
          const u = r.url();
          if (!u.startsWith(origin) && !u.startsWith('data:')) thirdParty.add(u);
        });
        page.on('response', async (r) => {
          if (r.request().resourceType() !== 'script') return;
          try {
            jsBytes += (await r.body()).length;
          } catch {
            /* body unavailable (redirect or aborted): ignore */
          }
        });

        const id = `${slug(path)}__${width}__${scheme}${motion === 'on' ? '__motion' : ''}`;
        let status = 0;
        try {
          const res = await page.goto(base + path, { waitUntil: 'networkidle' });
          status = res?.status() ?? 0;
          // CSP forbids style attributes in served markup (scripts may still set el.style).
          const html = (await res?.text()) ?? '';
          const inlineStyleAttrs = (html.match(/<[^>]+\sstyle\s*=/gi) ?? []).length;
          await page.screenshot({ path: join(out, `${id}__fold.png`) });
          await settle(page, motion);
          await page.screenshot({ path: join(out, `${id}__full.png`), fullPage: true });
          results.push({
            id,
            path,
            width,
            scheme,
            motion,
            status,
            ...(await page.evaluate(probe)),
            inlineStyleAttrs,
            jsBytes,
            thirdPartyRequests: [...thirdParty],
            consoleErrors,
            files: [`${id}__fold.png`, `${id}__full.png`],
          });
        } catch (error) {
          results.push({ id, path, width, scheme, motion, status, error: String(error) });
        }
        await context.close();
      }
    }
  }
}

await browser.close();
writeFileSync(join(out, 'manifest.json'), JSON.stringify({ base, results }, null, 2));

const flagged = results.filter(
  (r) =>
    r.error ||
    r.overflowX ||
    (r.thirdPartyRequests as string[])?.length ||
    (r.consoleErrors as string[])?.length ||
    (r.inlineStyleAttrs as number) > 0 ||
    (r.imagesWithoutAlt as string[])?.length ||
    (typeof r.status === 'number' && r.status >= 400 && !String(r.path).startsWith('404')),
);
console.log(`captured ${results.length} view(s) → ${out}`);
console.log(
  flagged.length ? `${flagged.length} view(s) flagged; see manifest.json` : 'no mechanical flags',
);
for (const r of flagged) console.log(`  ! ${r.id}`);
