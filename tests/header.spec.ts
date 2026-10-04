/**
 * The site header (SiteHeader.astro, Portfolio.dc.html `navDesk`/`navMob`), as deployed.
 * - From 40rem: one 3.5rem row on the page ground — the home link (logo + wordmark) at the
 *   start and, at the end, the numbered nav (About/Experience/Work/Contact), Capabilities, the
 *   Résumé link and the theme switch. Capabilities, Résumé and the nav's 01–04 indices need
 *   64rem; below it the labels stand alone. On the home page the nav is a scroll-spy: each
 *   item's bar fills once its section has been reached, the nearest section to the header is
 *   `.is-active`, and at the top of the page nothing is marked. Off the home page the current
 *   page's item carries `aria-current` instead, and Capabilities underlines itself on its own page.
 * - Phones (under 40rem): the segmented bar — the logo, the same four items (the active or
 *   current one grows and shows its label; sections read fill grey, only the active one is the
 *   accent) and the theme switch. Work goes to /work/; About, Experience and Contact to the home
 *   page's panels (Contact is a button for the sheet off the home page). Without script, About
 *   is the default on the home page. At 320px every item keeps a 24px target (WCAG 2.5.8) and
 *   the bar fits the viewport.
 * Reduced motion throughout, so fills are discrete (0 or 1) and colour changes are instant.
 */
import { expect, type Locator, type Page, test } from '@playwright/test';
import { headerLogo } from './helpers/header.ts';
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

/** A fill bar's computed transform at each discrete state. */
const SCALE_X = { 0: 'matrix(0, 0, 0, 1, 0, 0)', 1: 'matrix(1, 0, 0, 1, 0, 0)' } as const;

const IDS = ['about', 'experience', 'work', 'contact'] as const;

const navItem = (page: Page, id: string) => page.locator(`.site-nav a[data-nav-id="${id}"]`);
const phoneItem = (page: Page, id: string) => page.locator(`.phone-nav__item[data-nav-id="${id}"]`);

/**
 * The logo on show has loaded (not a broken image) and is decorative, sits on no tile
 * in both colour schemes (its white paper vanishes on a light ground), and fits inside it.
 */
async function expectLogoTransparent(page: Page, where: string): Promise<void> {
  const logo = headerLogo(page);
  await expect(logo, where).toBeVisible();
  const mark = logo.locator('img');
  await expect(mark, where).toHaveAttribute('alt', '');
  await expect
    .poll(() => mark.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), {
      message: `${where}: the mark loads`,
    })
    .toBe(true);
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    expect(
      await logo.evaluate((el) => getComputedStyle(el).backgroundColor),
      `${where}, ${colorScheme}: no tile behind the mark`,
    ).toBe('rgba(0, 0, 0, 0)');
  }
  const [tile, drawn] = [await box(logo), await box(mark)];
  expect(drawn.width, where).toBeLessThanOrEqual(tile.width + 0.5);
  expect(drawn.height, where).toBeLessThanOrEqual(tile.height + 0.5);
  expect(drawn.x, where).toBeGreaterThanOrEqual(tile.x);
  expect(drawn.y + drawn.height, where).toBeLessThanOrEqual(tile.y + tile.height + 0.5);
}

const widthsOf = (items: Locator) =>
  items.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));

/** Every item the same width (nothing is grown), to the pixel. */
async function expectEqualWidths(items: Locator, where: string): Promise<void> {
  const widths = await widthsOf(items);
  expect(widths, where).toHaveLength(4);
  for (const width of widths) expect(Math.abs(width - widths[0]!), where).toBeLessThan(1);
}

/** `wide` has grown (flex 3.4) past twice `narrow`'s width — once the flex change has landed. */
async function expectGrown(wide: Locator, narrow: Locator, where: string): Promise<void> {
  await expect
    .poll(async () => (await box(wide)).width / (await box(narrow)).width, { message: where })
    .toBeGreaterThan(2);
}

/**
 * The parts, left to right on the header's one row: none overlapping the next, all inside the
 * bar and the viewport — and the page not scrolling sideways. (The header's own box may report
 * a few px of overflow from the theme switch's invisible 44px hit area; that isn't layout.)
 */
