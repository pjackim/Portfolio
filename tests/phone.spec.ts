/**
 * The phone layout, under 40rem (Portfolio.dc.html, Claude Design, Sept 2026: "1b Terminal
 * chapters" — `isHomeMob`/`isExpMob`/`isAboutMob`/`navMob`).
 * - Header: a segmented 4-item nav (About/Experience/Work/Contact, numbered 01–04) whose active
 *   item grows and colours in; Contact opens the contact sheet directly off the home page (there
 *   is no standalone contact page). Capabilities and the résumé live in the About panel and the
 *   sticky CTA bar instead of the header.
 * - Home: the hero's full-height chapter opener, then the same four sections as scroll-snap
 *   panels (About's horizontal timeline strip, Experience's shared git-log rail, Selected work's
 *   reel cards, Contact's rows) — a sticky "Get in touch" bar opens the contact sheet, a modal
 *   with every channel that Escape closes.
 * - The ending: the bar rises in with About (never over the hero's buttons) and steps aside
 *   while Contact is on screen — hidden, not just transparent, so it takes no taps or focus —
 *   and Contact and the footer fill the last screen exactly (at a short screen, Contact
 *   scrolls and the footer follows it).
 * - /experience/: a rail of two-line rows, no graph; tapping anywhere on a row opens its skill
 *   chips; the --grep chips pin under the header while the log scrolls by.
 * - /work/: each showcase's lead is a card, and its rows carry 64px cover thumbnails.
 * - Page tops: /work/, /experience/ and /about/ start on their content (the h1 row, no intro);
 *   /capabilities/ keeps its intro. The /work/ and /experience/ chips are the same touch chip.
 * - From 40rem the panels, sticky bar and segmented nav are gone and the wordmark nav is back.
 * Runs on every project (desktop Chromium at phone size, Pixel 7, iPhone 15 / WebKit).
 */
import { expect, test, type Page } from '@playwright/test';
import { runningTransitions } from './helpers/motion.ts';
import { gotoRel } from './helpers/routes.ts';

test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

const SHEET = '#contact-sheet';
const BAR = '.m-cta';

/** Scrolls an element to the top of the snapport (under the header) or the screen's foot. */
const scrollToElement = (page: Page, selector: string, block: 'start' | 'end') =>
  page
    .locator(selector)
    .evaluate(
      (el, block) => el.scrollIntoView({ block, behavior: 'instant' }),
      block as ScrollLogicalPosition,
    );

/** Where the last screen's pieces are, in viewport px. */
const lastScreen = (page: Page) =>
  page.evaluate(() => {
    const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
    return {
      headerBottom: box('.site-header').bottom,
      contactTop: box('#contact-m').top,
      contactBottom: box('#contact-m').bottom,
      footerTop: box('.site-footer').top,
      footerBottom: box('.site-footer').bottom,
      barBottom: box('.m-cta').bottom,
      innerHeight,
      scrollY,
      maxScrollY: document.documentElement.scrollHeight - innerHeight,
    };
  });

/** Heights of the Contact panel's channel rows. */
const contactRowHeights = (page: Page) =>
  page
    .locator('.m-contact__row')
    .evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().height));

test('home: the hero, then the four sections as snap panels', async ({ page }) => {
  await gotoRel(page, '');
  await expect(page.locator('h1')).toBeVisible();
  const panels = page.locator('.mobile-home');
  await expect(panels).toBeVisible();
  const ids = await panels.locator('.m-panel').evaluateAll((els) => els.map((el) => el.id));
  expect(ids).toEqual(['about-m', 'experience-m', 'work-m', 'contact-m']);
  for (const id of ['#about', '#experience', '#work', '#contact']) {
    await expect(page.locator(id)).toBeHidden();
  }
});

