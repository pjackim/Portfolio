/**
 * /work/ filter, case-study instruments, figure lightbox, footer status line, in-page scrolling
 * (interactions spec §4, §5; Ruling G9).
 * - /work/ capability filter: chip counts; a chip hides exactly the rows without its capability
 *   and the groups left empty; `?capability=` is kept in the URL and restores the filter on load —
 *   painted filtered before any script runs — while an unknown value is ignored; a polite live
 *   region announces "Showing N of 15 projects"; the chips work from the keyboard; with motion on
 *   the change is a view transition that leaves nothing behind; rows it brings on screen are
 *   never left waiting for an entrance (opacity 1); the bar appearing shifts nothing; without JS
 *   there is no bar and every row shows.
 * - Case study at 1440: the "On this page" index, whose scrollspy follows the section being read;
 *   below 72rem there is none. The reading-progress bar is decorative. The motion layer (footer
 *   chip and clock, index, lightbox) is fetched only after load there.
 * - Lightbox: opens from a figure image (click) and its "Full size" link (Enter); Esc, the close
 *   button and the backdrop close it; focus goes to the close button and back to the link; the
 *   page can't scroll behind it; it is named "Figure n"; axe finds nothing with it open.
 * - Footer: the build SHA and date; the UTC clock ticks with motion on, only on screen, and is
 *   frozen on the build time with motion off (reduced motion or the toggle); the status dot
 *   pulses only while it ticks.
 * - A page loaded at a fragment lands on it at once; a same-page anchor click glides with motion
 *   on and jumps with it off, keeping the hash.
 * Runs on every project (desktop Chromium, Pixel 7, iPhone 15 / WebKit).
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { twoFrames } from './helpers/motion.ts';
import { gotoRel, ROUTES } from './helpers/routes.ts';

declare global {
  interface Window {
    __vtFilter?: ('add' | 'remove')[];
    __filterShifts?: number[];
    __loadYs?: number[];
    __scrollYs?: number[];
  }
}

const PROJECT_COUNT = ROUTES.filter((route) => /^work\/[^/]+\/$/.test(route)).length;
const BAR = '[data-work-filter]';
const CHIP = `${BAR} button[data-capability]`;
const ROW = '[data-filter-list] .archive-row';
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/** Safari reaches buttons and links with Option+Tab (plain Tab only visits text fields). */
const tabKey = (browserName: string) => (browserName === 'webkit' ? 'Alt+Tab' : 'Tab');

const chip = (page: Page, id: string) => page.locator(`${CHIP}[data-capability="${id}"]`);

/** The filter bar has been wired by the motion layer and shown (its chips work). */
async function filterReady(page: Page): Promise<void> {
  await expect(page.locator(`${BAR}[data-ready]`)).toBeAttached();
  await expect(page.locator(CHIP).first()).toBeVisible();
}

/** Slugs of the rows that are rendered, and ids of the groups that are. */
function shown(page: Page): Promise<{ rows: string[]; groups: string[] }> {
  return page.evaluate(() => ({
    rows: [...document.querySelectorAll<HTMLElement>('[data-filter-list] .archive-row')]
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => el.dataset.slug ?? ''),
    groups: [...document.querySelectorAll<HTMLElement>('[data-filter-list] .archive-group')]
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => el.dataset.group ?? ''),
  }));
}

/** What the filter should show for `id`, from the rows' own `data-capabilities`. */
function expected(page: Page, id: string): Promise<{ rows: string[]; groups: string[] }> {
  return page.evaluate((id) => {
    const match = (el: Element) =>
      id === '' || (el.getAttribute('data-capabilities') ?? '').split(' ').includes(id);
    return {
      rows: [...document.querySelectorAll<HTMLElement>('[data-filter-list] .archive-row')]
        .filter(match)
        .map((el) => el.dataset.slug ?? ''),
      groups: [...document.querySelectorAll<HTMLElement>('[data-filter-list] .archive-group')]
        .filter((group) => [...group.querySelectorAll('.archive-row')].some(match))
        .map((el) => el.dataset.group ?? ''),
    };
  }, id);
}

