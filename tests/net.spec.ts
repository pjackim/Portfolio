/**
 * The adaptive image loader (src/lib/net-bootstrap.ts, src/scripts/net.ts): project media loads
 * at full quality, and only a connection detected as poor gets lighter images first, upgraded in
 * the background with no blank frame and no shift.
 * - Detection: the `net` override, Save-Data, a stored verdict and NetInfo's `effectiveType`
 *   (2g / 3g) decide `<html data-net>`; `rtt` and `downlink` are never read; no NetInfo, no
 *   verdict. In Chromium, real throttling reports 3g, and an unthrottled browser reports 4g.
 * - Fast path: nothing is touched (no scaled `sizes`, no state), the hero is promoted to eager
 *   by the head script and loads at once; without JavaScript it loads at full quality too.
 * - Slow path: a light candidate first, the full one fetched one image at a time afterwards and
 *   swapped in without a blank frame or a shift; Save-Data never upgrades and never autoplays.
 * - A measured stall (a hero still arriving after 3 s) marks the tab slow, even across a reload,
 *   and a later fast, large fetch clears the mark; an explicit override disables all of it.
 * - Density: heroes, cards and the phone reel get a candidate that covers 2× and 3× screens.
 * Runs on desktop Chromium and mobile WebKit at a desktop width (the media loops' slow-mode
 * behaviour is in media.spec.ts). playwright.config.ts pins `net=fast` for every other spec.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  candidatePaths,
  fakeConnection,
  forceNet,
  holdFullImages,
  IMAGE_URL,
  LITE_MAX,
  serverWidths,
  sizesOf,
  srcsetWidths,
  watchPaint,
} from './helpers/net.ts';
import { isWindowsWebKit, WINDOWS_WEBKIT } from './helpers/platform.ts';
import { builtHtml, gotoRel } from './helpers/routes.ts';

declare global {
  interface Window {
    __netIdle?: number;
    __netChanges?: number;
    __netAtParse?: string | null;
    __netShifts?: { value: number; at: number; sources: string[] }[];
  }
}

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chrome', 'net runs on chromium + webkit');
});

// At 1280px and 1×, the case hero's light pick is its 800w file and its full one is wider.
test.use({ viewport: { width: 1280, height: 800 } });

/** A case study with a plain cover and no video (every engine loads it). */
const PAGE = 'work/the-forest/';
/** A case study whose last figure is far below the fold, so it is requested only once scrolled
    to. Its hero is a YouTube poster: `#case-hero img` is the priority image on both pages. */
const FIGURES_PAGE = 'work/credential-correlation/';
const HERO = '#case-hero img';
const LAST_FIGURE = 'figure[data-kind="image"] img.figure__img';
/** Long enough that a stall check or a queued upgrade would have fired, if it would. */
const SETTLE_MS = 2000;

