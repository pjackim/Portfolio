/**
 * Cards, sections, reveals, theme reveal (interactions spec §3, §5).
 * - Card targeting reticle: hidden at rest; locked on (brackets + readout) by hover with a fine
 *   pointer and by keyboard focus; faint and static on touch screens. The spotlight follows the
 *   pointer through CSSOM custom properties (one delegated listener).
 * - Archive rows: the surface wash is clipped away at rest and wipes in on hover and focus.
 * - Section headings: the label decrypts once on an aria-hidden layer (the h2's text and the
 *   section's name never change), the index counts up from 00; nothing plays with motion off.
 * - Scroll reveals are live with motion allowed (never on the first card row) and complete
 *   no-ops under reduced motion or the Motion toggle.
 * - The theme toggle switches with motion on (a circular-reveal view transition whose
 *   `vt-theme` class and --vt-* properties are gone afterwards) and off (instant, no class), with
 *   no console errors; rapid double clicks leave no class behind.
 * - axe finds nothing with the reticle locked on.
 * Runs on every project (desktop Chromium, Pixel 7, iPhone 15 / WebKit).
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { gotoRel } from './helpers/routes.ts';

declare global {
  interface Window {
    __vtClass?: ('add' | 'remove')[];
    __decrypt?: (string | null)[];
    __count?: string[];
  }
}

const CARD = '.project-grid > .card';
const REVEALED = '[data-reveal]:not([data-reveal="contents"]), [data-reveal="contents"] > *';

/** Computed opacity of a pseudo-element. */
const pseudoOpacity = (page: Page, selector: string, pseudo: '::before' | '::after') =>
  page
    .locator(selector)
    .first()
    .evaluate((el, pseudo) => Number(getComputedStyle(el, pseudo).opacity), pseudo);

/** Both bracket pairs' opacity for the first card. */
const brackets = async (page: Page) => [
  await pseudoOpacity(page, `${CARD} .card__hud`, '::before'),
  await pseudoOpacity(page, `${CARD} .card__hud`, '::after'),
];

const finePointer = (page: Page) => page.evaluate(() => matchMedia('(hover: hover)').matches);

/** Collects uncaught errors and console errors from the next navigation on. */
function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
  });
  return errors;
}

/** Records every add/remove of `vt-theme` on <html>, from before any script runs. */
async function recordVtClass(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__vtClass = [];
    let had = false;
    // <html> may not exist yet: watch the document for it.
    new MutationObserver(() => {
      const has = document.documentElement?.classList.contains('vt-theme') ?? false;
      if (has !== had) window.__vtClass!.push(has ? 'add' : 'remove');
      had = has;
    }).observe(document, { attributes: true, subtree: true, attributeFilter: ['class'] });
  });
}

/** Waits out a smooth scroll (motion on: focusing scrolls smoothly) until the page is still. */
async function scrollSettled(page: Page): Promise<void> {
  let last = -1;
  await expect
    .poll(async () => {
      const y = await page.evaluate(() => scrollY);
      const still = y === last;
      last = y;
      return still;
    })
    .toBe(true);
}

/** The card/heading module (fetched by the motion layer after load + idle) has arrived. */
const interactionsLoaded = (page: Page) =>
  page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .some((r) => /\/interactions\.[\w-]+\.js$/.test(r.name)),
  );

/** Moves a fine pointer onto the first card's cover (the stretched link covers the card). */
async function pointAtCover(page: Page): Promise<void> {
  const box = (await page.locator(`${CARD} .card__media`).first().boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 3 });
}

/** Motion switched off by the site toggle, before first paint (as a returning visitor). */
async function motionOffByToggle(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('motion', 'off'));
}

async function scrollIntoView(page: Page, selector: string, block: ScrollLogicalPosition) {
  await page
    .locator(selector)
    .first()
    .evaluate((el, block) => el.scrollIntoView({ block, behavior: 'instant' }), block);
}