/** Records every add/remove of `vt-filter` on <html>, from before any script runs. */
async function recordVtFilter(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__vtFilter = [];
    let had = false;
    new MutationObserver(() => {
      const now = document.documentElement.classList.contains('vt-filter');
      if (now !== had) window.__vtFilter!.push(now ? 'add' : 'remove');
      had = now;
    }).observe(document, { attributes: true, subtree: true, attributeFilter: ['class'] });
  });
}

test.describe('/work/ filter', () => {
  test.use({ reducedMotion: 'reduce' });

  test('chips: All plus each capability, with its project count, in a labelled group', async ({
    page,
  }) => {
    await gotoRel(page, 'work/');
    await filterReady(page);
    const group = page.getByRole('group', { name: 'Filter by capability' });
    await expect(group).toBeVisible();
    const chips = await page.locator(CHIP).evaluateAll((els) =>
      els.map((el) => ({
        id: el.getAttribute('data-capability') ?? '',
        count: el.querySelector('.work-filter__count')?.textContent?.trim() ?? '',
        name: el.getAttribute('aria-label') ?? '',
        pressed: el.getAttribute('aria-pressed'),
      })),
    );
    expect(chips.length).toBeGreaterThan(1);
    expect(chips[0]).toEqual({
      id: '',
      count: String(PROJECT_COUNT).padStart(2, '0'),
      name: `All, ${PROJECT_COUNT} projects`,
      pressed: 'true',
    });
    await expect(page.locator(ROW)).toHaveCount(PROJECT_COUNT);
    for (const { id, count, name, pressed } of chips.slice(1)) {
      const n = (await expected(page, id)).rows.length;
      expect(n, `projects with ${id}`).toBeGreaterThan(0);
      expect(count, `${id} count`).toBe(String(n).padStart(2, '0'));
      expect(name).toMatch(new RegExp(`, ${n} projects?$`));
      expect(pressed).toBe('false');
    }
    await expect(page.locator('[data-filter-shown]')).toHaveText(
      String(PROJECT_COUNT).padStart(2, '0'),
    );
  });

  test('each chip hides the rows without its capability and the groups left empty', async ({
    page,
  }) => {
    await gotoRel(page, 'work/');
    await filterReady(page);
    const ids = await page
      .locator(CHIP)
      .evaluateAll((els) => els.map((el) => el.getAttribute('data-capability') ?? ''));
    const groupsShown = new Set<number>();
    for (const id of [...ids.slice(1), '']) {
      await chip(page, id).click();
      await expect(chip(page, id)).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator(`${CHIP}[aria-pressed="true"]`)).toHaveCount(1);
      const want = await expected(page, id);
      expect(await shown(page), `filter "${id || 'all'}"`).toEqual(want);
      await expect(page.locator('[data-filter-shown]')).toHaveText(
        String(want.rows.length).padStart(2, '0'),
      );
      groupsShown.add(want.groups.length);
    }
    expect((await shown(page)).rows).toHaveLength(PROJECT_COUNT);
    // Not vacuous: some filter does empty a group.
    expect(Math.min(...groupsShown)).toBeLessThan(Math.max(...groupsShown));
  });

  test('the URL keeps the filter, and a reload restores it before any script runs', async ({
    page,
  }) => {
    await gotoRel(page, 'work/');
    await filterReady(page);
    await chip(page, 'data-ml').click();
    await expect(page).toHaveURL(/\/work\/\?capability=data-ml$/);
    // Held back: the reload is painted filtered by CSS alone (the bootstrap's attribute).
    await page.route('**/_astro/MotionLayer*.js', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });
    await page.reload({ waitUntil: 'commit' });
    // The whole document is parsed; the module (and DOMContentLoaded) is still waiting.
    await page.locator('footer').waitFor({ state: 'attached' });
    await expect(page.locator(`${BAR}[data-ready]`)).toHaveCount(0);
    expect(await shown(page)).toEqual(await expected(page, 'data-ml'));
    await filterReady(page);
    await expect(chip(page, 'data-ml')).toHaveAttribute('aria-pressed', 'true');
    await expect(chip(page, '')).toHaveAttribute('aria-pressed', 'false');
    // "All" takes the parameter away again.
    await chip(page, '').click();
    await expect(page).toHaveURL(/\/work\/$/);
    expect((await shown(page)).rows).toHaveLength(PROJECT_COUNT);
  });

  test('an unknown capability in the URL is ignored', async ({ page }) => {
    await gotoRel(page, 'work/?capability=nope');
    await filterReady(page);
    await expect(chip(page, '')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).not.toHaveAttribute('data-capability');
    expect((await shown(page)).rows).toHaveLength(PROJECT_COUNT);
  });

  test('a polite live region announces how many projects show', async ({ page }) => {
    await gotoRel(page, 'work/');
    await filterReady(page);
    const status = page.locator(`${BAR} [role="status"]`);
    await expect(status).toBeAttached();
    await chip(page, 'languages').click();
    const n = (await expected(page, 'languages')).rows.length;
    await expect(status).toHaveText(`Showing ${n} of ${PROJECT_COUNT} projects`);
    await chip(page, '').click();
    await expect(status).toHaveText(`Showing ${PROJECT_COUNT} of ${PROJECT_COUNT} projects`);
  });

  test('works from the keyboard (Tab, Enter, Space)', async ({ page, browserName }) => {
    await gotoRel(page, 'work/');
    await filterReady(page);
    await chip(page, '').focus();
    await page.keyboard.press(tabKey(browserName));
    const second = page.locator(CHIP).nth(1);
    await expect(second).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(second).toHaveAttribute('aria-pressed', 'true');
    const id = (await second.getAttribute('data-capability')) ?? '';
    expect(await shown(page)).toEqual(await expected(page, id));
    await page.keyboard.press(tabKey(browserName));
    const third = page.locator(CHIP).nth(2);
    await expect(third).toBeFocused();
    await page.keyboard.press('Space');
    await expect(third).toHaveAttribute('aria-pressed', 'true');
    await expect(second).toHaveAttribute('aria-pressed', 'false');
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('there is no filter bar, and every row shows', async ({ page }) => {
      await gotoRel(page, 'work/');
      await expect(page.locator(BAR)).toBeHidden();
      expect((await shown(page)).rows).toHaveLength(PROJECT_COUNT);
    });
  });
});