async function expectOneRow(page: Page, selectors: readonly string[]): Promise<void> {
  const header = await box(page.locator('.site-header'));
  const viewport = await page.evaluate(() => document.documentElement.clientWidth);
  let right = -Infinity;
  for (const selector of selectors) {
    const part = await box(page.locator(selector));
    expect(part.y, selector).toBeGreaterThanOrEqual(header.y);
    expect(part.y + part.height, selector).toBeLessThanOrEqual(header.y + header.height + 0.5);
    expect(part.x, selector).toBeGreaterThanOrEqual(Math.max(0, right - 0.5));
    right = part.x + part.width;
    expect(right, selector).toBeLessThanOrEqual(viewport + 0.5);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

const WIDE_PARTS = [
  '.brand',
  '.site-nav',
  '.site-header__caps',
  '.site-header__resume',
  '.site-header__end [data-theme-toggle]',
] as const;

test.describe('header from 40rem', () => {
  test('header: one 56px row, the home link at the start and the end group at the end', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoRel(page, '');
    const header = await box(page.locator('.site-header'));
    expect(header.height).toBe(56);
    expect(
      await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--header-h').trim(),
      ),
    ).toBe('3.5rem');
    // Everything that clears the header follows it (html's scroll padding: header + 1rem).
    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingTop),
    ).toBe('72px');

    await expectOneRow(page, WIDE_PARTS);
    // The home link hugs the container's start edge, the end group its end edge.
    const inner = await box(page.locator('.site-header__inner'));
    const brand = await box(page.locator('.brand'));
    const end = await box(page.locator('.site-header__end'));
    expect(Math.abs(brand.x - inner.x)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(end.x + end.width - (inner.x + inner.width))).toBeLessThanOrEqual(0.5);
    await expect(page.locator('.brand__name')).toHaveText('Parker Jackim');

    // Four numbered items, in order: Work is its own page, the rest are the home page's anchors.
    const links = page.locator('.site-nav a');
    await expect(links).toHaveText(['01 About', '02 Experience', '03 Work', '04 Contact']);
    await expect(links.locator('.site-nav__idx')).toHaveText(['01', '02', '03', '04']);
    expect(await links.evaluateAll((els) => els.map((el) => el.getAttribute('href')))).toEqual([
      '/Portfolio/#about',
      '/Portfolio/#experience',
      '/Portfolio/work/',
      '/Portfolio/#contact',
    ]);
    expect(
      await links.evaluateAll((els) => els.map((el) => el.getAttribute('data-nav-id'))),
    ).toEqual([...IDS]);
    // The phone bar isn't laid out here.
    await expect(page.locator('.phone-nav')).toBeHidden();
    await expect(page.locator('.phone-brand')).toBeHidden();
  });

  test('header logo: the bare mark on a transparent ground, beside the wordmark', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoRel(page, '');
    await expectLogoTransparent(page, 'desktop');
    await expect(page.locator('.brand')).toHaveAccessibleName(/home/i);
  });

  test('header breakpoints: the wordmark from 40rem; Capabilities, Résumé and the indices from 64rem', async ({
    page,
  }) => {
    await gotoRel(page, '');
    const brand = page.locator('.brand');
    const wordmark = page.locator('.brand__name');
    const nav = page.locator('.site-nav');
    const phoneNav = page.locator('.phone-nav');
    const index = page.locator('.site-nav__idx').first();
    const caps = page.locator('.site-header__caps');
    const resume = page.locator('.site-header__resume');
    for (const { width, wide, full } of [
      { width: 639, wide: false, full: false },
      { width: 640, wide: true, full: false },
      { width: 1023, wide: true, full: false },
      { width: 1024, wide: true, full: true },
    ]) {
      await page.setViewportSize({ width, height: 800 });
      await expect(brand, `home link at ${width}px`).toBeVisible({ visible: wide });
      await expect(wordmark, `wordmark at ${width}px`).toBeVisible({ visible: wide });
      await expect(nav, `nav at ${width}px`).toBeVisible({ visible: wide });
      await expect(phoneNav, `phone bar at ${width}px`).toBeVisible({ visible: !wide });
      await expect(index, `01 at ${width}px`).toBeVisible({ visible: full });
      await expect(caps, `Capabilities at ${width}px`).toBeVisible({ visible: full });
      await expect(resume, `Résumé at ${width}px`).toBeVisible({ visible: full });
    }
  });

  test('header layout: one row at 640px and 1024px, with no overflow', async ({ page }) => {
    await gotoRel(page, '');
    // Tablets: the nav and the theme switch beside the wordmark; Capabilities and Résumé wait.
    await page.setViewportSize({ width: 640, height: 800 });
    await expectOneRow(page, ['.brand', '.site-nav', '.site-header__end [data-theme-toggle]']);
    // The full row, at the width it first fits.
    await page.setViewportSize({ width: 1024, height: 800 });
    await expectOneRow(page, WIDE_PARTS);
  });

  test('header nav on the home page: nothing marked at the top; sections read fill, the nearest is active', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoRel(page, '');
    const accent = await tokenColor(page, '--accent');
    const text = await tokenColor(page, '--text');
    const muted = await tokenColor(page, '--text-muted');
    const fill = (id: string) => navItem(page, id).locator('.site-nav__fill');

    // At the top, once the scroll-spy has run (it drops About's no-script default): nothing
    // active, every label muted, every bar empty.
    await expect(page.locator('.site-nav a[data-default-active]')).toHaveCount(0);
    await expect(page.locator('.site-nav a.is-active, .site-nav a[aria-current]')).toHaveCount(0);
    for (const id of IDS) {
      await expect(navItem(page, id)).toHaveCSS('color', muted);
      await expect(fill(id)).toHaveCSS('transform', SCALE_X[0]);
    }

    // Reading Experience: it is the active item (text colour, accent index, full bar); About,
    // already read, is full too; Work and Contact are still empty.
    await page
      .locator('#experience')
      .evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await expect(navItem(page, 'experience')).toHaveClass(/\bis-active\b/);
    await expect(page.locator('.site-nav a.is-active')).toHaveCount(1);
    await expect(navItem(page, 'experience')).toHaveCSS('color', text);
    await expect(navItem(page, 'experience').locator('.site-nav__idx')).toHaveCSS('color', accent);
    await expect(navItem(page, 'about')).toHaveCSS('color', muted);
    for (const id of ['about', 'experience']) {
      await expect(fill(id)).toHaveCSS('background-color', accent);
      await expect(fill(id)).toHaveCSS('transform', SCALE_X[1]);
    }
    for (const id of ['work', 'contact']) await expect(fill(id)).toHaveCSS('transform', SCALE_X[0]);

    // The foot of the page is Contact, however little of it fits above the fold.
    await page.evaluate(() =>
      scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
    );
    await expect(navItem(page, 'contact')).toHaveClass(/\bis-active\b/);
    for (const id of IDS) await expect(fill(id)).toHaveCSS('transform', SCALE_X[1]);
  });

  test('header nav off the home page: the current page is marked, and nothing tracks scroll', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    for (const { route, id, value } of [
      { route: 'about/', id: 'about', value: 'page' },
      { route: 'experience/', id: 'experience', value: 'page' },
      { route: 'work/', id: 'work', value: 'page' },
      // A project is in the Work section, but isn't the Work page.
      { route: 'work/credential-correlation/', id: 'work', value: 'true' },
    ]) {
      await gotoRel(page, route);
      const marked = page.locator('.site-nav a[aria-current]');
      await expect(marked, route).toHaveCount(1);
      await expect(marked, route).toHaveAttribute('data-nav-id', id);
      await expect(marked, route).toHaveAttribute('aria-current', value);
      await expect(marked, route).toHaveCSS('color', await tokenColor(page, '--text'));
      await expect(marked.locator('.site-nav__fill'), route).toHaveCSS('transform', SCALE_X[1]);
      await expect(
        page.locator('.site-nav a.is-active, .site-nav a[data-default-active]'),
        route,
      ).toHaveCount(0);
      await expect(page.locator('.site-header__caps'), route).not.toHaveAttribute('aria-current');
    }

    // Capabilities is a separate link outside the numbered nav, underlined on its own page.
    await gotoRel(page, 'capabilities/');
    await expect(page.locator('.site-nav a[aria-current], .site-nav a.is-active')).toHaveCount(0);
    const caps = page.locator('.site-header__caps');
    await expect(caps).toHaveAttribute('aria-current', 'page');
    await expect(caps).toHaveCSS('text-decoration-line', 'underline');
    await expect(caps).toHaveCSS('color', await tokenColor(page, '--text'));
  });
});

