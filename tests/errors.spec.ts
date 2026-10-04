/**
 * Error screens (src/components/ErrorScreen.astro): the 404 (`404.html`, which the host serves
 * for any missing path) and every other status built to `errors/<code>/`. Each is a noindex
 * page with one h1, the status as a readout, the request trace and a next step, and loads with
 * no console errors or CSP violations. The browser fills in the requested path (and, on the 404,
 * the closest real page) without moving anything, and the trace's pulse plays once and is gone.
 * Axe and the link check cover these pages too (a11y.spec.ts, links.spec.ts).
 */
import { expect, test, type Page } from '@playwright/test';
import { ERROR_SCREENS } from '../src/data/errors.ts';
import { gotoRel, NOT_FOUND_PAGE } from './helpers/routes.ts';

declare global {
  interface Window {
    __cspViolations?: string[];
    __shift?: number;
  }
}

const pathOf = (code: number): string => (code === 404 ? NOT_FOUND_PAGE : `errors/${code}/`);

/** Console errors, page errors and CSP violations from the next navigation on. */
async function watchErrors(page: Page): Promise<() => Promise<string[]>> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/^Failed to load resource/.test(message.text())) {
      errors.push(`console.error: ${message.text()}`);
    }
  });
  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      window.__cspViolations!.push(`${event.effectiveDirective} blocked ${event.blockedURI}`);
    });
  });
  return async () => {
    await page.waitForLoadState('load');
    const violations = await page.evaluate(() => window.__cspViolations ?? []);
    return [...errors, ...violations.map((v) => `csp: ${v}`)];
  };
}

for (const screen of ERROR_SCREENS) {
  const { code, status, title, retry, stop } = screen;

  test.describe(`${code} ${status}`, () => {
    test('is a noindex screen with its status, headline and next step', async ({ page }) => {
      const problems = await watchErrors(page);
      const response = await gotoRel(page, pathOf(code));
      if (code !== 404) expect(response?.status()).toBe(200);

      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText(title);
      await expect(page).toHaveTitle(`${code} ${status} — Parker Jackim`);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
      const policy = await page
        .locator('meta[http-equiv="content-security-policy"]')
        .getAttribute('content');
      expect(policy).not.toMatch(/unsafe-inline|unsafe-eval/);

      // The status, as the readout reels (spoken text for assistive tech) and in the panel.
      await expect(page.locator('.error__code')).toContainText(`Error ${code}, ${status}`);
      const row = (label: string) =>
        page
          .locator('.error__row')
          .filter({ has: page.locator('dt', { hasText: label }) })
          .locator('dd');
      await expect(row('Status')).toHaveText(`${code} ${status}`);
      await expect(row('Retry')).toHaveText(retry ? 'Yes' : 'No');
      await expect(row('Stopped at')).toHaveText(
        { request: 'Request', server: 'Server', page: 'Page' }[stop],
      );
      await expect(page.locator('.trace')).toHaveAttribute('aria-label', /\S/);

      // One way home, and one way on: a retry for a status that may pass, the work otherwise.
      await expect(page.locator('.error__actions a[href="/Portfolio/"]')).toHaveCount(1);
      if (retry) {
        await expect(page.locator('.error__actions a[href=""]')).toHaveText('Try again');
      } else {
        await expect(page.locator('.error__actions a[href="/Portfolio/work/"]')).toHaveCount(1);
      }

      expect(await problems()).toEqual([]);
    });

    test('shows the requested path', async ({ page }) => {
      await gotoRel(page, pathOf(code));
      const row = page.locator('.error__row[data-live]');
      await expect(row).toHaveAttribute('data-ready', '');
      await expect(row.locator('dd')).toHaveText(`/Portfolio/${pathOf(code)}`);
    });
  });
}