test.describe('/work/ filter, motion on', () => {
  test.use({ reducedMotion: 'no-preference', viewport: { width: 1440, height: 900 } });

  test('the change is a view transition, and nothing of it is left behind', async ({ page }) => {
    await recordVtFilter(page);
    await gotoRel(page, 'work/');
    await filterReady(page);
    await chip(page, 'engines-systems').click();
    await expect(page.locator('html')).not.toHaveClass(/\bvt-filter\b/);
    const withVt = await page.evaluate(() => typeof document.startViewTransition === 'function');
    expect(await page.evaluate(() => window.__vtFilter)).toEqual(withVt ? ['add', 'remove'] : []);
    expect(await shown(page)).toEqual(await expected(page, 'engines-systems'));
    // Transition names exist only during the change.
    const names = await page
      .locator(ROW)
      .evaluateAll((els) => [...new Set(els.map((el) => getComputedStyle(el).viewTransitionName))]);
    expect(names).toEqual(['none']);
    expect(await page.locator('html').getAttribute('style')).toBeNull();
  });

  test('rows it brings on screen are shown, never left waiting for an entrance', async ({
    page,
  }) => {
    await gotoRel(page, 'work/');
    await page.waitForLoadState('load');
    await filterReady(page);
    // Scroll nowhere: the design rows are below the fold, waiting for their entrance.
    await expect(page.locator(`${ROW}[data-reveal-state="pending"]`).first()).toBeAttached();
    const waiting = await page
      .locator(`${ROW}[data-capabilities~="design-3d"][data-reveal-state="pending"]`)
      .count();
    expect(waiting, 'design rows waiting below the fold').toBeGreaterThan(0);
    await chip(page, 'design-3d').click();
    await expect(page.locator('html')).not.toHaveClass(/\bvt-filter\b/);
    await twoFrames(page);
    await twoFrames(page);
    const rows = await page.locator(ROW).evaluateAll((els) =>
      els
        .filter((el) => el.getClientRects().length > 0)
        .map((el) => ({
          slug: (el as HTMLElement).dataset.slug,
          state: el.getAttribute('data-reveal-state'),
          opacity: getComputedStyle(el).opacity,
        })),
    );
    expect(rows.length).toBe((await expected(page, 'design-3d')).rows.length);
    for (const row of rows) expect(row, row.slug).toMatchObject({ state: null, opacity: '1' });
  });

  test('the bar appearing shifts nothing', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'layout-shift entries are Chromium-only');
    await page.addInitScript(() => {
      window.__filterShifts = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__filterShifts!.push((entry as PerformanceEntry & { value: number }).value);
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.route('**/_astro/MotionLayer*.js', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });
    await gotoRel(page, 'work/');
    await filterReady(page);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.__filterShifts)).toEqual([]);
  });
});