test('the sticky bar opens the contact sheet, and Escape closes it', async ({ page }) => {
  await gotoRel(page, '');
  // Hidden while the hero (a full chapter of its own) is on screen; pinned once past it.
  const button = page.locator('.m-cta__primary');
  await page.locator('#about-m').scrollIntoViewIfNeeded();
  await expect(button).toBeInViewport();
  await button.click();
  const sheet = page.getByRole('dialog', { name: 'Parker Jackim' });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('a[href^="mailto:"]').first()).toBeVisible();
  await expect(sheet.getByRole('link', { name: /GitHub/ })).toBeVisible();
  await expect(sheet.getByRole('link', { name: /LinkedIn/ })).toBeVisible();
  await expect(sheet.getByRole('link', { name: /Résumé/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator(SHEET)).toBeHidden();
});

test('the segmented nav names the section and jumps to its panel', async ({ page }) => {
  await gotoRel(page, '');
  const nav = page.locator('.phone-nav');
  await expect(nav).toBeVisible();
  await expect(page.locator('.site-nav')).toBeHidden();
  const experience = nav.locator('.phone-nav__item', { hasText: 'Experience' });
  await experience.click();
  await expect(page.locator('#experience-m')).toBeInViewport();
});

test('off the home page, the current section is marked and Contact opens the sheet', async ({
  page,
}) => {
  await gotoRel(page, 'work/');
  const nav = page.locator('.phone-nav');
  await expect(nav).toBeVisible();
  await expect(nav.locator('.phone-nav__item[aria-current]')).toHaveText(/Work/);

  await nav.locator('.phone-nav__item', { hasText: 'Contact' }).click();
  await expect(page.locator(SHEET)).toBeVisible();
  await page.locator(SHEET).getByRole('button', { name: 'Close' }).click();
  await expect(page.locator(SHEET)).toBeHidden();
});

test('experience: a rail of rows, and a tap anywhere on a row opens its chips', async ({
  page,
}) => {
  await gotoRel(page, 'experience/');
  await expect(page.locator('[data-git-log][data-ready]')).toBeAttached();
  await expect(page.locator('[data-git-graph]')).toBeHidden();
  const commit = page.locator('li[data-commit]:has(button.commit__toggle)').nth(1);
  const chip = commit.locator('[data-skill]').first();
  await expect(chip).toBeHidden();
  // The row's title, not the toggle itself: the toggle's target covers the row.
  const title = (await commit.locator('.commit__title').boundingBox())!;
  await page.mouse.click(title.x + 4, title.y + title.height / 2);
  await expect(commit.locator('button.commit__toggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(chip).toBeVisible();
});

test('work: a lead card, and rows with 64px thumbnails', async ({ page }) => {
  await gotoRel(page, 'work/');
  const showcase = page.locator('[data-showcase]').first();
  await expect(showcase.locator('[data-lead]:visible')).toHaveCount(1);
  const thumb = showcase.locator('[data-project] .work-row__preview').first();
  await expect(thumb).toBeVisible();
  await expect(thumb.locator('.work-row__thumb')).toBeVisible();
  const box = (await thumb.boundingBox())!;
  expect(Math.round(box.width)).toBe(64);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test.describe('the ending', () => {
  test('the sticky bar rises in with About, never over the hero buttons', async ({ page }) => {
    await gotoRel(page, '');
    await expect(page.locator('.hero__buttons')).toBeVisible();
    // Whatever position the snap settles on, the bar's top stays at or below the buttons' foot.
    for (const top of [0, 10]) {
      await page.evaluate((top) => scrollTo({ top, behavior: 'instant' }), top);
      const [bar, buttons] = await page.evaluate(() => [
        document.querySelector('.m-cta')!.getBoundingClientRect().top,
        document.querySelector('.hero__buttons')!.getBoundingClientRect().bottom,
      ]);
      expect(bar!, `at scrollY ${top}`).toBeGreaterThanOrEqual(buttons! - 0.5);
    }
  });

  test('the sticky bar steps aside over the Contact panel and comes back above it', async ({
    page,
  }) => {
    await gotoRel(page, '');
    const bar = page.locator(BAR);
    await scrollToElement(page, '#work-m', 'start');
    await expect(bar).toBeVisible();
    await expect(bar).toHaveCSS('opacity', '1');
    await expect(bar).toBeInViewport();

    await scrollToElement(page, '#contact-m', 'start');
    // Hidden, not just transparent: no taps, no focus, nothing for a screen reader.
    await expect(bar).toBeHidden();
    await expect(bar).toHaveCSS('opacity', '0');
    await page.locator('.m-cta__primary').evaluate((el) => el.focus());
    await expect(page.locator('.m-cta__primary')).not.toBeFocused();
    // Every Contact row takes its own taps, down to the last one, where the bar used to ride.
    for (const row of await page.locator('.m-contact__row').all()) {
      const hit = await row.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const target = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return target?.closest('.m-contact__row') === el;
      });
      expect(hit).toBe(true);
    }

    await scrollToElement(page, '#work-m', 'start');
    await expect(bar).toBeVisible();
    await expect(bar).toHaveCSS('opacity', '1');
  });

  test('Shift+Tab from the Contact rows never lands on an invisible control', async ({ page }) => {
    await gotoRel(page, '');
    await scrollToElement(page, '#contact-m', 'start');
    await expect(page.locator(BAR)).toBeHidden();
    await page.locator('.m-contact__link').last().focus();
    for (let step = 0; step < 6; step++) {
      await page.keyboard.press('Shift+Tab');
      const focused = page.locator(':focus');
      await expect(focused).toBeVisible();
      expect(
        await focused.evaluate((el) =>
          el.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
        ),
        `step ${step + 1}`,
      ).toBe(true);
    }
  });

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 412, height: 915 },
  ]) {
    test.describe(`${viewport.width}×${viewport.height}`, () => {
      test.use({ viewport });

      test('the Contact panel and the footer fill the last screen exactly', async ({ page }) => {
        await gotoRel(page, '');
        await scrollToElement(page, '#contact-m', 'start');
        await expect
          .poll(async () => {
            const s = await lastScreen(page);
            return {
              contactUnderHeader: Math.abs(s.contactTop - s.headerBottom) <= 2,
              footerRightAfter: Math.abs(s.footerTop - s.contactBottom) <= 1,
              footerAtScreenFoot: Math.abs(s.footerBottom - s.innerHeight) <= 2,
              pageEnd: Math.abs(s.scrollY - s.maxScrollY) <= 2,
              barBehindHeader: s.barBottom <= s.headerBottom + 1,
            };
          })
          .toEqual({
            contactUnderHeader: true,
            footerRightAfter: true,
            footerAtScreenFoot: true,
            pageEnd: true,
            barBehindHeader: true,
          });
        await expect(page.locator(BAR)).toBeHidden();
        // The rows take the spare height, each between 64 and 96px.
        for (const height of await contactRowHeights(page)) {
          expect(height).toBeGreaterThanOrEqual(63.5);
          expect(height).toBeLessThanOrEqual(96.5);
        }
      });
    });
  }

  test.describe('short screens', () => {
    test.use({ viewport: { width: 360, height: 640 } });

    test('at 360×640 Contact scrolls, its rows whole, and the footer follows it', async ({
      page,
    }) => {
      await gotoRel(page, '');
      await scrollToElement(page, '#contact-m', 'start');
      await expect
        .poll(async () => {
          const s = await lastScreen(page);
          return Math.abs(s.contactTop - s.headerBottom) <= 2;
        })
        .toBe(true);
      const snapped = await lastScreen(page);
      // Taller than the space left for it: the footer is still below the fold.
      expect(snapped.footerBottom).toBeGreaterThan(snapped.innerHeight + 2);
      for (const height of await contactRowHeights(page)) {
        expect(height).toBeGreaterThanOrEqual(63.5);
      }

      await scrollToElement(page, '.site-footer', 'end');
      await expect
        .poll(async () => {
          const s = await lastScreen(page);
          return {
            footerRightAfter: Math.abs(s.footerTop - s.contactBottom) <= 1,
            footerAtScreenFoot: Math.abs(s.footerBottom - s.innerHeight) <= 2,
          };
        })
        .toEqual({ footerRightAfter: true, footerAtScreenFoot: true });
      await expect(page.locator(BAR)).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  });

  test.describe('motion on', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('the fade settles both ways', async ({ page }) => {
      await gotoRel(page, '');
      const bar = page.locator(BAR);
      const settled = () => bar.evaluate((el) => el.getAnimations().length);

      await scrollToElement(page, '#work-m', 'start');
      await expect(bar).toHaveCSS('opacity', '1');
      await expect(bar).toHaveCSS('translate', 'none');
      await expect(bar).toHaveCSS('visibility', 'visible');
      await expect.poll(settled).toBe(0);

      await scrollToElement(page, '#contact-m', 'start');
      await expect(bar).toHaveCSS('opacity', '0');
      await expect(bar).toHaveCSS('translate', '0px 16px');
      await expect(bar).toHaveCSS('visibility', 'hidden');
      await expect.poll(settled).toBe(0);

      await scrollToElement(page, '#work-m', 'start');
      await expect(bar).toHaveCSS('opacity', '1');
      await expect(bar).toHaveCSS('translate', 'none');
      await expect(bar).toHaveCSS('visibility', 'visible');
      await expect.poll(settled).toBe(0);
      await expect.poll(() => runningTransitions(page)).toBe(0);
    });
  });

  test('Contact leads with the face: a 112px photo above the name', async ({ page }) => {
    await gotoRel(page, '');
    await scrollToElement(page, '#contact-m', 'start');
    const photo = page.locator('.m-contact__photo');
    await expect(photo).toBeVisible();
    const photoBox = (await photo.boundingBox())!;
    const nameBox = (await page.locator('.m-contact__name').boundingBox())!;
    expect(Math.round(photoBox.width)).toBe(112);
    expect(photoBox.y + photoBox.height).toBeLessThanOrEqual(nameBox.y);
  });

  test("Contact's copy button sits beside the email link and copies the address", async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await gotoRel(page, '');
    await scrollToElement(page, '#contact-m', 'start');
    // The row's one other control: a sibling of its link, never nested in it.
    const copy = page.locator('.m-contact__row button[data-copy]');
    await expect(copy).toHaveCount(1);
    expect(await copy.evaluate((el) => el.closest('a') === null)).toBe(true);
    await copy.click();
    await expect(copy).toContainText('copied');
    const email = await copy.getAttribute('data-copy');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(email);
  });

  test('the contact sheet keeps a swipe at its end to itself', async ({ page }) => {
    await gotoRel(page, '');
    // Safari has it; Playwright's WebKit build for Windows ships without the property.
    const supported = await page.evaluate(() => CSS.supports('overscroll-behavior', 'contain'));
    test.skip(!supported, 'this engine build has no overscroll-behavior');
    await expect(page.locator(SHEET)).toHaveCSS('overscroll-behavior-y', 'contain');
  });
});

