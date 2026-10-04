/**
 * Accessibility: axe (WCAG 2.0/2.1/2.2 A + AA and best practices) finds nothing on any page,
 * in either colour scheme, with reduced motion (so scroll reveals and view transitions never
 * leave content mid-animation while it is scanned) — and again with motion allowed on a sample
 * (home, /work/, one project), once the home hero's intro has settled, so the motion layer's
 * own controls and states (the Motion toggle, the typed and rolling readouts) are covered too —
 * and again at the foot of the page, once the entrances there have played (below the fold at the
 * top, items waiting to reveal are transparent, which axe skips) and the headings in view have
 * decrypted.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { interactionsLoaded, revealsInFlightOnScreen, twoFrames } from './helpers/motion.ts';
import { isWindowsWebKit, WINDOWS_WEBKIT } from './helpers/platform.ts';
import {
  ERROR_ROUTES,
  gotoRel,
  NOT_FOUND_PAGE,
  routeName,
  ROUTES,
  VIDEO_ROUTES,
} from './helpers/routes.ts';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const PAGES = [...ROUTES, NOT_FOUND_PAGE, ...ERROR_ROUTES];
const MOTION_PAGES = ['', 'work/', 'work/credential-correlation/'];

async function axeReport(page: Page, { underHeader = false } = {}): Promise<string[]> {
  const axe = new AxeBuilder({ page }).withTags(TAGS);
  if (underHeader) {
    // Mid-scroll, a row can sit half under the fixed header; its covered part is not a tap
    // target at this scroll position (the user can scroll it clear), so axe skips it.
    await page.evaluate(() => {
      const header = document.querySelector('.site-header')?.getBoundingClientRect();
      if (!header) return;
      for (const el of document.querySelectorAll<HTMLElement>('main a, main button')) {
        const r = el.getBoundingClientRect();
        if (r.top < header.bottom && r.bottom > header.top) el.setAttribute('data-axe-skip', '');
      }
    });
    axe.exclude('[data-axe-skip]');
  }
  const { violations } = await axe.analyze();
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
      test(`${routeName(path)} has no axe violations (${colorScheme})`, async ({
        page,
        browserName,
      }) => {
        test.skip(
          isWindowsWebKit(browserName) && VIDEO_ROUTES.includes(path),
          WINDOWS_WEBKIT.media,
        );
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
          // The hero's chip (hidden on phones, where the footer's is the control).
          const chip = page.locator('[data-motion-toggle]').locator('visible=true').first();
          await expect(chip).toBeVisible({ timeout: 10_000 });
        }
        expect(await axeReport(page), 'axe violations (rule id + targets)').toEqual([]);
        // The heading code (if the page has headings) must be in before the jump, so the
        // headings at the foot do play; then two frames for the observers to fire.
        if ((await page.locator('[data-section-heading]').count()) > 0) {
          await expect.poll(() => interactionsLoaded(page)).toBe(true);
        }
        await page.evaluate(() =>
          scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
        );
        await twoFrames(page);
        await expect(page.locator('.section-heading__decrypt')).toHaveCount(0, { timeout: 3000 });
        await expect.poll(() => revealsInFlightOnScreen(page), { timeout: 3000 }).toBe(0);
        expect(
          await axeReport(page, { underHeader: true }),
          'axe violations at the foot (rule id + targets)',
        ).toEqual([]);
      });
    }
  });
}
