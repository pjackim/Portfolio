/**
 * Smoke: every built page loads cleanly — 200, one h1, title + description, absolute
 * canonical under /Portfolio/, `lang="en"`, a single hashed CSP `<meta>` covering scripts and
 * styles with no `unsafe-inline`/`unsafe-eval`, and no uncaught errors, console errors or CSP
 * violations (console "Refused …" messages and `securitypolicyviolation` events). Plus the
 * home page's skip link and theme toggle, and the 404 page. `@prod` tests also run against
 * the deployed site.
 */
import { expect, test, type Page } from '@playwright/test';
import { themeToggle } from './helpers/header.ts';
import { gotoRel, prodTag, routeName, ROUTES } from './helpers/routes.ts';

declare global {
  interface Window {
    __cspViolations?: string[];
  }
}

/**
 * Browser-internal console noise, not caused by the page. Playwright's WebKit is the macOS
 * build: under iPhone emulation its native `<video controls>` UI asks for iOS-only "placard"
 * icons and logs one error per missing icon — reproducible with a bare `<video controls>`
 * on a blank page, with or without CSP, and absent in desktop WebKit.
 */
const BROWSER_NOISE = [/^Button failed to load, iconName = [\w-]+-placard, /];

/** Console text of a CSP block: WebKit says "Refused to …", Chromium "… violates the
    following Content Security Policy directive …". */
const CSP_CONSOLE = /Refused|Content Security Policy/i;

/**
 * Records page errors, console errors and CSP violations from the next navigation on.
 * `missingDocument`: the absolute URL of a page expected to answer 404 — only the browser's
 * own "Failed to load resource" error for that document is ignored; anything else the page
 * logs is still a problem.
 */
async function watchErrors(
  page: Page,
  { missingDocument }: { missingDocument?: string } = {},
): Promise<() => Promise<string[]>> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    const text = message.text();
    const expected404 =
      missingDocument !== undefined &&
      message.location().url === missingDocument &&
      /^Failed to load resource/.test(text);
    if (expected404 || BROWSER_NOISE.some((noise) => noise.test(text))) return;
    if (message.type() === 'error' || CSP_CONSOLE.test(text)) {
      errors.push(`console.${message.type()}: ${text} (${message.location().url})`);
    }
  });
  await page.addInitScript(() => {
    const violations: string[] = [];
    window.__cspViolations = violations;
    document.addEventListener('securitypolicyviolation', (event) => {
      violations.push(`${event.effectiveDirective} blocked ${event.blockedURI || 'inline'}`);
    });
  });
  return async () => {
    await page.waitForLoadState('load');
    const csp = await page.evaluate(() => window.__cspViolations ?? []);
    return [...errors, ...csp.map((v) => `csp: ${v}`)];
  };
}

for (const route of ROUTES) {
  test(`${routeName(route)} loads cleanly${prodTag(route)}`, async ({ page }) => {
    const problems = await watchErrors(page);
    const response = await gotoRel(page, route);
    expect(response?.status()).toBe(200);

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('h1')).toHaveCount(1);
    expect((await page.title()).trim()).not.toBe('');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S/);

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    const href = (await canonical.getAttribute('href')) ?? '';
    expect(href).toMatch(/^https:\/\//);
    expect(new URL(href).pathname).toBe(`/Portfolio/${route}`);

    // Guards the hash-based CSP itself (astro.config.ts `security.csp`): exactly one policy,
    // covering scripts and styles, with no escape hatch that would defeat the hashing.
    const csp = page.locator('meta[http-equiv="content-security-policy"]');
    await expect(csp).toHaveCount(1);
    const policy = (await csp.getAttribute('content')) ?? '';
    expect(policy).toMatch(/(?:^|;)\s*script-src\b/);
    expect(policy).toMatch(/(?:^|;)\s*style-src\b/);
    expect(policy).not.toMatch(/unsafe-inline|unsafe-eval/);

    expect(await problems()).toEqual([]);
  });
}

test('unknown URL serves the 404 page @prod', async ({ page, baseURL }) => {
  const missing = 'no-such-page/';
  const problems = await watchErrors(page, { missingDocument: new URL(missing, baseURL).href });
  const response = await gotoRel(page, missing);
  expect(response?.status()).toBe(404);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  // Base-absolute links still lead back into the site from any missing path.
  await expect(page.locator('main a[href="/Portfolio/work/"]')).toHaveCount(1);
  expect(await problems()).toEqual([]);
});

test.describe('home', () => {
  test.use({ colorScheme: 'light' });

  test('first Tab focuses a visible skip link with a focus ring', async ({ page, browserName }) => {
    await gotoRel(page, '');
    // Safari moves between links with Option+Tab (plain Tab only visits form controls
    // unless the user opts in), so that is the first keystroke there.
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
    const skip = page.locator('a.skip-link');
    await expect(skip).toBeFocused();
    await expect(skip).toHaveAttribute('href', '#main');
    await expect(skip).toBeVisible();
    await expect(skip).toBeInViewport({ ratio: 1 });
    const outline = await skip.evaluate((el) => {
      const style = getComputedStyle(el);
      return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });
    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThan(0);
  });

  test('theme toggle flips data-scheme and persists across reload', async ({ page }) => {
    await gotoRel(page, '');
    const html = page.locator('html');
    await expect(html).not.toHaveAttribute('data-scheme');

    await themeToggle(page).click();
    await expect(html).toHaveAttribute('data-scheme', 'dark');
    await page.reload();
    await expect(html).toHaveAttribute('data-scheme', 'dark');
    // (On phones the switch is in the prompt's menu, which the reload closed.)
    const toggle = themeToggle(page);
    await expect(toggle).toHaveAttribute('aria-label', 'Switch to light theme');

    // Back to the system scheme: the pin is cleared, and stays cleared.
    await toggle.click();
    await expect(html).not.toHaveAttribute('data-scheme');
    await page.reload();
    await expect(html).not.toHaveAttribute('data-scheme');
  });
});