test('page tops: the h1 row, then the content; only /capabilities/ keeps its intro', async ({
  page,
}) => {
  for (const [path, intro] of [
    ['work/', false],
    ['experience/', false],
    ['about/', false],
    ['capabilities/', true],
  ] as const) {
    await gotoRel(page, path);
    await expect(page.locator('h1'), path).toBeVisible();
    await expect(page.locator('.page-header__intro'), path).toBeVisible({ visible: intro });
  }
});

test('/work/ and /experience/ chips are the same touch chip', async ({ page }) => {
  const chip = async (path: string, selector: string) => {
    await gotoRel(page, path);
    const el = page.locator(selector).first();
    await expect(el).toBeVisible();
    return el.evaluate((node) => {
      const cs = getComputedStyle(node);
      return {
        height: Math.round(node.getBoundingClientRect().height),
        radius: cs.borderTopLeftRadius,
        font: cs.fontSize,
      };
    });
  };
  const work = await chip('work/', '[data-work-filter] button[data-capability]');
  const log = await chip('experience/', '[data-git-log] button[data-grep]');
  expect(work).toEqual(log);
  expect(work.height).toBeGreaterThanOrEqual(44);
  // The /work/ page's "Capability ›" key gives way to the chips.
  await gotoRel(page, 'work/');
  await expect(page.locator('.work-filter__key')).toBeHidden();
});

