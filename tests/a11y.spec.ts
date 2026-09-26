/**
 * Accessibility: axe (WCAG 2.0/2.1/2.2 A + AA and best practices) finds nothing on any page,
 * in either colour scheme, with reduced motion (so scroll reveals and view transitions never
 * leave content mid-animation while it is scanned) — and again with motion allowed on a sample
 * (home, /work/, one case study), once the home hero's intro has settled, so the motion layer's
 * own controls and states (the Motion toggle, the typed and rolling readouts) are covered too —
 * and again at the foot of the page, where every scroll reveal has landed (below the fold at the
 * top they are still transparent, which axe skips) and the headings in view have decrypted.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { gotoRel, NOT_FOUND_PAGE, routeName, ROUTES } from './helpers/routes.ts';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const PAGES = [...ROUTES, NOT_FOUND_PAGE];
const MOTION_PAGES = ['', 'work/', 'work/credential-correlation/'];

async function axeReport(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return violations.map(
    (v) =>
      `${v.id} (${v.impact ?? 'n/a'}): ${v.help}\n` +
      v.nodes.map((n) => `    ${n.target.join(' ')}`).join('\n'),
  );
}

for (const colorScheme of ['dark', 'light'] as const) {
  test.describe(`${colorScheme} scheme`, () => {
    test.use({ colorScheme, reducedMotion: 'reduce' });

    for (const path of PAGES) {
      test(`${routeName(path)} has no axe violations (${colorScheme})`, async ({ page }) => {
        await gotoRel(page, path);
        await page.waitForLoadState('load');
        expect(await axeReport(page), 'axe violations (rule id + targets)').toEqual([]);
      });
    }
  });

  test.describe(`${colorScheme} scheme, motion allowed`, () => {
    test.use({ colorScheme, reducedMotion: 'no-preference' });

    for (const path of MOTION_PAGES) {
      test(`${routeName(path)} has no axe violations (${colorScheme}, motion)`, async ({
        page,
      }) => {
        await gotoRel(page, path);
        await page.waitForLoadState('load');
        if (path === '') {
          // Scan the settled hero, not a frame of the intro.
          await expect(page.locator('[data-focus-line]')).toHaveAttribute('data-state', 'done', {
            timeout: 10_000,
          });
          await expect(page.locator('.hero [data-motion-toggle]')).toBeVisible();
        }
        expect(await axeReport(page), 'axe violations (rule id + targets)').toEqual([]);
        await page.evaluate(() =>
          scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
        );
        // Let any decrypt that just started land (≤ 700 ms) and its layer go.
        await expect(page.locator('.section-heading__decrypt')).toHaveCount(0, { timeout: 3000 });
        await page.waitForTimeout(800);
        await expect(page.locator('.section-heading__decrypt')).toHaveCount(0);
        expect(await axeReport(page), 'axe violations at the foot (rule id + targets)').toEqual([]);
      });
    }
  });
}
