/**
 * /work/ filter, case-study instruments, figure lightbox, footer, in-page scrolling
 * (interactions spec §4, §5; Ruling G9).
 * - /work/ capability filter: chip counts; a chip hides exactly the rows without its capability,
 *   and a showcase it leaves empty says so; `?capability=` is kept in the URL and restores the filter on load —
 *   painted filtered before any script runs — while an unknown value is ignored (and dropped from
 *   the URL), and a filter whose script never arrives fails open; a polite live
 *   region announces "Showing N of 15 projects"; the chips work from the keyboard; with motion on
 *   the change is a view transition that leaves nothing behind; each showcase's lead moves to
 *   its first project still shown; the bar appearing shifts nothing; without JS there is no bar
 *   and every row shows.
 * - Case study at 1440: the "On this page" index, whose scrollspy follows the section being read;
 *   below 72rem there is none. The reading-progress bar is decorative. The motion layer (footer
 *   chip, index, lightbox) is fetched only after load there.
 * - Lightbox: opens from a figure image (click) and its "Full size" link (Enter); Esc, the close
 *   button and the backdrop close it; focus goes to the close button and back to the link; the
 *   page can't scroll behind it; it is named "Figure n"; axe finds nothing with it open.
 * - Footer: the copyright line, the Motion chip and a back-to-top link, on one row (stacked on
 *   narrow phones), and nothing else.
 * - A page loaded at a fragment lands on it at once; a same-page anchor click glides with motion
 *   on and jumps with it off, keeping the hash.
 * - Without view transitions at all, the theme switch, the filter and the lightbox still work,
 *   with no errors.
 * Runs on every project (desktop Chromium, Pixel 7, iPhone 15 / WebKit).
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import { themeToggle } from './helpers/header.ts';
import { gotoRel, ROUTES } from './helpers/routes.ts';

declare global {
  interface Window {
    __vtFilter?: ('add' | 'remove')[];
    __filterShifts?: number[];
    __capability?: (string | null)[];
    __vts?: ViewTransition[];
    __loadYs?: number[];
    __scrollYs?: number[];
  }
}

const PROJECT_COUNT = ROUTES.filter((route) => /^work\/[^/]+\/$/.test(route)).length;
const BAR = '[data-work-filter]';
const CHIP = `${BAR} button[data-capability]`;
const ROW = '[data-filter-list] [data-filter-row]';
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/** Safari reaches buttons and links with Option+Tab (plain Tab only visits text fields). */
const tabKey = (browserName: string) => (browserName === 'webkit' ? 'Alt+Tab' : 'Tab');

const chip = (page: Page, id: string) => page.locator(`${CHIP}[data-capability="${id}"]`);

/** The filter bar and the showcases have been wired by the motion layer (the chips work). */
async function filterReady(page: Page): Promise<void> {
  await expect(page.locator(`${BAR}[data-ready]`)).toBeAttached();
  await expect(page.locator(CHIP).first()).toBeVisible();
  await expect(page.locator('[data-showcase]:not([data-ready])')).toHaveCount(0);
}

/** Projects of the rows that are rendered, and the showcases not showing their empty note. */
function shown(page: Page): Promise<{ rows: string[]; groups: string[] }> {
  return page.evaluate(() => ({
    rows: [...document.querySelectorAll<HTMLElement>('[data-filter-list] [data-filter-row]')]
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => el.dataset.project ?? ''),
    groups: [...document.querySelectorAll<HTMLElement>('[data-filter-list] [data-showcase]')]
      .filter((el) => !el.hasAttribute('data-empty'))
      .map((el) => el.getAttribute('aria-labelledby') ?? ''),
  }));
}

