/**
 * Accessibility: axe (WCAG 2.0/2.1/2.2 A + AA and best practices) finds nothing on any page,
 * in either colour scheme, with reduced motion (so scroll reveals and view transitions never
 * leave content mid-animation while it is scanned).
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { gotoRel, NOT_FOUND_PAGE, routeName, ROUTES } from './helpers/routes.ts';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const PAGES = [...ROUTES, NOT_FOUND_PAGE];

for (const colorScheme of ['dark', 'light'] as const) {
  test.describe(`${colorScheme} scheme`, () => {
    test.use({ colorScheme, reducedMotion: 'reduce' });

    for (const path of PAGES) {
      test(`${routeName(path)} has no axe violations (${colorScheme})`, async ({ page }) => {
        await gotoRel(page, path);
        await page.waitForLoadState('load');
        const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
        const report = violations.map(
          (v) =>
            `${v.id} (${v.impact ?? 'n/a'}): ${v.help}\n` +
            v.nodes.map((n) => `    ${n.target.join(' ')}`).join('\n'),
        );
        expect(report, 'axe violations (rule id + targets)').toEqual([]);
      });
    }
  });
}
