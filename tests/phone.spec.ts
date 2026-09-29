/**
 * The phone layout, under 40rem (Portfolio.dc.html, Claude Design, Sept 2026: "1b Terminal
 * chapters" — `isHomeMob`/`isExpMob`/`isAboutMob`/`navMob`).
 * - Header: a segmented 4-item nav (About/Experience/Work/Contact, numbered 01–04) whose active
 *   item grows and colours in; Contact opens the contact sheet directly off the home page (there
 *   is no standalone contact page). Capabilities and the résumé live in the About panel and the
 *   sticky CTA bar instead of the header.
 * - Home: the hero's full-height chapter opener, then the same four sections as scroll-snap
 *   panels (About's horizontal timeline strip, Experience's shared git log, Selected work's
 *   reel cards, Contact's rows) — a sticky "Get in touch" bar opens the contact sheet, a modal
 *   with every channel that Escape closes.
 * - /experience/: the git log keeps its graph, the date moves into each row, and tapping
 *   anywhere on a milestone opens its skills under it.
 * - /work/: each showcase's lead is a card, and its rows carry 64px cover thumbnails.
 * - From 40rem the panels, sticky bar and segmented nav are gone and the wordmark nav is back.
 * Runs on every project (desktop Chromium at phone size, Pixel 7, iPhone 15 / WebKit).
 */
import { expect, test } from '@playwright/test';
import { gotoRel } from './helpers/routes.ts';

test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

const SHEET = '#contact-sheet';

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

test('experience: the graph stays, and a tap anywhere on a milestone opens its skills', async ({
  page,
}) => {
  await gotoRel(page, 'experience/');
  await expect(page.locator('[data-git-log][data-ready]')).toBeAttached();
  await expect(page.locator('[data-git-log] .gl-svg').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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
  const thumb = showcase.locator('[data-project] .work-row__thumb').first();
  await expect(thumb).toBeVisible();
  const box = (await thumb.boundingBox())!;
  expect(Math.round(box.width)).toBe(64);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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