test('experience: the chips pin under the header while the log scrolls by', async ({ page }) => {
  await gotoRel(page, 'experience/');
  await expect(page.locator('[data-git-log][data-ready]')).toBeAttached();
  const chips = page.locator('[data-git-log] .git-log__chips');
  const cmd = page.locator('[data-git-log] .git-log__cmd');
  await page.evaluate(() => scrollTo({ top: 700, behavior: 'instant' }));
  const header = await page.evaluate(() =>
    Math.round(document.querySelector('header')!.getBoundingClientRect().bottom),
  );
  await expect.poll(async () => Math.round((await chips.boundingBox())!.y)).toBe(header);
  // The command line stays in the flow, scrolled away above.
  expect((await cmd.boundingBox())!.y).toBeLessThan(0);
  // A chip still works while pinned.
  await chips.locator('button[data-grep="software"]').click();
  await expect(chips.locator('button[data-grep="software"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test.describe('from 40rem', () => {
  test.use({ viewport: { width: 1024, height: 800 } });

  test('no panels or sticky bar; the wordmark nav is back', async ({ page }) => {
    await gotoRel(page, '');
    await expect(page.locator('.mobile-home')).toBeHidden();
    await expect(page.locator('.phone-nav')).toBeHidden();
    await expect(page.locator('.site-nav')).toBeVisible();
    await expect(page.locator('#experience')).toBeVisible();
  });
});
