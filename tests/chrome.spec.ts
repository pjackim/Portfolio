/**
 * Site chrome as deployed: the theme switch (ThemeToggle.astro) and the global scrollbar rules
 * (global.css). The switch is one 36px icon button inside a 44px hit area. It shows the scheme it
 * switches *to* — a moon while the page is light, a sun while it is dark — matching its label;
 * it is rendered hidden until the theme script runs, in a slot that reserves its box; and it
 * follows the system scheme live until the visitor pins one. (The press contract — `data-next`,
 * "Switch to …", persistence across a reload — is smoke.spec's; the sweep transition is
 * interactions.spec's.) Scrollbars are thin, in the site's colours, with the gutter reserved
 * before the page overflows, so a late scrollbar never shifts the layout; touch browsers paint
 * overlay scrollbars, which take no gutter.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { themeToggle } from './helpers/header.ts';
import { gotoRel } from './helpers/routes.ts';

type Scheme = 'light' | 'dark';

const other = (scheme: Scheme): Scheme => (scheme === 'light' ? 'dark' : 'light');
const iconOf = (scheme: Scheme) => `.theme-toggle__icon--${scheme === 'light' ? 'sun' : 'moon'}`;

/** The scheme the switch offers: the one icon on show (`null` if both or neither are). */
const offers = (toggle: Locator): Promise<Scheme | null> =>
  toggle.evaluate((button) => {
    const shown = (which: string) =>
      getComputedStyle(button.querySelector(`.theme-toggle__icon--${which}`)!).display !== 'none';
    const sun = shown('sun');
    const moon = shown('moon');
    if (sun === moon) return null;
    return sun ? 'light' : 'dark';
  });

/** Width the root scrollbar gutter takes from the layout. */
const reservedGutter = (page: Page): Promise<number> =>
  page.evaluate(() =>
    Math.round(innerWidth - document.documentElement.getBoundingClientRect().width),
  );

test.describe('theme switch', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const scheme of ['light', 'dark'] as const) {
    const next = other(scheme);

    test(`${scheme} system: the icon and label offer ${next}; a press takes it and offers ${scheme} back`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await gotoRel(page, '');
      const toggle = themeToggle(page);
      await expect(toggle).toBeVisible();
      await expect(toggle).toHaveAttribute('data-next', next);
      await expect(toggle).toHaveAttribute('aria-label', `Switch to ${next} theme`);
      expect(await offers(toggle)).toBe(next);
      await expect(toggle.locator(iconOf(next))).toBeVisible();
      await expect(toggle.locator(iconOf(scheme))).toBeHidden();

      await toggle.click();
      await expect(page.locator('html')).toHaveAttribute('data-scheme', next);
      await expect(toggle).toHaveAttribute('data-next', scheme);
      await expect(toggle).toHaveAttribute('aria-label', `Switch to ${scheme} theme`);
      await expect.poll(() => offers(toggle)).toBe(scheme);
      await expect(toggle.locator(iconOf(scheme))).toBeVisible();
    });
  }

  test('follows the system scheme live while unpinned', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await gotoRel(page, '');
    const toggle = themeToggle(page);
    await expect(toggle).toHaveAttribute('data-next', 'dark');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(toggle).toHaveAttribute('data-next', 'light');
    await expect(toggle).toHaveAttribute('aria-label', 'Switch to light theme');
    await expect.poll(() => offers(toggle)).toBe('light');
    // Following isn't pinning.
    await expect(page.locator('html')).not.toHaveAttribute('data-scheme');
  });

  test('a 36px button in a 44px hit area, and revealing it shifts nothing', async ({ page }) => {
    await gotoRel(page, '');
    const toggle = themeToggle(page);
    const box = (await toggle.boundingBox())!;
    expect(Math.round(box.width)).toBe(36);
    expect(Math.round(box.height)).toBe(36);
    // The hit area (a pseudo-element) reaches 4px past the visual box on every side.
    const hits = await toggle.evaluate((button, b) => {
      const at = (x: number, y: number) => button.contains(document.elementFromPoint(x, y));
      const mid = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
      return {
        start: at(b.x - 3, mid.y),
        end: at(b.x + b.width + 2, mid.y),
        top: at(mid.x, b.y - 3),
        bottom: at(mid.x, b.y + b.height + 2),
      };
    }, box);
    expect(hits).toEqual({ start: true, end: true, top: true, bottom: true });
    // The slot reserves the revealed button's box: hiding it again moves nothing around it.
    const still = await toggle.evaluate((button) => {
      const slot = button.parentElement!;
      const neighbour = slot.previousElementSibling ?? slot.parentElement!;
      const before = [slot, neighbour].map((el) => el.getBoundingClientRect().toJSON());
      (button as HTMLButtonElement).hidden = true;
      const after = [slot, neighbour].map((el) => el.getBoundingClientRect().toJSON());
      (button as HTMLButtonElement).hidden = false;
      return JSON.stringify(before) === JSON.stringify(after);
    });
    expect(still).toBe(true);
  });
});

test.describe('scrollbars', () => {
  test('fine pointer: thin, in the site colours, the gutter reserved before the page overflows', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Classic scrollbars: desktop Chromium only.');
    await gotoRel(page, 'work/');
    expect(await page.evaluate(() => matchMedia('(pointer: fine)').matches)).toBe(true);
    const html = page.locator('html');
    await expect(html).toHaveCSS('scrollbar-width', 'thin');
    await expect(html).toHaveCSS('scrollbar-gutter', 'stable');
    // Two colours (thumb, track), not the browser's defaults.
    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarColor),
    ).toMatch(/^\S+\(.+\) \S+\(.+\)$/);
    const gutter = await reservedGutter(page);
    expect(gutter).toBeGreaterThan(0);
    // The same gutter once the page no longer overflows.
    await page.evaluate(() => {
      document.querySelector('main')!.style.display = 'none';
    });
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
      true,
    );
    expect(await reservedGutter(page)).toBe(gutter);
  });

  test('touch screens: overlay scrollbars, no gutter', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'chromium', 'Touch devices only.');
    await gotoRel(page, '');
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    // Pixel 7's device-pixel rounding can leave a 1px sliver.
    expect(await reservedGutter(page)).toBeLessThanOrEqual(1);
  });
});