/** What the filter should show for `id`, from the rows' own `data-capabilities`. */
function expected(page: Page, id: string): Promise<{ rows: string[]; groups: string[] }> {
  return page.evaluate((id) => {
    const match = (el: Element) =>
      id === '' || (el.getAttribute('data-capabilities') ?? '').split(' ').includes(id);
    return {
      rows: [...document.querySelectorAll<HTMLElement>('[data-filter-list] [data-filter-row]')]
        .filter(match)
        .map((el) => el.dataset.project ?? ''),
      groups: [...document.querySelectorAll<HTMLElement>('[data-filter-list] [data-showcase]')]
        .filter((group) => [...group.querySelectorAll('[data-filter-row]')].some(match))
        .map((el) => el.getAttribute('aria-labelledby') ?? ''),
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

  test('each chip hides the rows without its capability, and an emptied showcase says so', async ({
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
    // Not vacuous: some filter does empty a showcase.
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
    // (Rows only: a showcase's empty note is the script's.)
    expect((await shown(page)).rows).toEqual((await expected(page, 'data-ml')).rows);
    await filterReady(page);
    await expect(chip(page, 'data-ml')).toHaveAttribute('aria-pressed', 'true');
    await expect(chip(page, '')).toHaveAttribute('aria-pressed', 'false');
    // "All" takes the parameter away again.
    await chip(page, '').click();
    await expect(page).toHaveURL(/\/work\/$/);
    expect((await shown(page)).rows).toHaveLength(PROJECT_COUNT);
  });

  test('an unknown capability in the URL is ignored, and dropped from it', async ({ page }) => {
    await gotoRel(page, 'work/?capability=nope');
    await filterReady(page);
    await expect(chip(page, '')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).not.toHaveAttribute('data-capability');
    expect((await shown(page)).rows).toHaveLength(PROJECT_COUNT);
    await expect(page).toHaveURL(/\/work\/$/);
  });

  for (const [how, respond] of [
    // The module fails to load (its `error` event).
    ['fails to load', (route: Route) => route.abort('failed')],
    // It loads, but never wires the chips (the 3 s-after-load fallback).
    [
      'never wires the chips',
      (route: Route) => route.fulfill({ contentType: 'text/javascript', body: 'export {};' }),
    ],
  ] as const) {
    test(`fails open when the filter's script ${how}: every row shows`, async ({ page }) => {
      await page.route('**/_astro/MotionLayer*.js', respond);
      await page.addInitScript(() => {
        window.__capability = [];
        new MutationObserver(() =>
          window.__capability!.push(document.documentElement.getAttribute('data-capability')),
        ).observe(document, {
          attributes: true,
          subtree: true,
          attributeFilter: ['data-capability'],
        });
      });
      await gotoRel(page, 'work/?capability=data-ml');
      await page.waitForLoadState('load');
      await expect(page.locator('html')).not.toHaveAttribute('data-capability', {
        timeout: 5000,
      });
      // It was applied before first paint, then given up on.
      expect(await page.evaluate(() => window.__capability)).toEqual(['data-ml', null]);
      expect((await shown(page)).rows).toHaveLength(PROJECT_COUNT);
      await expect(page.locator(BAR)).toBeHidden();
    });
  }

  test("each showcase's lead stays while shown, else moves to its first project shown", async ({
    page,
  }) => {
    await gotoRel(page, 'work/');
    await filterReady(page);
    const state = () =>
      page.locator('[data-showcase]').evaluateAll((els) =>
        els.map((el) => ({
          name: el.getAttribute('aria-labelledby') ?? '',
          rows: [...el.querySelectorAll<HTMLElement>('[data-filter-row]')]
            .filter((row) => row.getClientRects().length > 0)
            .map((row) => row.dataset.project ?? ''),
          leads: [...el.querySelectorAll<HTMLElement>('[data-lead]:not([hidden])')].map(
            (lead) => lead.dataset.lead ?? '',
          ),
          on: [...el.querySelectorAll<HTMLElement>('[data-filter-row][data-on]')].map(
            (row) => row.dataset.project ?? '',
          ),
        })),
      );
    let before = await state();
    let moved = 0;
    for (const id of ['design-3d', 'data-ml', 'languages', '']) {
      await chip(page, id).click();
      const after = await state();
      after.forEach(({ name, rows, leads, on }, i) => {
        if (rows.length === 0) return;
        const prev = before[i]!.leads[0]!;
        const want = rows.includes(prev) ? prev : rows[0];
        if (want !== prev) moved++;
        expect(leads, `${name} lead with "${id || 'all'}"`).toEqual([want]);
        expect(on, `${name} marked row with "${id || 'all'}"`).toEqual([want]);
      });
      before = after;
    }
    expect(moved, 'some filter hid a lead').toBeGreaterThan(0);
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

  test.describe('motion on', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('Esc during the opening morph still closes with a morph', async ({ page }) => {
      await page.addInitScript(() => {
        const start = Document.prototype.startViewTransition;
        if (typeof start !== 'function') return;
        window.__vts = [];
        Document.prototype.startViewTransition = function (this: Document, update) {
          const vt = start.call(this, update);
          window.__vts!.push(vt);
          return vt;
        } as typeof start;
      });
      await ready(page);
      test.skip(!(await page.evaluate(() => Array.isArray(window.__vts))), 'no view transitions');
      const link = page.locator(`${FIGURE} a[data-lightbox-trigger]`).first();
      await page.locator(`${FIGURE} img`).first().click();
      // Hold the opening morph mid-flight, then press Esc.
      await page.evaluate(async () => {
        await window.__vts!.at(-1)!.ready;
        for (const animation of document.getAnimations()) animation.pause();
      });
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      const morphs = await page.evaluate(async () => {
        await window.__vts!.at(-1)!.ready;
        return {
          transitions: window.__vts!.length,
          image: document
            .getAnimations()
            .some(
              (a) =>
                (a.effect as KeyframeEffect | null)?.pseudoElement ===
                '::view-transition-group(lightbox-image)',
            ),
        };
      });
      expect(morphs).toEqual({ transitions: 2, image: true });
      await expect(page.locator('dialog[data-lightbox]')).not.toHaveAttribute('open');
      await expect(link).toBeFocused();
      await expect(page.locator('html')).not.toHaveClass(/lightbox-open|vt-lightbox/);
      for (const img of [
        page.locator(`${FIGURE} img`).first(),
        page.locator('dialog[data-lightbox] img'),
      ]) {
        await expect(img).toHaveCSS('view-transition-name', 'none');
      }
    });
  });

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

/**
 * Without view transitions (older browsers; stubbed here), every change the motion layer would
 * animate still happens, at once and without errors: the theme switch, the /work/ filter and
 * the figure lightbox.
 */
test.describe('without view transitions', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the theme, the filter and the lightbox all still work, with no errors', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      (document as { startViewTransition?: unknown }).startViewTransition = undefined;
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
    });
    const html = page.locator('html');

    await gotoRel(page, 'work/');
    await filterReady(page);
    expect(await page.evaluate(() => typeof document.startViewTransition)).toBe('undefined');
    // The theme switches, instantly: no transition class, no scanline.
    const before = await html.getAttribute('data-scheme');
    await themeToggle(page).click();
    await expect.poll(() => html.getAttribute('data-scheme')).not.toBe(before);
    await expect(html).not.toHaveClass(/\bvt-/);
    await expect(page.locator('.theme-scan')).toHaveCount(0);
    await page.keyboard.press('Escape'); // (the phone menu, if the switch was in it)
    // The filter applies at once.
    await chip(page, 'engines-systems').click();
    await expect(chip(page, 'engines-systems')).toHaveAttribute('aria-pressed', 'true');
    expect(await shown(page)).toEqual(await expected(page, 'engines-systems'));
    await expect(html).not.toHaveClass(/\bvt-/);

    // The lightbox opens and closes at once, focus going there and back.
    await gotoRel(page, 'work/credential-correlation/');
    await page.waitForLoadState('load');
    const figure = page.locator('.figure[data-zoomable]').first();
    await expect(figure).toBeAttached({ timeout: 10_000 });
    await figure.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await figure.locator('img').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
    await expect(html).not.toHaveClass(/\bvt-/);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(figure.locator('a[data-lightbox-trigger]')).toBeFocused();
    expect(errors).toEqual([]);
  });
});

test.describe('footer', () => {
  test.use({ reducedMotion: 'no-preference' });

  /** Stacked below 40rem (SiteFooter.astro); one row from there up. */
  const ROW_FROM = 640;

  const expectLayout = async (page: Page) => {
    const footer = page.locator('footer');
    const copyright = footer.locator('p');
    await expect(copyright).toHaveCount(1);
    await expect(copyright).toHaveText(/^\s*© \d{4}\s+Parker Jackim\s*$/);
    const top = footer.locator('a');
    await expect(top).toHaveCount(1);
    await expect(top).toHaveText(/Back to top/);
    await expect(top).toHaveAttribute('href', '#main');
    const chip = footer.locator('[data-motion-toggle]');
    await expect(chip).toBeVisible({ timeout: 10_000 });
    const text = (await copyright.boundingBox())!;
    const button = (await chip.boundingBox())!;
    if (page.viewportSize()!.width >= ROW_FROM) {
      // One row: centred on the same line, the chip at the end.
      expect(button.y + button.height / 2).toBeCloseTo(text.y + text.height / 2, 0);
      expect(button.x).toBeGreaterThan(text.x + text.width);
    } else {
      // Stacked: the chip below, both at the start.
      expect(button.y).toBeGreaterThanOrEqual(text.y + text.height);
      expect(button.x).toBeCloseTo(text.x, 0);
    }
  };

  // The home page has a second chip (the hero's); the footer's must still be there and work.
  for (const [name, path] of [
    ['home', ''],
    ['work index', 'work/'],
    ['a case study', 'work/trip-planner/'],
  ] as const) {
    test(`${name}: the copyright and a working Motion chip, on one row (stacked on phones)`, async ({
      page,
    }) => {
      await gotoRel(page, path);
      await page.waitForLoadState('load');
      await expectLayout(page);
      const html = page.locator('html');
      const chip = page.locator('footer [data-motion-toggle]');
      await expect(chip).toHaveAttribute('aria-pressed', 'true');
      await chip.click();
      await expect(html).toHaveAttribute('data-motion', 'off');
      // Every chip on the page follows (home: the hero's too).
      await expect(page.locator('[data-motion-toggle][aria-pressed="true"]')).toHaveCount(0);
      await chip.click();
      await expect(html).not.toHaveAttribute('data-motion');
      await expect(page.locator('[data-motion-toggle][aria-pressed="false"]')).toHaveCount(0);
    });
  }

  test('a small tablet keeps the one row', async ({ page }) => {
    await page.setViewportSize({ width: 660, height: 900 });
    await gotoRel(page, 'work/');
    await expectLayout(page);
  });
});

test.describe('in-page scrolling (Ruling G9)', () => {
  // The home page's sections (#about …) are there from 40rem; phones get them as pages.
  test.use({ reducedMotion: 'no-preference', viewport: { width: 1280, height: 800 } });

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

  test('a malformed fragment in a link breaks nothing', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await gotoRel(page, '');
    await page.waitForLoadState('load');
    await page.evaluate(() => {
      const link = document.createElement('a');
      link.href = '#%zz';
      link.textContent = 'malformed';
      link.id = 'malformed-link';
      document.querySelector('main')!.prepend(link);
    });
    await page.locator('#malformed-link').click();
    await expect(page).toHaveURL(/#%zz$/);
    await expect(page.locator('html')).not.toHaveClass(/\bsmooth-scroll\b/);
    expect(errors).toEqual([]);
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
