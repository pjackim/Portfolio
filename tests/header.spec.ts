/**
 * The site header (SiteHeader.astro, Portfolio.dc.html `navDesk`/`navMob`).
 * - From 40rem: a 4rem bar on the page ground, three columns — the home link (monogram, plus
 *   the wordmark from 73.75rem), the numbered nav centred between (four equal columns, at most
 *   41.25rem), and `.site-header__end` (Capabilities from 57.5rem, Résumé, the theme switch).
 *   Each nav item is a mono label over a 2px track: sections already read fill grey, and only
 *   the active one is the accent; at the top of the page nothing is active or filled.
 * - Phones: the segmented bar. With nothing active, About stays wide with its label showing, in
 *   idle colours; every item but Contact goes to its home-page panel (Work too). At 320px every
 *   item keeps a 24px target (WCAG 2.5.8) and the bar fits the viewport.
 * Reduced motion throughout, so fills are discrete (0 or 1) and colour changes are instant.
 */
import { expect, type Locator, type Page, test } from '@playwright/test';
import { gotoRel } from './helpers/routes.ts';

test.use({ reducedMotion: 'reduce' });

const box = async (locator: Locator) => (await locator.boundingBox())!;

/** A colour token as the page computes it (both schemes resolve through light-dark()). */
const tokenColor = (page: Page, token: string): Promise<string> =>
  page.evaluate((name) => {
    const probe = document.createElement('i');
    probe.style.color = `var(${name})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, token);

const navItem = (page: Page, id: string) => page.locator(`.site-nav a[data-nav-id="${id}"]`);

test.describe('header from 40rem', () => {
  test('header: the nav is centred between the home link and the end group', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await gotoRel(page, '');
    const header = await box(page.locator('.site-header'));
    const brand = await box(page.locator('.brand'));
    const end = await box(page.locator('.site-header__end'));
    const nav = await box(page.locator('.site-nav'));
    // Capped at 41.25rem, centred in the column between the two groups…
    expect(Math.round(nav.width)).toBe(660);
    const columnMid = (brand.x + brand.width + end.x) / 2;
    expect(Math.abs(nav.x + nav.width / 2 - columnMid)).toBeLessThanOrEqual(1);
    // …as tall as the header, in four equal columns.
    expect(nav.y).toBe(header.y);
    expect(nav.height).toBe(header.height);
    const widths = await page
      .locator('.site-nav a')
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
    expect(widths).toHaveLength(4);
    for (const width of widths) expect(Math.abs(width - widths[0]!)).toBeLessThan(1);
  });

  test('header nav: sections read fill grey, only the active one is the accent', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoRel(page, '');
    const accent = await tokenColor(page, '--accent');
    const lineUi = await tokenColor(page, '--line-ui');
    await page
      .locator('#experience')
      .evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await expect(navItem(page, 'experience')).toHaveClass(/\bis-active\b/);
    const fill = (id: string) => navItem(page, id).locator('.site-nav__fill');
    await expect(fill('experience')).toHaveCSS('background-color', accent);
    await expect(navItem(page, 'experience').locator('.site-nav__idx')).toHaveCSS('color', accent);
    // About was read: full, and grey.
    await expect(fill('about')).toHaveCSS('background-color', lineUi);
    await expect(fill('about')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
    // Not reached yet: empty.
    for (const id of ['work', 'contact']) {
      await expect(fill(id)).toHaveCSS('background-color', lineUi);
      await expect(fill(id)).toHaveCSS('transform', 'matrix(0, 0, 0, 1, 0, 0)');
    }
  });

  test('header nav: nothing active or filled at the top of the home page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoRel(page, '');
    await expect(page.locator('.site-nav a.is-active, .site-nav a[aria-current]')).toHaveCount(0);
    const muted = await tokenColor(page, '--text-muted');
    for (const link of await page.locator('.site-nav a').all()) {
      await expect(link).toHaveCSS('color', muted);
      await expect(link.locator('.site-nav__fill')).toHaveCSS(
        'transform',
        'matrix(0, 0, 0, 1, 0, 0)',
      );
    }
  });

  test('header: --header-h is 64px from 40rem and 56px on phones', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 800 });
    await gotoRel(page, '');
    const height = async () => (await box(page.locator('.site-header'))).height;
    expect(await height()).toBe(64);
    expect(
      await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--header-h').trim(),
      ),
    ).toBe('4rem');
    // Everything that clears the header follows it (html's scroll padding: header + 1rem).
    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingTop),
    ).toBe('80px');
    await page.setViewportSize({ width: 639, height: 800 });
    await expect.poll(height).toBe(56);
  });

  test('header breakpoints: Capabilities from 57.5rem, Résumé from 40rem, wordmark from 73.75rem', async ({
    page,
  }) => {
    await gotoRel(page, '');
    const caps = page.locator('.site-header__caps');
    const resume = page.locator('.site-header__resume');
    const wordmark = page.locator('.brand__name');
    for (const { width, capsOn, resumeOn, nameOn } of [
      { width: 639, capsOn: false, resumeOn: false, nameOn: false },
      { width: 640, capsOn: false, resumeOn: true, nameOn: false },
      { width: 919, capsOn: false, resumeOn: true, nameOn: false },
      { width: 920, capsOn: true, resumeOn: true, nameOn: false },
      { width: 1179, capsOn: true, resumeOn: true, nameOn: false },
      { width: 1180, capsOn: true, resumeOn: true, nameOn: true },
    ]) {
      await page.setViewportSize({ width, height: 800 });
      await expect(caps, `Capabilities at ${width}px`).toBeVisible({ visible: capsOn });
      await expect(resume, `Résumé at ${width}px`).toBeVisible({ visible: resumeOn });
      await expect(wordmark, `wordmark at ${width}px`).toBeVisible({ visible: nameOn });
    }
  });

  test('header layout: one row at 640px, with no overflow', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 800 });
    await gotoRel(page, '');
    await expect(page.locator('.site-header__end [data-theme-toggle]')).toBeVisible();
    const header = await box(page.locator('.site-header'));
    // Left to right on the one row, none overlapping the next, all inside the bar.
    let right = -Infinity;
    for (const selector of [
      '.brand',
      '.site-nav',
      '.site-header__resume',
      '.site-header__end [data-theme-toggle]',
    ]) {
      const part = await box(page.locator(selector));
      expect(part.y, selector).toBeGreaterThanOrEqual(header.y);
      expect(part.y + part.height, selector).toBeLessThanOrEqual(header.y + header.height + 0.5);
      expect(part.x, selector).toBeGreaterThanOrEqual(right - 0.5);
      right = part.x + part.width;
    }
    expect(
      await page.locator('.site-header__inner').evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    // Each index shows whole; a label too long for its column is cut inside it (an ellipsis).
    for (const link of await page.locator('.site-nav a').all()) {
      const column = await box(link);
      const index = await box(link.locator('.site-nav__idx'));
      const label = await box(link.locator('.site-nav__label'));
      expect(index.width).toBeGreaterThan(0);
      expect(index.x + index.width).toBeLessThanOrEqual(column.x + column.width);
      expect(label.x + label.width).toBeLessThanOrEqual(column.x + column.width + 0.5);
    }
  });
});

/** Phones with nothing active: About is the wide item, label showing, in idle colours. */
async function expectIdleAbout(page: Page, where: string): Promise<void> {
  const items = page.locator('.phone-nav__item');
  await expect(page.locator('.phone-nav .is-active, .phone-nav [aria-current]')).toHaveCount(0);
  const about = items.nth(0);
  const experience = items.nth(1);
  expect((await box(about)).width, where).toBeGreaterThan((await box(experience)).width * 2);
  await expect(about.locator('.phone-nav__label')).toHaveCSS('opacity', '1');
  await expect(experience.locator('.phone-nav__label')).toHaveCSS('opacity', '0');
  // The same colours as the idle items beside it: never the active accent.
  const style = (locator: Locator, property: string) =>
    locator.evaluate((el, prop) => getComputedStyle(el).getPropertyValue(prop), property);
  for (const [part, property] of [
    [null, 'color'],
    ['.phone-nav__idx', 'color'],
    ['.phone-nav__fill', 'background-color'],
  ] as const) {
    const a = part ? about.locator(part) : about;
    const e = part ? experience.locator(part) : experience;
    expect(await style(a, property), `${where}: ${part ?? 'item'} ${property}`).toBe(
      await style(e, property),
    );
  }
}

test.describe('phone header', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('phone nav: with nothing active, About stays wide in idle colours', async ({ page }) => {
    await gotoRel(page, '');
    await expectIdleAbout(page, 'home, top');
    // A page outside the four sections.
    await gotoRel(page, 'capabilities/');
    await expectIdleAbout(page, 'capabilities');
  });

  test('phone nav: 03 Work goes to the Selected work panel, not /work/', async ({ page }) => {
    await gotoRel(page, 'work/');
    const work = page.locator('.phone-nav__item', { hasText: 'Work' });
    // Still the current section on /work/ itself…
    await expect(work).toHaveAttribute('aria-current', 'page');
    await expect(work).toHaveAttribute('href', /\/Portfolio\/#work-m$/);
    // …but the link goes to the home page's panel, which then marks it active once snapped
    // under the header.
    await work.click();
    await expect(page).toHaveURL(/\/Portfolio\/#work-m$/);
    await expect(page.locator('#work-m')).toBeInViewport();
    await expect(page.locator('.phone-nav__item', { hasText: 'Work' })).toHaveClass(
      /\bis-active\b/,
    );
  });
});

test.describe('phone header without scripting', () => {
  test.use({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });

  test('phone nav: the script-free default is About, wide, in idle colours', async ({ page }) => {
    await gotoRel(page, '');
    await expectIdleAbout(page, 'no script');
  });
});

test.describe('phone header at 320px', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('phone header at 320px: every nav item at least 24px wide, no overflow', async ({
    page,
  }) => {
    for (const route of ['', 'work/']) {
      await gotoRel(page, route);
      await expect(page.locator('.phone-theme [data-theme-toggle]')).toBeVisible();
      const widths = await page
        .locator('.phone-nav__item')
        .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
      expect(widths).toHaveLength(4);
      for (const width of widths) {
        expect(width, `${route || 'home'}: ${widths.join(', ')}`).toBeGreaterThanOrEqual(24);
      }
      // Nothing in the bar overflows it, and the bar ends inside the viewport (the theme switch,
      // its last item, whole on screen).
      expect(
        await page
          .locator('.site-header__inner')
          .evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      const toggle = await box(page.locator('.phone-theme [data-theme-toggle]'));
      const viewport = await page.evaluate(() => document.documentElement.clientWidth);
      expect(toggle.x + toggle.width).toBeLessThanOrEqual(viewport);
    }
  });
});