const dataNet = (page: Page) => page.evaluate(() => document.documentElement.dataset.net ?? null);
const stateOf = (img: Locator) => img.evaluate((el) => (el as HTMLImageElement).dataset.netState);
const painted = (img: Locator) =>
  img.evaluate(
    (el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0,
  );

/** The candidate an image shows: its `w`, the widest of its own srcsets, and the width and
    pixel density it is shown at. */
const shown = (img: Locator) =>
  img.evaluate((el) => {
    const image = el as HTMLImageElement;
    const widths = new Map<string, number>();
    const picture = image.parentElement?.nodeName === 'PICTURE' ? image.parentElement : null;
    for (const node of picture ? [...picture.children] : [image]) {
      for (const candidate of (node.getAttribute('srcset') ?? '').split(',')) {
        const [url, descriptor] = candidate.trim().split(/\s+/);
        if (url && descriptor?.endsWith('w')) {
          widths.set(new URL(url, document.baseURI).href, Number.parseInt(descriptor, 10));
        }
      }
    }
    return {
      w: widths.get(image.currentSrc) ?? 0,
      top: Math.max(...widths.values()),
      rendered: image.getBoundingClientRect().width,
      dpr: devicePixelRatio,
      complete: image.complete && image.naturalWidth > 0,
    };
  });

test.describe('detection', () => {
  const CASES: [string, Record<string, unknown> | undefined, string | null][] = [
    [
      'Chromium default estimates (1.45 Mbps, 100 ms) are fast',
      { effectiveType: '4g', downlink: 1.45, rtt: 100 },
      null,
    ],
    ['a high rtt alone is not read', { effectiveType: '4g', downlink: 10, rtt: 600 }, null],
    ['a low downlink alone is not read', { effectiveType: '4g', downlink: 0.7, rtt: 50 }, null],
    ['3g is slow', { effectiveType: '3g' }, 'slow'],
    ['2g is slow', { effectiveType: '2g' }, 'slow'],
    ['slow-2g is slow', { effectiveType: 'slow-2g' }, 'slow'],
    ['Save-Data is save', { effectiveType: '4g', saveData: true }, 'save'],
    ['no NetInfo (WebKit, Firefox) is fast', undefined, null],
  ];

  for (const [name, connection, expected] of CASES) {
    test(name, async ({ page }) => {
      await fakeConnection(page, connection);
      await gotoRel(page, '404.html');
      expect(await dataNet(page)).toBe(expected);
    });
  }

  test('a verdict stored for this tab is slow', async ({ page }) => {
    await fakeConnection(page, { effectiveType: '4g' });
    await page.addInitScript(() => sessionStorage.setItem('net', 'slow'));
    await gotoRel(page, '404.html');
    expect(await dataNet(page)).toBe('slow');
  });

  test('the override wins over everything', async ({ page }) => {
    await fakeConnection(page, { effectiveType: '3g', saveData: true });
    await forceNet(page, 'fast');
    await gotoRel(page, '404.html');
    expect(await dataNet(page)).toBeNull();

    const other = await page.context().newPage();
    await fakeConnection(other, { effectiveType: '4g' });
    await forceNet(other, 'slow');
    await gotoRel(other, '404.html');
    expect(await dataNet(other)).toBe('slow');
  });

  test('an unknown override is ignored', async ({ page }) => {
    await fakeConnection(page, { effectiveType: '3g' });
    await page.addInitScript(() => localStorage.setItem('net', 'bogus'));
    await gotoRel(page, '404.html');
    expect(await dataNet(page)).toBe('slow');
  });

  test('an unthrottled Chromium reports a fast connection', async ({
    page,
    browserName,
  }, testInfo) => {
    test.skip(browserName !== 'chromium', 'NetInfo is Chromium-only');
    await page.addInitScript(() => localStorage.removeItem('net'));
    await gotoRel(page, '404.html');
    const connection = await page.evaluate(() => {
      const { effectiveType, rtt, downlink, saveData } = (
        navigator as Navigator & { connection: Record<string, unknown> }
      ).connection;
      return { effectiveType, rtt, downlink, saveData };
    });
    testInfo.annotations.push({
      type: 'navigator.connection',
      description: JSON.stringify(connection),
    });
    expect(connection.effectiveType).toBe('4g');
    expect(await dataNet(page)).toBeNull();
  });

  test('real throttling reports 3g, and the page goes slow', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'NetInfo is Chromium-only');
    await page.addInitScript(() => localStorage.removeItem('net'));
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 600,
      downloadThroughput: 50_000,
      uploadThroughput: 50_000,
      connectionType: 'cellular3g',
    });
    await gotoRel(page, '404.html');
    expect(
      await page.evaluate(
        () =>
          (navigator as Navigator & { connection?: { effectiveType: string } }).connection
            ?.effectiveType,
      ),
    ).toMatch(/^(2g|3g)$/);
    expect(await dataNet(page)).toBe('slow');
  });
});

