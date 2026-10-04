/**
 * Cold-load layout stability (Ruling G11). On a first visit to a case study — a fresh browser
 * context, the HTTP cache off, and images arriving well after the first paint, as they do on a
 * real connection — nothing moves: not the hero cover, and not the figures further down as the
 * page is read through. Every picture's box is final from the server-rendered HTML and CSS (the
 * width/height attributes, or, on the "panel" and "alpha" plates, a box computed from the
 * image's own ratio), never measured from the file once it arrives.
 *
 * Pages: trip-planner and mordhau (small covers shown whole on a plate) and nodes (a
 * transparent cover on the light plate), at 1440×900 and 412×900. Chromium only: WebKit reports
 * no layout-shift entries.
 *
 * Each case runs twice: as it loads by default, and on a slow connection (`localStorage.net =
 * 'slow'`, src/lib/net-bootstrap.ts), where every image arrives light first and is then swapped
 * for its full-quality file. That swap must move nothing either, whether it happens on screen
 * or while the page is read through.
 */
import { expect, test } from '@playwright/test';
import { forceNet } from './helpers/net.ts';
import { gotoRel } from './helpers/routes.ts';

declare global {
  interface Window {
    __layoutShifts?: { value: number; recent: boolean; sources: string[] }[];
  }
}

const PAGES = ['work/trip-planner/', 'work/mordhau/', 'work/nodes/'];
/** How long each image is held back: long after the first paint. */
const IMAGE_DELAY_MS = 600;

const CASES = (['fast', 'slow'] as const).flatMap((net) =>
  [
    { width: 1440, height: 900 },
    { width: 412, height: 900 },
  ].map((viewport) => ({ net, viewport })),
);

for (const { net, viewport } of CASES) {
  test.describe(`cold load at ${viewport.width}×${viewport.height}${net === 'slow' ? ', slow connection' : ''}`, () => {
    test.use({ viewport });

    for (const path of PAGES) {
      test(`${path} doesn't shift as its images arrive`, async ({ page, browserName }) => {
        test.skip(browserName !== 'chromium', 'layout-shift entries are Chromium-only');
        if (net === 'slow') await forceNet(page, 'slow');
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        await page.route(/\.(?:avif|webp|jpe?g|png)(?:\?|$)/, async (route) => {
          await new Promise((resolve) => setTimeout(resolve, IMAGE_DELAY_MS));
          await route.continue();
        });
        await page.addInitScript(() => {
          window.__layoutShifts = [];
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as (PerformanceEntry & {
              value: number;
              hadRecentInput: boolean;
              sources?: { node?: Node | null }[];
            })[]) {
              window.__layoutShifts!.push({
                value: entry.value,
                recent: entry.hadRecentInput,
                sources: (entry.sources ?? []).map((s) => s.node?.nodeName ?? '#'),
              });
            }
          }).observe({ type: 'layout-shift', buffered: true });
        });

        await gotoRel(page, path);
        await page.waitForLoadState('load');
        // The slow variant must really be slow: otherwise it silently repeats the fast one.
        if (net === 'slow') await expect(page.locator('html')).toHaveAttribute('data-net', 'slow');
        // Read the page through (a script scroll isn't user input: any shift still counts),
        // so the lazy figures load while they are on screen.
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < height; y += viewport.height / 2) {
          await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y);
          await page.waitForTimeout(120);
        }
        // Every image that renders (the closed contact sheet's photo, lazy, never loads).
        await expect
          .poll(
            () =>
              page.evaluate(() =>
                [...document.images]
                  .filter((img) => img.getClientRects().length > 0)
                  .every((img) => img.complete),
              ),
            { timeout: 10_000 },
          )
          .toBe(true);
        if (net === 'slow') {
          // And every light image on screen has been swapped for its full one (each upgrade
          // waits for the one before it, so allow for the queue).
          await expect
            .poll(
              () =>
                page.evaluate(
                  () =>
                    document.documentElement.dataset.netBusy === undefined &&
                    [...document.querySelectorAll<HTMLImageElement>('img[data-net-state]')]
                      .filter((img) => img.getClientRects().length > 0)
                      .every((img) => img.dataset.netState === 'full'),
                ),
              { timeout: 30_000 },
            )
            .toBe(true);
          // ... and the poll above isn't vacuous: at least one image went light, then full.
          expect(await page.locator('img[data-net-state="full"]').count()).toBeGreaterThan(0);
        }
        await page.waitForTimeout(200);

        const shifts = (await page.evaluate(() => window.__layoutShifts)) ?? [];
        const cls = shifts.filter((s) => !s.recent).reduce((sum, s) => sum + s.value, 0);
        expect(cls, `layout shifts: ${JSON.stringify(shifts)}`).toBeLessThan(0.005);
      });
    }
  });
}

/**
 * No horizontal overflow while sideways entrances are mid-flight (scroll-motion task 2): the
 * home page's cards (`ProjectGrid`, `--reveal-x` up to 2.5rem) translate in from off their
 * resting position — none of that may widen the document past the viewport, at a phone width
 * and a wide desktop one, while items are still `pending` (translated furthest off-screen) or
 * partway through the animation. /work/ (its showcases, their floating previews) and the phone
 * home (the hub, no entrances) are held to the same, scrolled through.
 *
 * 820, 1024 and 1180 (fix wave finding 2) sit inside ProjectGrid's two-column range
 * (`width >= 50rem`, i.e. 800px) but below the point where `--gutter` (tokens.css,
 * `clamp(1rem, 0.5rem + 2.5vw, 2.5rem)`) reaches the full 2.5rem preset distance (1280px) — the
 * exact band the unbounded `--reveal-x` overflowed in, checked here right after load while every
 * below-the-fold card sits at its `pending`, furthest-off-position start offset.
 */
for (const width of [360, 820, 1024, 1180, 1280]) {
  test.describe(`no horizontal overflow at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const path of ['', 'work/']) {
      test(`${path || 'home'} stays within the viewport width mid-entrance`, async ({ page }) => {
        await gotoRel(page, path);
        await page.waitForLoadState('load');
        // Items below the fold are still `pending` (translated to their furthest offset) right
        // after load: check before anything has had a chance to scroll into view.
        if (path === '' && width >= 640) {
          await expect(page.locator('[data-reveal-state="pending"]').first()).toBeAttached();
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        // Scroll through the page in small steps so items cross the trigger line and animate
        // mid-flight — the moment their translate is between the start offset and 0.
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < height; y += 200) {
          await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y);
          const overflowed = await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          );
          expect(overflowed, `overflow at scrollY=${y}`).toBe(false);
        }
      });
    }
  });
}