test.describe('card reticle', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('locks on under a fine pointer, and is hidden (or faint on touch) at rest', async ({
    page,
  }) => {
    await gotoRel(page, '');
    await scrollIntoView(page, '#work', 'start');
    if (!(await finePointer(page))) {
      // Touch screens: the brackets rest on the frame at 30%, nothing else.
      expect(await brackets(page)).toEqual([0.3, 0.3]);
      expect(await pseudoOpacity(page, CARD, '::before'), 'no spotlight').toBe(0);
      return;
    }
    expect(await brackets(page)).toEqual([0, 0]);
    await pointAtCover(page);
    await expect.poll(() => brackets(page)).toEqual([1, 1]);
    await expect(page.locator(`${CARD} .card__readout`).first()).toHaveCSS('opacity', '1');
    // Leaving lets go.
    await page.mouse.move(2, 2);
    await expect.poll(() => brackets(page)).toEqual([0, 0]);
  });

  test('locks on for keyboard focus, and the HUD stays hidden from assistive tech', async ({
    page,
    browserName,
  }) => {
    await gotoRel(page, '');
    const hud = page.locator(`${CARD} .card__hud`).first();
    await expect(hud).toHaveAttribute('aria-hidden', 'true');
    // Tab from the heading's action link (just before the first card) onto the card's link.
    await page.locator('#work .section-heading__action').focus();
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
    const link = page.locator(`${CARD} .card__title a`).first();
    await expect(link).toBeFocused();
    await expect.poll(() => brackets(page)).toEqual([1, 1]);
    await expect(page.locator(`${CARD} .card__readout`).first()).toHaveCSS('opacity', '1');
    // The link's name is the title alone: the readout chip adds nothing.
    await expect(link).toHaveAccessibleName('Credential Correlation Visualizer');
  });

  test('the spotlight follows the pointer (CSSOM custom properties)', async ({ page }) => {
    await gotoRel(page, '');
    test.skip(!(await finePointer(page)), 'no spotlight on touch screens');
    await scrollIntoView(page, '#work', 'start');
    const card = page.locator(CARD).nth(1);
    const box = (await card.boundingBox())!;
    // The listener arrives with the motion layer after load + idle: keep moving until it answers.
    let step = 0;
    await expect
      .poll(async () => {
        step++;
        await page.mouse.move(box.x + 40 + step, box.y + box.height - 60);
        return card.evaluate((el: HTMLElement) => el.style.getPropertyValue('--mx'));
      })
      .toMatch(/^\d+px$/);
    await page.mouse.move(box.x + 100, box.y + 50);
    await expect
      .poll(() => card.evaluate((el: HTMLElement) => el.style.getPropertyValue('--my')))
      .toBe('50px');
    await expect.poll(() => pseudoOpacity(page, `${CARD}:nth-child(2)`, '::before')).toBe(1);
    // CSSOM only: no style attribute ever came from the server.
    const html = await (await page.request.get('')).text();
    expect(html).not.toMatch(/\sstyle="/);
  });
});

test.describe('card reticle, reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('still locks on, instantly, with no scan and no spotlight', async ({ page }) => {
    await gotoRel(page, '');
    await scrollIntoView(page, '#work', 'start');
    test.skip(!(await finePointer(page)), 'hover only');
    await pointAtCover(page);
    await expect.poll(() => brackets(page)).toEqual([1, 1]);
    const scan = page.locator(`${CARD} .card__scan`).first();
    expect(await scan.evaluate((el) => el.getAnimations().length)).toBe(0);
    expect(await pseudoOpacity(page, CARD, '::before'), 'no spotlight').toBe(0);
  });
});

test.describe('archive rows', () => {
  const wash = (page: Page, selector: string) =>
    page
      .locator(selector)
      .evaluate((el) => getComputedStyle(el, '::before').clipPath.replace(/\s+/g, ' '));

  test('the wash wipes in on hover and on keyboard focus', async ({ page, browserName }) => {
    await gotoRel(page, 'work/');
    const row = '.archive-row >> nth=1';
    expect(await wash(page, row)).toBe('inset(0px 100% 0px 0px)');
    if (await finePointer(page)) {
      await page.locator(row).hover();
      await expect.poll(() => wash(page, row)).toBe('inset(0px)');
      await page.mouse.move(2, 2);
      await expect.poll(() => wash(page, row)).toBe('inset(0px 100% 0px 0px)');
    }
    await page.locator('.archive-row >> nth=0').locator('a').focus();
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
    await expect(page.locator(row).locator('a')).toBeFocused();
    await expect.poll(() => wash(page, row)).toBe('inset(0px)');
  });
});