test.describe('fast path', () => {
  test('nothing is touched and the hero loads at once', async ({ page }) => {
    await gotoRel(page, PAGE);
    await page.waitForLoadState('load');
    const server = builtHtml(PAGE);

    expect(await dataNet(page)).toBeNull();
    expect(await page.locator('[data-net-state], [data-sizes]').count()).toBe(0);
    expect(await sizesOf(page)).toEqual(await sizesOf(page, server));

    // The hero ships lazy and the head script promotes it before anything is fetched.
    const hero = page.locator(HERO);
    expect(server).toMatch(/data-net-img="priority" loading="lazy"/);
    await expect(hero).toHaveJSProperty('loading', 'eager');
    await expect.poll(() => painted(hero)).toBe(true);
    const timing = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const image = document.querySelector<HTMLImageElement>('#case-hero img')!;
      const entry = performance.getEntriesByName(image.currentSrc).at(-1)!;
      return { start: entry.startTime, dcl: nav.domContentLoadedEventStart };
    });
    expect(timing.start).toBeLessThanOrEqual(timing.dcl);
  });

  test('the /work/ lead loads at once, at full quality', async ({ page }) => {
    await gotoRel(page, 'work/');
    await page.waitForLoadState('load');
    const lead = page.locator('.lead:not([hidden]) .lead__img').first();
    await expect(lead).toHaveJSProperty('loading', 'eager');
    await expect.poll(() => painted(lead)).toBe(true);
    expect(await stateOf(lead)).toBeUndefined();
    const pick = await shown(lead);
    expect(pick.w / pick.rendered).toBeGreaterThanOrEqual(
      0.85 * Math.min(pick.dpr, pick.top / pick.rendered),
    );
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('the hero loads at full quality', async ({ page }) => {
      await gotoRel(page, PAGE);
      await page.waitForLoadState('load');
      const hero = page.locator(HERO);
      await expect.poll(() => painted(hero)).toBe(true);
      const pick = await shown(hero);
      expect(pick.w).toBeGreaterThan(LITE_MAX);
      expect(pick.w / pick.rendered).toBeGreaterThanOrEqual(
        0.85 * Math.min(pick.dpr, pick.top / pick.rendered),
      );
    });
  });
});