test.describe('case study at 1440', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

  test('the section index follows the section being read', async ({ page }) => {
    await gotoRel(page, 'work/credential-correlation/');
    const nav = page.getByRole('navigation', { name: 'On this page' });
    await expect(nav).toBeVisible();
    const links = nav.getByRole('link');
    await expect(nav.locator('.case-index__label')).toHaveText([
      'Problem',
      'Approach',
      'What I built',
      'Figures',
    ]);
    await expect(nav.locator('.case-index__number')).toHaveText(['01', '02', '03', '04']);
    await expect(links.first()).toHaveAccessibleName('Problem');
    const hrefs = await links.evaluateAll((els) => els.map((el) => el.getAttribute('href')));
    expect(hrefs).toEqual(['#problem', '#approach', '#what-i-built', '#figures-title']);
    // The spy arrives with the case-study code, after load + idle (so does the lightbox).
    await expect(page.locator('.figure[data-zoomable]').first()).toBeAttached();
    await expect(nav.locator('[aria-current]')).toHaveCount(0);

    const current = async (id: string) => {
      await page.evaluate(
        (id) => document.getElementById(id)!.scrollIntoView({ behavior: 'instant' }),
        id,
      );
      await expect(nav.locator('[aria-current="true"]')).toHaveCount(1);
      await expect(nav.locator('[aria-current="true"]')).toHaveAttribute('href', `#${id}`);
    };
    await current('approach');
    await current('figures-title');
    await current('problem');
    // The tick sits on the current link (once its move — a transition, however short — is done).
    await expect(nav.locator('.case-index__tick')).toHaveCSS('opacity', '1');
    await expect
      .poll(async () => {
        const [tick, link] = await Promise.all([
          nav.locator('.case-index__tick').boundingBox(),
          nav.locator('[aria-current="true"]').boundingBox(),
        ]);
        return [
          Math.abs(Math.round(tick!.y - link!.y)),
          Math.abs(Math.round(tick!.height - link!.height)),
        ];
      })
      .toEqual([0, 0]);
    // A link jumps to its heading, which becomes current.
    await nav.getByRole('link', { name: 'What I built' }).click();
    await expect(page).toHaveURL(/#what-i-built$/);
    await expect(nav.locator('[aria-current="true"]')).toHaveAttribute('href', '#what-i-built');
  });

  test('the motion layer is fetched only after load (the LCP image never shares the line)', async ({
    page,
  }) => {
    await gotoRel(page, 'work/trip-planner/');
    await page.waitForLoadState('load');
    const timing = () =>
      page.evaluate(() => {
        const entry = performance
          .getEntriesByType('resource')
          .find((r) => /\/MotionLayer[^/]*\.js$/.test(r.name));
        const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        return entry ? { start: entry.startTime, load: nav!.loadEventStart } : null;
      });
    await expect.poll(timing).not.toBeNull();
    const { start, load } = (await timing())!;
    expect(start).toBeGreaterThanOrEqual(load);
    // …and it still wires the footer's Motion chip.
    await expect(page.locator('footer [data-motion-toggle]')).toBeVisible();
  });

  test('the reading-progress bar is decorative', async ({ page }) => {
    await gotoRel(page, 'work/credential-correlation/');
    await expect(page.locator('.case-progress')).toHaveAttribute('aria-hidden', 'true');
  });
});

