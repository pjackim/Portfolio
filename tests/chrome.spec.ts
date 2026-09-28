/**
 * Site chrome from the Claude Design mockup (Portfolio.dc.html, Sept 2026): the theme switch
 * pill (ThemeToggle.astro) and the global scrollbar rules (global.css). The switch's knob sits
 * on the scheme in use and its icon is lit; the press contract (`data-next`, "Switch to …"
 * label) is smoke.spec's. Scrollbars are a slim 8px gutter on fine pointers — reserved even when
 * the page doesn't overflow, so a late scrollbar never shifts the layout — and gone on touch.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { themeToggle } from './helpers/header.ts';
import { gotoRel } from './helpers/routes.ts';

type Scheme = 'light' | 'dark';

/** Which icon the knob is parked on: the one whose centre is nearer the knob's centre. */
const knobOn = (toggle: Locator): Promise<Scheme> =>
  toggle.evaluate((button) => {
    const centre = (selector: string): number => {
      const box = button.querySelector(selector)!.getBoundingClientRect();
      return box.left + box.width / 2;
    };
    const knob = centre('.theme-toggle__knob');
    const sun = Math.abs(knob - centre('.theme-toggle__icon--sun'));
    const moon = Math.abs(knob - centre('.theme-toggle__icon--moon'));
    return sun < moon ? 'light' : 'dark';
  });

const iconColour = (toggle: Locator, which: 'sun' | 'moon'): Promise<string> =>
  toggle.locator(`.theme-toggle__icon--${which}`).evaluate((el) => getComputedStyle(el).color);

/** Width the root scrollbar gutter takes from the layout. */
const reservedGutter = (page: Page): Promise<number> =>
  page.evaluate(() =>
    Math.round(innerWidth - document.documentElement.getBoundingClientRect().width),
  );

test.describe('theme switch pill', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const scheme of ['light', 'dark'] as const) {
    const other: Scheme = scheme === 'light' ? 'dark' : 'light';

    test(`${scheme} system: sun left, moon right, knob and lit icon on the scheme in use`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await gotoRel(page, '');
      const toggle = themeToggle(page);
      await expect(toggle).toBeVisible();

      const sun = await toggle.locator('.theme-toggle__icon--sun').boundingBox();
      const moon = await toggle.locator('.theme-toggle__icon--moon').boundingBox();
      expect(sun!.x + sun!.width).toBeLessThanOrEqual(moon!.x);
      expect(await knobOn(toggle)).toBe(scheme);
      await expect(toggle).toHaveAttribute('data-next', other);
      const lit = scheme === 'light' ? 'sun' : 'moon';
      const unlit = scheme === 'light' ? 'moon' : 'sun';
      expect(await iconColour(toggle, lit)).not.toBe(await iconColour(toggle, unlit));

      await toggle.click();
      await expect(page.locator('html')).toHaveAttribute('data-scheme', other);
      await expect.poll(() => knobOn(toggle)).toBe(other);
      await expect(toggle).toHaveAttribute('aria-label', `Switch to ${scheme} theme`);
      // Reduced motion: no slide. (The global safety net's 0.01ms transitions may still be
      // registered for a moment; nothing longer is.)
      expect(
        await toggle
          .locator('.theme-toggle__knob')
          .evaluate((el) =>
            el.getAnimations().every((a) => Number(a.effect?.getTiming().duration ?? 0) <= 1),
          ),
      ).toBe(true);
    });
  }

  test('follows the system scheme live while unpinned', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await gotoRel(page, '');
    const toggle = themeToggle(page);
    await expect.poll(() => knobOn(toggle)).toBe('light');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(() => knobOn(toggle)).toBe('dark');
    await expect(toggle).toHaveAttribute('aria-label', 'Switch to light theme');
  });

  test('a full 44px-tall target, and revealing it shifts nothing', async ({ page }) => {
    await gotoRel(page, '');
    const toggle = themeToggle(page);
    const box = (await toggle.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(24);
    // The slot reserves the revealed button's box: hiding it again moves nothing around it.
    const moved = await toggle.evaluate((button) => {
      const slot = button.parentElement!;
      const neighbour = slot.previousElementSibling ?? slot.parentElement!;
      const before = [slot, neighbour].map((el) => el.getBoundingClientRect().toJSON());
      (button as HTMLButtonElement).hidden = true;
      const after = [slot, neighbour].map((el) => el.getBoundingClientRect().toJSON());
      (button as HTMLButtonElement).hidden = false;
      return JSON.stringify(before) === JSON.stringify(after);
    });
    expect(moved).toBe(true);
  });
});

test.describe('scrollbars', () => {
  test('fine pointer: an 8px gutter, reserved before the page overflows too', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Classic scrollbars: desktop Chromium only.');
    await gotoRel(page, 'work/');
    expect(await page.evaluate(() => matchMedia('(pointer: fine)').matches)).toBe(true);
    // The standard properties would switch Chromium's ::-webkit-scrollbar styling off.
    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarColor),
    ).toBe('auto');
    expect(await reservedGutter(page)).toBe(8);
    await page.evaluate(() => {
      document.querySelector('main')!.style.display = 'none';
    });
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
      true,
    );
    expect(await reservedGutter(page)).toBe(8);
  });

  test('touch screens: no scrollbar and no gutter', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'chromium', 'Touch devices only.');
    await gotoRel(page, '');
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    await expect(page.locator('html')).toHaveCSS('scrollbar-width', 'none');
    // Pixel 7's device-pixel rounding can leave a 1px sliver.
    expect(await reservedGutter(page)).toBeLessThanOrEqual(1);
  });
});