test.describe('section headings, motion on', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the label decrypts once over the real text; the index counts up', async ({ page }) => {
    await page.addInitScript(() => {
      window.__decrypt = [];
      window.__count = [];
      document.addEventListener('DOMContentLoaded', () => {
        const title = document.querySelector('#about-title');
        const count = document.querySelector('#about [data-count]');
        new MutationObserver(() =>
          window.__decrypt!.push(title!.getAttribute('data-decrypt')),
        ).observe(title!, { attributes: true, attributeFilter: ['data-decrypt'] });
        new MutationObserver(() => window.__count!.push(count!.textContent ?? '')).observe(count!, {
          childList: true,
          characterData: true,
          subtree: true,
        });
      });
    });
    await gotoRel(page, '');
    await page.waitForLoadState('load');
    const section = page.locator('#about');
    await expect(section).toHaveAccessibleName('About');
    // The motion layer arrives after load + idle; bring the heading in once it has.
    await expect.poll(() => interactionsLoaded(page)).toBe(true);
    await scrollIntoView(page, '#about .section-heading', 'center');
    await expect
      .poll(() => page.evaluate(() => window.__decrypt), { timeout: 5000 })
      .toEqual(['', null]);
    const title = page.locator('#about-title');
    await expect(title).toHaveText('About');
    await expect(title.locator('.section-heading__decrypt')).toHaveCount(0);
    await expect(section).toHaveAccessibleName('About');
    const counts = (await page.evaluate(() => window.__count)) ?? [];
    expect(counts[0]).toBe('00');
    expect(counts.at(-1)).toBe('02');
    // First time only: scrolling away and back doesn't replay it.
    await scrollIntoView(page, 'footer', 'end');
    await scrollIntoView(page, '#about .section-heading', 'center');
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => window.__decrypt)).toEqual(['', null]);
  });
});

for (const [name, setup] of [
  ['reduced motion', (page: Page) => page.emulateMedia({ reducedMotion: 'reduce' })],
  ['the Motion toggle off', motionOffByToggle],
] as const) {
  test.describe(`with ${name}`, () => {
    test.use({ reducedMotion: 'no-preference' });

    test('reveals, rule draws and decrypts are complete no-ops', async ({ page }) => {
      await setup(page);
      await page.addInitScript(() => {
        window.__decrypt = [];
        new MutationObserver((records) => {
          for (const record of records) {
            if (record.attributeName === 'data-decrypt') window.__decrypt!.push('changed');
          }
        }).observe(document, {
          attributes: true,
          subtree: true,
          attributeFilter: ['data-decrypt'],
        });
      });
      for (const path of ['', 'work/credential-correlation/']) {
        await gotoRel(page, path);
        await page.waitForLoadState('load');
        const states = await page.locator(REVEALED).evaluateAll((els) =>
          els.map((el) => {
            const style = getComputedStyle(el);
            return `${el.getAnimations().length}|${style.opacity}|${style.clipPath}|${style.translate}`;
          }),
        );
        expect(states.length, `revealed elements on ${path || 'home'}`).toBeGreaterThan(0);
        expect(new Set(states)).toEqual(new Set(['0|1|none|none']));
        const rules = await page
          .locator('.section-heading__rule')
          .evaluateAll((els) => els.map((el) => el.getAnimations().length));
        expect(rules.every((n) => n === 0)).toBe(true);
      }
      await gotoRel(page, '');
      // The heading code does load (the layer is there); it just never plays.
      await expect.poll(() => interactionsLoaded(page)).toBe(true);
      await scrollIntoView(page, '#about .section-heading', 'center');
      await page.waitForTimeout(1000);
      expect(await page.evaluate(() => window.__decrypt)).toEqual([]);
      await expect(page.locator('#about [data-count]')).toHaveText('02');
    });
  });
}