test.describe('the 404 offers the closest real page', () => {
  const link = (page: Page) => page.locator('[data-suggest-link]');

  test('for a mistyped project name', async ({ page }) => {
    await gotoRel(page, 'work/credential-corelation/');
    await expect(page.locator('h1')).toHaveText('Page not found.');
    await expect(link(page)).toBeVisible();
    await expect(link(page)).toHaveAttribute('href', '/Portfolio/work/credential-correlation/');
    await expect(page.locator('.error__row[data-live] dd')).toHaveText(
      '/Portfolio/work/credential-corelation/',
    );
  });

  test('for an address cut short', async ({ page }) => {
    await gotoRel(page, 'work/credential-corr/');
    await expect(link(page)).toHaveAttribute('href', '/Portfolio/work/credential-correlation/');
  });

  test('for a mistyped page name', async ({ page }) => {
    await gotoRel(page, 'abot/');
    await expect(link(page)).toHaveAttribute('href', '/Portfolio/about/');
  });

  test('and says nothing when nothing is near', async ({ page }) => {
    await gotoRel(page, 'zzzz-nothing-like-this/');
    await expect(page.locator('.error__row[data-live]')).toHaveAttribute('data-ready', '');
    await expect(page.locator('[data-suggest]')).not.toHaveAttribute('data-ready');
    await expect(page.locator('[data-suggest]')).toBeHidden();
  });

  test('treats the visitor path as text, never markup', async ({ page }) => {
    await gotoRel(page, 'work/%3Cimg%20src=x%3E/');
    await expect(page.locator('.error__row[data-live] dd')).toHaveText(
      '/Portfolio/work/<img src=x>/',
    );
    await expect(page.locator('.error__row[data-live] img')).toHaveCount(0);
  });

  test('moves nothing when the browser fills in the path and the match', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'layout-shift entries are Chromium-only');
    await page.addInitScript(() => {
      window.__shift = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        })[]) {
          if (!entry.hadRecentInput) window.__shift! += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await gotoRel(page, 'work/credential-corelation/');
    await expect(link(page)).toBeVisible();
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.__shift)).toBeLessThanOrEqual(0.02);
  });
});

test.describe('the trace, motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('runs its pulse once and leaves only the finished trace', async ({ page }) => {
    await gotoRel(page, 'errors/403/');
    const names = await page.evaluate(() =>
      document.getAnimations().map((a) => (a as CSSAnimation).animationName),
    );
    expect(names).toContain('trace-pulse');
    await page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter((a) => /^trace-/.test((a as CSSAnimation).animationName))
          .map((a) => a.finished),
      ),
    );
    // The pulse stays faded out once it has arrived; it never comes back at the start.
    await expect(page.locator('.trace__pulse')).toHaveCSS('opacity', '0');
    await expect(page.locator('.trace__x')).toHaveCount(1);
    await expect(page.locator('.trace__x')).toHaveCSS('opacity', '1');
  });

  test('turns the status reels once the motion layer arrives', async ({ page }) => {
    await gotoRel(page, 'errors/500/');
    await expect(page.locator('.error [data-readouts]')).toHaveAttribute('data-roll', 'done', {
      timeout: 10_000,
    });
  });
});

test.describe('the trace, motion off', () => {
  test.use({ reducedMotion: 'reduce' });

  test('is the finished drawing, with no pulse and nothing running', async ({ page }) => {
    await gotoRel(page, 'errors/503/');
    await expect(page.locator('.trace__pulse')).toBeHidden();
    await expect(page.locator('.trace__node--server.is-failed')).toBeVisible();
    const running = await page.evaluate(
      () =>
        document.getAnimations().filter((a) => /^trace-/.test((a as CSSAnimation).animationName))
          .length,
    );
    expect(running).toBe(0);
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  for (const code of [404, 500]) {
    test(`${code} fits the width, with the status and its next step on screen`, async ({
      page,
    }) => {
      await gotoRel(page, pathOf(code));
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      await expect(page.locator('.error__code')).toBeInViewport();
      await expect(page.locator('.error__actions a').last()).toBeInViewport();
    });
  }
});