test.describe('slow path', () => {
  test('light first, then full, one at a time, with no blank frame and no shift', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(90_000);
    await forceNet(page, 'slow');
    await page.addInitScript(() => {
      window.__netIdle = 0;
      document.addEventListener('net:idle', () => window.__netIdle!++);
      window.__netShifts = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & {
          value: number;
          sources?: { node?: Node | null }[];
        })[]) {
          window.__netShifts!.push({
            value: entry.value,
            at: entry.startTime,
            sources: (entry.sources ?? []).map((s) => s.node?.nodeName ?? '#'),
          });
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    const server = builtHtml(PAGE);
    const widths = srcsetWidths(server);
    const { release, log } = await holdFullImages(page, widths);
    const inFlight = new Set<string>();
    let mostInFlight = 0;
    page.on('request', (r) => {
      const width = widths.get(new URL(r.url()).pathname);
      if (width === undefined || width <= LITE_MAX) return;
      inFlight.add(r.url());
      mostInFlight = Math.max(mostInFlight, inFlight.size);
    });
    page.on('requestfinished', (r) => inFlight.delete(r.url()));
    page.on('requestfailed', (r) => inFlight.delete(r.url()));

    await gotoRel(page, PAGE);
    await page.waitForLoadState('load');
    await expect(page.locator('html')).toHaveAttribute('data-net', 'slow');
    const hero = page.locator(HERO);
    await hero.scrollIntoViewIfNeeded();

    // Before the full file arrives: the light one is painted, and the page is busy upgrading.
    await expect.poll(() => painted(hero)).toBe(true);
    await expect.poll(() => log.some((entry) => entry.held)).toBe(true);
    expect(await stateOf(hero)).toMatch(/^(lite|loading)$/);
    expect((await shown(hero)).w).toBeLessThanOrEqual(LITE_MAX);
    await expect(page.locator('html')).toHaveAttribute('data-net-busy', '');
    const box = () =>
      page.evaluate(() => {
        const frame = document.querySelector('#case-hero')!.getBoundingClientRect();
        return [frame.x, frame.y, frame.width, frame.height, document.documentElement.scrollHeight];
      });
    const before = await box();

    const paint = await watchPaint(page, hero);
    const swapFrom = await page.evaluate(() => performance.now());
    release();
    await expect.poll(() => stateOf(hero), { timeout: 30_000 }).toBe('full');
    await page.waitForTimeout(300);
    const { frames, blank } = await paint.stop();
    test
      .info()
      .annotations.push({ type: 'frames', description: `${frames} frames, ${blank} blank` });
    expect(frames).toBeGreaterThan(0);
    expect(blank).toBe(0);

    // Settled: full quality, the authored `sizes` back, nothing moved.
    expect((await shown(hero)).w).toBeGreaterThan(LITE_MAX);
    expect(await painted(hero)).toBe(true);
    expect(await box()).toEqual(before);
    expect(await sizesOf(page, undefined, '#case-hero')).toEqual(
      await sizesOf(page, server, '#case-hero'),
    );
    // Then the queue drains (figures that were near enough to load are upgraded too).
    await expect(page.locator('html')).not.toHaveAttribute('data-net-busy', { timeout: 20_000 });
    expect(await page.evaluate(() => window.__netIdle)).toBeGreaterThanOrEqual(1);
    if (browserName === 'chromium') {
      // Only the swap and what follows it (fonts and the like may still settle before it).
      const shifts = ((await page.evaluate(() => window.__netShifts)) ?? []).filter(
        (shift) => shift.at >= swapFrom,
      );
      expect(
        shifts.reduce((sum, shift) => sum + shift.value, 0),
        `layout shifts after the swap: ${JSON.stringify(shifts)}`,
      ).toBeLessThan(0.001);
    }

    // Order: the first image requested was light, and the first full one was the hero's.
    const requested = log.filter((entry) => entry.width !== undefined);
    expect(requested[0]?.held).toBe(false);
    const firstFull = requested.find((entry) => entry.held);
    expect(firstFull).toBeDefined();
    expect(await candidatePaths(hero)).toContain(firstFull!.path);
    expect(mostInFlight).toBeLessThanOrEqual(1);
  });

  test('a figure scrolled in afterwards is light first too, then full', async ({ page }) => {
    test.setTimeout(60_000);
    await forceNet(page, 'slow');
    const widths = serverWidths(FIGURES_PAGE);
    await gotoRel(page, FIGURES_PAGE);
    await page.waitForLoadState('load');
    await expect(page.locator('html')).not.toHaveAttribute('data-net-busy', { timeout: 20_000 });
    const figure = page.locator(LAST_FIGURE).last();
    expect(await stateOf(figure)).toBe('lite');
    const own = await candidatePaths(figure);
    const requested: number[] = [];
    page.on('request', (r) => {
      const path = new URL(r.url()).pathname;
      if (own.has(path)) requested.push(widths.get(path) ?? 0);
    });
    await figure.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect.poll(() => stateOf(figure), { timeout: 30_000 }).toBe('full');
    expect(requested.length).toBeGreaterThanOrEqual(2);
    expect(requested[0]).toBeLessThanOrEqual(LITE_MAX);
    expect(requested.at(-1)).toBeGreaterThan(LITE_MAX);
  });

  // A reset or timed-out connection on a bad link rarely fires `online`, so a failed upgrade is
  // queued again on its own instead of leaving the image at its light file for good.
  test('an upgrade whose first fetch fails is tried again until it lands', async ({ page }) => {
    test.setTimeout(60_000);
    await forceNet(page, 'slow');
    const widths = serverWidths(PAGE);
    const attempts = new Map<string, number>();
    await page.route(IMAGE_URL, async (route) => {
      const path = new URL(route.request().url()).pathname;
      const width = widths.get(path);
      if (width !== undefined && width > LITE_MAX) {
        const n = (attempts.get(path) ?? 0) + 1;
        attempts.set(path, n);
        if (n === 1) return route.abort('connectionreset');
      }
      await route.continue();
    });
    await gotoRel(page, PAGE);
    await page.waitForLoadState('load');

    const hero = page.locator(HERO);
    await expect.poll(() => stateOf(hero), { timeout: 30_000 }).toBe('full');
    expect((await shown(hero)).w).toBeGreaterThan(LITE_MAX);
    expect(await painted(hero)).toBe(true);
    // Every full file that was reset was asked for again, and the page still drained its queue.
    expect(attempts.size).toBeGreaterThan(0);
    await expect
      .poll(() => [...attempts.values()].every((n) => n >= 2), { timeout: 30_000 })
      .toBe(true);
    await expect(page.locator('html')).not.toHaveAttribute('data-net-busy', { timeout: 30_000 });
  });

  test.describe('Save-Data mode', () => {
    test.skip(({ browserName }) => isWindowsWebKit(browserName), WINDOWS_WEBKIT.media);

    test('never upgrades, and no loop starts by itself', async ({ page }) => {
      await forceNet(page, 'save');
      await gotoRel(page, 'work/trip-planner/');
      await page.waitForLoadState('load');
      await expect(page.locator('html')).toHaveAttribute('data-net', 'save');
      await page.waitForTimeout(SETTLE_MS);

      const hero = page.locator(HERO);
      await expect.poll(() => painted(hero)).toBe(true);
      const states = await page
        .locator('img[data-net-state]')
        .evaluateAll((all) => all.map((el) => (el as HTMLImageElement).dataset.netState));
      expect(states.length).toBeGreaterThan(0);
      expect([...new Set(states)]).toEqual(['lite']);
      expect(await page.locator('[data-sizes]').count()).toBeGreaterThan(0);
      await expect(page.locator('html')).not.toHaveAttribute('data-net-busy');

      const loop = page.locator('[data-video][data-autoplay]').first();
      const video = loop.locator('video');
      await video.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.waitForTimeout(SETTLE_MS);
      expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
      await expect(loop.getByRole('button')).toHaveAccessibleName('Play video');
      // Play still works at once.
      await loop.getByRole('button').click();
      await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
    });
  });
});