test.describe('phone header', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('phone logo: the bare mark on a transparent ground, linking home', async ({ page }) => {
    await gotoRel(page, 'work/');
    await expectLogoTransparent(page, 'phone');
    await expect(page.locator('.phone-brand')).toHaveAccessibleName(/home/i);
  });

  test('phone nav: four numbered items — Work to /work/, the rest to the home panels; nothing marked at the top', async ({
    page,
  }) => {
    await gotoRel(page, '');
    await expect(page.locator('.site-nav')).toBeHidden();
    await expect(page.locator('.brand')).toBeHidden();
    await expect(page.locator('.phone-brand')).toBeVisible();
    await expect(page.locator('.phone-theme [data-theme-toggle]')).toBeVisible();

    const items = page.locator('.phone-nav__item');
    await expect(items).toHaveCount(4);
    expect(
      await items.evaluateAll((els) =>
        els.map((el) => [el.tagName, el.getAttribute('data-nav-id'), el.getAttribute('href')]),
      ),
    ).toEqual([
      ['A', 'about', '/Portfolio/#about-m'],
      ['A', 'experience', '/Portfolio/#experience-m'],
      ['A', 'work', '/Portfolio/work/'],
      ['A', 'contact', '/Portfolio/#contact-m'],
    ]);
    await expect(items.locator('.phone-nav__idx')).toHaveText(['01', '02', '03', '04']);
    await expect(items.locator('.phone-nav__label')).toHaveText([
      'About',
      'Experience',
      'Work',
      'Contact',
    ]);

    // At the top, once the scroll-spy has run (it drops About's no-script default): nothing
    // active, four equal items, no label showing.
    await expect(page.locator('.phone-nav [data-default-active]')).toHaveCount(0);
    await expect(page.locator('.phone-nav .is-active, .phone-nav [aria-current]')).toHaveCount(0);
    await expectEqualWidths(items, 'home, top');
    for (const id of IDS) {
      await expect(phoneItem(page, id).locator('.phone-nav__label')).toHaveCSS('opacity', '0');
    }
  });

  test('phone nav: the section being read grows, shows its label and colours in; earlier ones fill grey', async ({
    page,
  }) => {
    await gotoRel(page, '');
    const accent = await tokenColor(page, '--accent');
    const lineUi = await tokenColor(page, '--line-ui');
    const text = await tokenColor(page, '--text');
    const muted = await tokenColor(page, '--text-muted');
    const fill = (id: string) => phoneItem(page, id).locator('.phone-nav__fill');

    await page
      .locator('#experience-m')
      .evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    const experience = phoneItem(page, 'experience');
    const about = phoneItem(page, 'about');
    await expect(experience).toHaveClass(/\bis-active\b/);
    await expect(page.locator('.phone-nav .is-active')).toHaveCount(1);
    await expectGrown(experience, about, 'Experience active');
    await expect(experience.locator('.phone-nav__label')).toHaveCSS('opacity', '1');
    await expect(about.locator('.phone-nav__label')).toHaveCSS('opacity', '0');
    await expect(experience).toHaveCSS('color', text);
    await expect(experience.locator('.phone-nav__idx')).toHaveCSS('color', accent);
    await expect(about).toHaveCSS('color', muted);
    // Active: the accent, full. Read: grey, full. Not reached: empty.
    await expect(fill('experience')).toHaveCSS('background-color', accent);
    await expect(fill('experience')).toHaveCSS('transform', SCALE_X[1]);
    await expect(fill('about')).toHaveCSS('background-color', lineUi);
    await expect(fill('about')).toHaveCSS('transform', SCALE_X[1]);
    for (const id of ['work', 'contact']) {
      await expect(fill(id)).toHaveCSS('background-color', lineUi);
      await expect(fill(id)).toHaveCSS('transform', SCALE_X[0]);
    }
  });

  test('phone nav: off the home page the current page is wide and marked; Contact is a button for the sheet', async ({
    page,
  }) => {
    await gotoRel(page, 'work/');
    const work = phoneItem(page, 'work');
    await expect(work).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.phone-nav [aria-current]')).toHaveCount(1);
    await expectGrown(work, phoneItem(page, 'experience'), 'Work current');
    await expect(work.locator('.phone-nav__label')).toHaveCSS('opacity', '1');
    await expect(work.locator('.phone-nav__idx')).toHaveCSS(
      'color',
      await tokenColor(page, '--accent'),
    );
    await expect(work.locator('.phone-nav__fill')).toHaveCSS('transform', SCALE_X[1]);
    await expect(work.locator('.phone-nav__fill')).toHaveCSS(
      'background-color',
      await tokenColor(page, '--accent'),
    );
    // There is no contact page: Contact opens the sheet directly (phone.spec exercises it).
    const contact = phoneItem(page, 'contact');
    expect(await contact.evaluate((el) => el.tagName)).toBe('BUTTON');
    await expect(contact).toHaveAttribute('commandfor', 'contact-sheet');
    await expect(contact).toHaveAttribute('command', 'show-modal');

    await gotoRel(page, 'work/credential-correlation/');
    await expect(phoneItem(page, 'work')).toHaveAttribute('aria-current', 'true');

    // A page outside the four sections marks nothing: four equal, idle items.
    await gotoRel(page, 'capabilities/');
    await expect(
      page.locator(
        '.phone-nav .is-active, .phone-nav [aria-current], .phone-nav [data-default-active]',
      ),
    ).toHaveCount(0);
    await expectEqualWidths(page.locator('.phone-nav__item'), 'capabilities');
  });
});