test.describe('case study below 72rem', () => {
  test.use({ viewport: { width: 1100, height: 900 } });

  test('has no section index', async ({ page }) => {
    await gotoRel(page, 'work/credential-correlation/');
    await expect(page.locator('[data-case-index]')).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'On this page' })).toBeHidden();
  });
});

test.describe('figure lightbox', () => {
  // credential-correlation's fifth figure is the one with a large rendition.
  const PAGE = 'work/credential-correlation/';
  const FIGURE = '.figure[data-zoomable]';

  async function ready(page: Page): Promise<void> {
    await gotoRel(page, PAGE);
    await page.waitForLoadState('load');
    const figure = page.locator(FIGURE).first();
    await expect(figure).toBeAttached();
    await figure.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect(figure.locator('img')).toHaveJSProperty('complete', true);
  }

  for (const reducedMotion of ['reduce', 'no-preference'] as const) {
    test.describe(`motion ${reducedMotion === 'reduce' ? 'reduced' : 'on'}`, () => {
      test.use({ reducedMotion });

      test('opens on a click on the image; Esc closes it; focus returns to the link', async ({
        page,
      }, testInfo) => {
        await ready(page);
        const figure = page.locator(FIGURE).first();
        const link = figure.locator('a[data-lightbox-trigger]');
        const n = await figure.getAttribute('data-figure');
        await expect(link).toHaveAttribute('aria-haspopup', 'dialog');
        await figure.locator('img').click();
        const dialog = page.getByRole('dialog', { name: `Figure ${n}` });
        await expect(dialog).toBeVisible();
        await expect(page.locator('html')).not.toHaveClass(/\bvt-lightbox\b/);
        const y = await page.evaluate(() => scrollY);
        await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
        await expect(dialog.locator('img')).toHaveAttribute('alt', /\S/);
        // The large rendition is what it ends up showing.
        const href = (await link.getAttribute('href')) ?? '';
        await expect
          .poll(() => dialog.locator('img').evaluate((img: HTMLImageElement) => img.currentSrc))
          .toContain(href);
        // The page behind can't scroll.
        await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden');
        if (testInfo.project.name !== 'webkit') {
          // (Mobile WebKit has no mouse wheel.)
          await page.mouse.wheel(0, 600);
          await page.waitForTimeout(150);
          expect(await page.evaluate(() => scrollY)).toBe(y);
        }

        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
        await expect(link).toBeFocused();
        await expect(page.locator('html')).not.toHaveClass(/lightbox-open|vt-lightbox/);
        expect(await page.evaluate(() => scrollY)).toBe(y);
        // No transition name is left on the thumbnail or the dialog image.
        for (const img of [figure.locator('img'), page.locator('dialog[data-lightbox] img')]) {
          await expect(img).toHaveCSS('view-transition-name', 'none');
        }
      });
    });
  }

  test('opens from the Full size link with Enter; the close button closes it', async ({ page }) => {
    await ready(page);
    const link = page.locator(`${FIGURE} a[data-lightbox-trigger]`).first();
    await link.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${PAGE}$`));
    const close = dialog.getByRole('button', { name: 'Close' });
    await expect(close).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    await expect(link).toBeFocused();
  });

  test('a click on the backdrop closes it', async ({ page }) => {
    await ready(page);
    await page.locator(`${FIGURE} img`).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // (While the image morphs, the transition's overlay takes every click.)
    await expect(page.locator('html')).not.toHaveClass(/\bvt-lightbox\b/);
    const size = page.viewportSize()!;
    // The empty stage beside the picture.
    await page.mouse.click(4, size.height / 2);
    await expect(dialog).toBeHidden();
  });

  for (const colorScheme of ['dark', 'light'] as const) {
    test(`axe finds nothing with it open (${colorScheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme, reducedMotion: 'no-preference' });
      await ready(page);
      await page.locator(`${FIGURE} img`).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.locator('html')).not.toHaveClass(/\bvt-lightbox\b/);
      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual(
        [],
      );
    });
  }

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('the Full size link opens the large image', async ({ page, request }) => {
      await gotoRel(page, PAGE);
      const href = await page.locator('a[data-lightbox-trigger]').first().getAttribute('href');
      expect(href).toMatch(/^\/Portfolio\/_astro\/.+\.webp$/);
      const response = await request.get(href!);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toMatch(/^image\/webp/);
    });
  });
});