test.describe('measured verdict', () => {
  /** The unpinned page, its images held back 4 s until `ease()` (a slow connection that the
      browser doesn't report), loaded until the stall has been noticed. */
  async function stalledPage(page: Page) {
    await fakeConnection(page, undefined);
    // The mode when parsing ends: on a fast machine the first big upgrade then clears the verdict.
    await page.addInitScript(() =>
      document.addEventListener('DOMContentLoaded', () => {
        window.__netAtParse = document.documentElement.dataset.net ?? null;
      }),
    );
    const widths = serverWidths(FIGURES_PAGE);
    let delay = 4000;
    await page.route(IMAGE_URL, async (route) => {
      if (delay > 0 && widths.has(new URL(route.request().url()).pathname)) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      await route.continue();
    });
    await gotoRel(page, FIGURES_PAGE);
    await expect(page.locator('html')).toHaveAttribute('data-net', 'slow', { timeout: 20_000 });
    delay = 0;
    await page.waitForLoadState('load');
    return widths;
  }

  test('a stalled hero marks the tab slow, and what is still to load goes light first', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const widths = await stalledPage(page);
    expect(await page.evaluate(() => sessionStorage.getItem('net'))).toBe('slow');

    // A figure that was waiting for its turn now loads a light candidate first.
    const figure = page.locator(LAST_FIGURE).last();
    const own = await candidatePaths(figure);
    const requested: number[] = [];
    page.on('request', (r) => {
      const path = new URL(r.url()).pathname;
      if (own.has(path)) requested.push(widths.get(path) ?? 0);
    });
    await figure.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect.poll(() => stateOf(figure), { timeout: 30_000 }).toBe('full');
    expect(requested[0]).toBeLessThanOrEqual(LITE_MAX);
    expect(requested.at(-1)).toBeGreaterThan(LITE_MAX);
  });

  test('the verdict holds across a reload', async ({ page }) => {
    test.setTimeout(90_000);
    await stalledPage(page);
    await page.reload();
    // Slow from the first parse (before any upgrade could prove otherwise), without a stall.
    expect(await page.evaluate(() => window.__netAtParse)).toBe('slow');
  });

  test('a pinned mode is never overridden by a stall', async ({ page }) => {
    test.setTimeout(60_000);
    await forceNet(page, 'fast');
    const widths = serverWidths(PAGE);
    await page.route(IMAGE_URL, async (route) => {
      if (widths.has(new URL(route.request().url()).pathname)) {
        await new Promise((resolve) => setTimeout(resolve, 3500));
      }
      await route.continue();
    });
    await gotoRel(page, PAGE);
    await page.waitForLoadState('load');
    await page.waitForTimeout(500);
    expect(await dataNet(page)).toBeNull();
    expect(await page.evaluate(() => sessionStorage.getItem('net'))).toBeNull();
  });

  test('a fast, large fetch clears a stored verdict', async ({ page, browser, baseURL }) => {
    test.setTimeout(60_000);
    // Timing a fetch needs its size: an engine that reports 0 for an image (Windows WebKit
    // does) can't recover a verdict, and a tab that went slow stays so, upgrading as usual.
    // Probed in a context of its own, so the page below finds nothing in the HTTP cache.
    const probe = await browser.newContext({ baseURL: baseURL! });
    const probePage = await probe.newPage();
    await gotoRel(probePage, PAGE);
    await probePage.waitForLoadState('load');
    const sizeHidden = await probePage.evaluate(() => {
      const hero = document.querySelector<HTMLImageElement>('#case-hero img')!;
      const entry = performance.getEntriesByName(hero.currentSrc).at(-1);
      return (entry as PerformanceResourceTiming | undefined)?.transferSize === 0;
    });
    await probe.close();
    test.skip(sizeHidden, 'Resource Timing reports no size for images here');

    await fakeConnection(page, undefined);
    await page.addInitScript(() => {
      sessionStorage.setItem('net', 'slow');
      window.__netChanges = 0;
      document.addEventListener('net:change', () => window.__netChanges!++);
    });
    await gotoRel(page, PAGE);
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem('net')), { timeout: 30_000 })
      .toBeNull();
    await expect(page.locator('html')).not.toHaveAttribute('data-net');
    await expect.poll(() => page.locator('[data-sizes]').count()).toBe(0);
    // It was slow when the page loaded, and one change took it back.
    expect(await page.evaluate(() => window.__netChanges)).toBe(1);
    expect(await painted(page.locator(HERO))).toBe(true);
  });
});

