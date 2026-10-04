/**
 * Paired paragraphs (src/lib/pairs.ts, MediaPair): a case study's body text set beside the media
 * that shows it, on bodycam-external. From 56rem the text and its figure share a row, the media
 * alternating sides down the page; below it the text comes first and the figure follows. Figures
 * are numbered in page order, paired ones leaving the Figures gallery. Runs on every project.
 */
import { expect, test, type Page } from '@playwright/test';
import { gotoRel } from './helpers/routes.ts';

const PAGE = 'work/bodycam-external/';
const PAIR = '.case__prose .pair';

const boxes = (page: Page, index: number) =>
  page
    .locator(PAIR)
    .nth(index)
    .evaluate((pair) => {
      const rect = (selector: string) => {
        const box = pair.querySelector(selector)!.getBoundingClientRect();
        return { x: box.x, y: box.y, right: box.right, bottom: box.bottom };
      };
      return { text: rect('.pair__text'), media: rect('.pair__media') };
    });

test.describe('paired paragraphs on desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });

  test('each pair sets its text beside its figure, alternating sides', async ({ page }) => {
    await gotoRel(page, PAGE);
    const pairs = page.locator(PAIR);
    const count = await pairs.count();
    expect(count).toBeGreaterThanOrEqual(4);
    const sides = await pairs.evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-pair-side')),
    );
    expect(sides[0]).toBe('right');
    sides.forEach((side, i) => expect(side).toBe(i % 2 === 0 ? 'right' : 'left'));

    for (let i = 0; i < count; i++) {
      await expect(pairs.nth(i).locator('.pair__text')).toBeVisible();
      await expect(pairs.nth(i).locator('figure.figure')).toBeVisible();
      const { text, media } = await boxes(page, i);
      // Same row: the two halves overlap vertically, and sit side by side, not stacked.
      expect(Math.min(text.bottom, media.bottom)).toBeGreaterThan(Math.max(text.y, media.y));
      if (sides[i] === 'right') expect(text.right).toBeLessThanOrEqual(media.x + 1);
      else expect(media.right).toBeLessThanOrEqual(text.x + 1);
    }
  });

  test('figures are numbered in page order, and paired ones leave the gallery', async ({
    page,
  }) => {
    await gotoRel(page, PAGE);
    const numbers = await page
      .locator('.case__body figure.figure')
      .evaluateAll((els) => els.map((el) => Number(el.getAttribute('data-figure'))));
    expect(numbers.length).toBeGreaterThan(await page.locator(PAIR).count());
    expect(numbers).toEqual(numbers.map((_, i) => i + 1));
    const inGallery = await page.locator('.case__gallery figure.figure').count();
    expect(inGallery).toBeGreaterThanOrEqual(1);
    expect(inGallery).toBe(numbers.length - (await page.locator(PAIR).count()));
  });

  test('the text comes first in the document, and the page has no overflow', async ({ page }) => {
    await gotoRel(page, PAGE);
    const order = await page
      .locator(PAIR)
      .first()
      .evaluate((pair) => [...pair.children].map((el) => el.className));
    expect(order).toEqual(['pair__text', 'pair__media']);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
});

test.describe('paired paragraphs on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

  test('the text comes first and its figure follows, full width, without overflow', async ({
    page,
  }) => {
    await gotoRel(page, PAGE);
    const pairs = page.locator(PAIR);
    const count = await pairs.count();
    for (let i = 0; i < count; i++) {
      const { text, media } = await boxes(page, i);
      expect(media.y).toBeGreaterThanOrEqual(text.bottom - 1);
      expect(media.x).toBeLessThan(text.x + 4);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
});