test.describe('footer status line', () => {
  const LINE = '[data-clock]';
  const TIME = '[data-clock-time]';

  const pulses = (page: Page) =>
    page
      .locator(`${LINE} .status-line__dot`)
      .evaluate((el) => el.getAnimations({ subtree: true }).length);

  test('shows the build SHA and date, and reads them out plainly', async ({ page, request }) => {
    await gotoRel(page, '');
    const line = page.locator(LINE);
    const spoken = (await line.locator('.visually-hidden').textContent()) ?? '';
    expect(spoken).toBe(spoken.trim());
    const match = /^Build ([0-9a-f]{7}|local), [A-Z][a-z]+ \d{1,2}, \d{4}$/.exec(spoken);
    expect(match, spoken).not.toBeNull();
    await expect(line.locator('.status-line__visual')).toHaveAttribute('aria-hidden', 'true');
    await expect(line.locator('.status-line__sha')).toHaveText(match![1]!);
    await expect(line).toContainText(/\d{4}-\d{2}-\d{2}/);
    // The same build on every page.
    const html = await (await request.get('work/')).text();
    expect(html).toContain(`Build ${match![1]}`);
    await expect(page.locator('footer [data-motion-toggle]')).toBeVisible();
  });

  test.describe('motion on', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('the clock ticks while on screen, and stops offscreen', async ({ page }) => {
      await gotoRel(page, '');
      await page.locator('footer').scrollIntoViewIfNeeded();
      const line = page.locator(LINE);
      await expect(line).toHaveAttribute('data-state', 'live', { timeout: 10_000 });
      const time = page.locator(TIME);
      const first = (await time.textContent()) ?? '';
      expect(first).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      await expect.poll(() => time.textContent(), { timeout: 3000 }).not.toBe(first);
      expect(await pulses(page)).toBeGreaterThan(0);
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await expect(line).toHaveAttribute('data-state', 'paused');
      const held = await time.textContent();
      await page.waitForTimeout(1300);
      expect(await time.textContent()).toBe(held);
      expect(await pulses(page)).toBe(0);
    });

    test('the footer Motion toggle stops it on the build time', async ({ page, request }) => {
      const ssr = /data-clock-time[^>]*>\s*(\d{2}:\d{2}:\d{2})\s*</.exec(
        await (await request.get('work/')).text(),
      )?.[1];
      await gotoRel(page, 'work/');
      await page.locator('footer').scrollIntoViewIfNeeded();
      await expect(page.locator(LINE)).toHaveAttribute('data-state', 'live', { timeout: 10_000 });
      await page.locator('footer [data-motion-toggle]').click();
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
      await expect(page.locator(LINE)).toHaveAttribute('data-state', 'static');
      await expect(page.locator(TIME)).toHaveText(ssr!);
      await page.waitForTimeout(1300);
      await expect(page.locator(TIME)).toHaveText(ssr!);
      expect(await pulses(page)).toBe(0);
    });
  });

  for (const [name, setup] of [
    ['reduced motion', (page: Page) => page.emulateMedia({ reducedMotion: 'reduce' })],
    [
      'the Motion toggle off',
      (page: Page) => page.addInitScript(() => localStorage.setItem('motion', 'off')),
    ],
  ] as const) {
    test(`with ${name}, the clock is frozen on the build time`, async ({ page, request }) => {
      await setup(page);
      const ssr = /data-clock-time[^>]*>\s*(\d{2}:\d{2}:\d{2})\s*</.exec(
        await (await request.get('')).text(),
      )?.[1];
      expect(ssr).toBeDefined();
      await gotoRel(page, '');
      await page.waitForLoadState('load');
      await page.locator('footer').scrollIntoViewIfNeeded();
      await expect(page.locator(LINE)).toHaveAttribute('data-state', 'static', { timeout: 5000 });
      await expect(page.locator(TIME)).toHaveText(ssr!);
      await page.waitForTimeout(1300);
      await expect(page.locator(TIME)).toHaveText(ssr!);
      expect(await pulses(page)).toBe(0);
    });
  }
});