test.describe('pixel density', () => {
  /** An image shown at 2× or 3× gets a candidate within 15% of what the display can use
      (the density it would need, or the whole master when that is less). */
  const covers = async (img: Locator) => {
    await img.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect.poll(() => painted(img), { timeout: 15_000 }).toBe(true);
    const pick = await shown(img);
    expect(pick.rendered).toBeGreaterThan(0);
    expect(pick.w / pick.rendered).toBeGreaterThanOrEqual(
      0.85 * Math.min(pick.dpr, pick.top / pick.rendered),
    );
  };

  test.describe('desktop at 2×', () => {
    test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    test.beforeEach(({ browserName }) => {
      test.skip(browserName !== 'chromium', 'WebKit runs at 1× (playwright.config.ts)');
    });

    test('the case hero', async ({ page }) => {
      await gotoRel(page, PAGE);
      await covers(page.locator(HERO));
    });

    test('the home lead card', async ({ page }) => {
      await gotoRel(page, '');
      await covers(page.locator('.card--lead .card__img'));
    });

    test('the /work/ lead', async ({ page }) => {
      await gotoRel(page, 'work/');
      await covers(page.locator('.lead:not([hidden]) .lead__img').first());
    });
  });

  test.describe('phone at 3×', () => {
    test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
    test.beforeEach(({ browserName }) => {
      test.skip(browserName !== 'chromium', 'WebKit runs at 1× (playwright.config.ts)');
    });

    test('the reel cover', async ({ page }) => {
      await gotoRel(page, '');
      await covers(page.locator('.m-reel__cover').first());
    });
  });
});