test.describe('phone header without scripting', () => {
  test.use({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });

  test('phone nav: the script-free default is About on the home page, wide, with its label', async ({
    page,
  }) => {
    await gotoRel(page, '');
    const about = phoneItem(page, 'about');
    await expect(page.locator('.phone-nav [data-default-active]')).toHaveCount(1);
    await expect(about).toHaveAttribute('data-default-active', '');
    await expectGrown(about, phoneItem(page, 'experience'), 'About, no script');
    await expect(about.locator('.phone-nav__label')).toHaveCSS('opacity', '1');
    await expect(phoneItem(page, 'experience').locator('.phone-nav__label')).toHaveCSS(
      'opacity',
      '0',
    );
    await expect(about).toHaveCSS('color', await tokenColor(page, '--text'));
    await expect(about.locator('.phone-nav__idx')).toHaveCSS(
      'color',
      await tokenColor(page, '--accent'),
    );
    // The same default on the wide nav's markup.
    await expect(page.locator('.site-nav a[data-default-active]')).toHaveAttribute(
      'data-nav-id',
      'about',
    );

    // Off the home page there is no default, only the current page's mark.
    await gotoRel(page, 'capabilities/');
    await expect(
      page.locator('.phone-nav [data-default-active], .phone-nav [aria-current]'),
    ).toHaveCount(0);
    await expectEqualWidths(page.locator('.phone-nav__item'), 'capabilities, no script');
  });
});