test.describe('reveals, motion on', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('run on a view timeline below the fold, never on the first card row', async ({ page }) => {
    await gotoRel(page, '');
    const supported = await page.evaluate(() =>
      CSS.supports('(animation-timeline: view()) and (animation-range: entry)'),
    );
    test.skip(!supported, 'no scroll-driven animations: everything is simply shown');
    const firstRow = await page
      .locator(`${CARD}:nth-child(-n + 2)`)
      .evaluateAll((els) => els.map((el) => el.getAnimations().length));
    expect(firstRow).toEqual([0, 0]);
    const timelines = await page.locator(REVEALED).evaluateAll((els) =>
      els.map((el) => {
        const [animation] = el.getAnimations();
        return (animation as CSSAnimation | undefined)?.timeline?.constructor.name ?? 'none';
      }),
    );
    expect(timelines.length).toBeGreaterThan(0);
    expect(new Set(timelines)).toEqual(new Set(['ViewTimeline']));
    // Once scrolled fully into view, an item has landed.
    const target = page.locator(`${CARD}:nth-child(3)`);
    await target.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect(target).toHaveCSS('opacity', '1');
  });
});

test.describe('theme toggle', () => {
  test('motion on: a circular-reveal transition that cleans up after itself', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const errors = watchConsole(page);
    await recordVtClass(page);
    await gotoRel(page, '');
    await page.waitForLoadState('load');
    const html = page.locator('html');
    const toggle = page.locator('header [data-theme-toggle]');
    const before = await html.getAttribute('data-scheme');
    await toggle.click();
    await expect.poll(() => html.getAttribute('data-scheme')).not.toBe(before);
    await expect(html).not.toHaveClass(/\bvt-theme\b/);
    const withVt = await page.evaluate(() => typeof document.startViewTransition === 'function');
    expect(await page.evaluate(() => window.__vtClass)).toEqual(withVt ? ['add', 'remove'] : []);
    expect(await html.getAttribute('style')).toBeNull();
    // And back again.
    await toggle.click();
    await expect(html).not.toHaveClass(/\bvt-theme\b/);
    expect(await html.getAttribute('data-scheme')).toBe(before);
    expect(errors).toEqual([]);
  });

  test('motion on: rapid double clicks leave no transition state behind', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const errors = watchConsole(page);
    await gotoRel(page, 'work/');
    await page.waitForLoadState('load');
    const html = page.locator('html');
    const before = await html.getAttribute('data-scheme');
    await page.evaluate(() => {
      const button = document.querySelector<HTMLButtonElement>('header [data-theme-toggle]')!;
      button.click();
      button.click();
    });
    await expect(html).not.toHaveClass(/\bvt-theme\b/);
    expect(await html.getAttribute('data-scheme')).toBe(before);
    expect(await html.getAttribute('style')).toBeNull();
    expect(errors).toEqual([]);
  });

  for (const [name, setup] of [
    ['reduced motion', (page: Page) => page.emulateMedia({ reducedMotion: 'reduce' })],
    ['the Motion toggle off', motionOffByToggle],
  ] as const) {
    test(`${name}: switches instantly, no transition`, async ({ page }) => {
      await setup(page);
      const errors = watchConsole(page);
      await recordVtClass(page);
      await gotoRel(page, 'work/');
      await page.waitForLoadState('load');
      const html = page.locator('html');
      const before = await html.getAttribute('data-scheme');
      await page.locator('header [data-theme-toggle]').click();
      await expect.poll(() => html.getAttribute('data-scheme')).not.toBe(before);
      expect(await page.evaluate(() => window.__vtClass)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
});

test.describe('axe, motion on', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('home has no violations with the reticle locked on', async ({ page, browserName }) => {
    await gotoRel(page, '');
    await expect(page.locator('[data-focus-line]')).toHaveAttribute('data-state', 'done', {
      timeout: 10_000,
    });
    await page.locator('#work .section-heading__action').focus();
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
    await expect.poll(() => brackets(page)).toEqual([1, 1]);
    await scrollSettled(page);
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([]);
  });
});