test.describe('in-page scrolling (Ruling G9)', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('a page loaded at a fragment lands on it at once', async ({ page }) => {
    await page.addInitScript(() => {
      window.__loadYs = [];
      addEventListener('load', () => {
        const start = performance.now();
        const sample = () => {
          window.__loadYs!.push(Math.round(scrollY));
          if (performance.now() - start < 700) requestAnimationFrame(sample);
        };
        sample();
      });
    });
    await gotoRel(page, '#about');
    await page.waitForLoadState('load');
    await page.waitForTimeout(900);
    const ys = (await page.evaluate(() => window.__loadYs)) ?? [];
    expect(ys.length).toBeGreaterThan(3);
    expect(ys[0]).toBeGreaterThan(0);
    expect(new Set(ys).size, `scroll positions after load: ${[...new Set(ys)]}`).toBe(1);
    await expect(page.locator('#about')).toBeInViewport();
    await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');
  });

  for (const motion of ['on', 'off'] as const) {
    test(`a same-page anchor click ${motion === 'on' ? 'glides' : 'jumps'} (motion ${motion})`, async ({
      page,
    }) => {
      if (motion === 'off') await page.addInitScript(() => localStorage.setItem('motion', 'off'));
      await gotoRel(page, '');
      await page.waitForLoadState('load');
      await page.evaluate(() => {
        window.__scrollYs = [];
        addEventListener('scroll', () => window.__scrollYs!.push(Math.round(scrollY)));
      });
      await page.locator('.site-nav a', { hasText: 'About' }).click();
      await expect(page).toHaveURL(/#about$/);
      await expect(page.locator('#about')).toBeInViewport();
      await expect(page.locator('html')).not.toHaveClass(/\bsmooth-scroll\b/, { timeout: 3000 });
      const ys = (await page.evaluate(() => window.__scrollYs)) ?? [];
      const target = ys.at(-1) ?? 0;
      expect(target).toBeGreaterThan(0);
      const between = ys.filter((y) => y > 0 && y < target).length;
      if (motion === 'on') expect(between, `positions on the way: ${ys}`).toBeGreaterThan(1);
      else expect(between, `positions on the way: ${ys}`).toBe(0);
    });
  }
});