test.describe('phone header at 320px', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('phone header at 320px: every nav item at least 24px wide, and the bar fits the viewport', async ({
    page,
  }) => {
    for (const route of ['', 'work/']) {
      const where = route || 'home';
      await gotoRel(page, route);
      const toggle = page.locator('.phone-theme [data-theme-toggle]');
      await expect(toggle).toBeVisible();
      const widths = await page
        .locator('.phone-nav__item')
        .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
      expect(widths, where).toHaveLength(4);
      for (const width of widths) {
        expect(width, `${where}: ${widths.join(', ')}`).toBeGreaterThanOrEqual(24);
      }
      // Logo, nav and theme switch left to right, none overlapping, the switch (the bar's
      // last item) whole on screen, and nothing in the bar overflowing the header.
      const viewport = await page.evaluate(() => document.documentElement.clientWidth);
      let right = 0;
      for (const selector of ['.phone-brand', '.phone-nav', '.phone-theme [data-theme-toggle]']) {
        const part = await box(page.locator(selector));
        expect(part.x, `${where}: ${selector}`).toBeGreaterThanOrEqual(right - 0.5);
        right = part.x + part.width;
      }
      expect(right, where).toBeLessThanOrEqual(viewport);
      expect(
        await page.locator('.site-header').evaluate((el) => el.scrollWidth <= el.clientWidth),
        where,
      ).toBe(true);
      // Each label is cut inside its own item (an ellipsis), never spilling into the next.
      for (const item of await page.locator('.phone-nav__item').all()) {
        const column = await box(item);
        const row = await box(item.locator('.phone-nav__row'));
        expect(row.x + row.width, where).toBeLessThanOrEqual(column.x + column.width + 0.5);
      }
    }
  });
});
