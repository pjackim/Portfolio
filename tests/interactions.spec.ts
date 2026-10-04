/**
 * Cards, sections, reveals, theme reveal (interactions spec §3, §5).
 * - Card targeting reticle: hidden at rest; locked on (brackets + an "Open project" readout, on
 *   every card) by hover with a fine pointer and by keyboard focus; faint and static on touch
 *   screens. The spotlight follows the pointer through CSSOM custom properties (one delegated
 *   listener).
 * - Section headings: the label flickers once on an aria-hidden layer — a sparse flicker of about
 *   a third of its glyphs within ~400 ms, not a full decrypt (the h2's text and the section's
 *   name never change), the index counts up from 00; nothing plays with motion off.
 * - Scroll reveals are live with motion allowed (never on the first card row) and complete
 *   no-ops under reduced motion or the Motion toggle.
 * - The theme toggle switches with motion on (a scan-sweep view transition: the new scheme wipes
 *   down behind an aria-hidden accent scanline; its `vt-theme` class and the scanline are gone
 *   afterwards) and off (instant, no class), with no console errors; rapid double clicks leave
 *   nothing behind.
 * - axe finds nothing with the reticle locked on.
 * Runs on every project (desktop Chromium, Pixel 7, iPhone 15 / WebKit), on a wide viewport: the
 * home page's sections are there from 40rem (phones get a hub instead, tests/phone.spec.ts), and
 * the phone engines still cover touch and WebKit behaviour here.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { framesSettled, interactionsLoaded, twoFrames } from './helpers/motion.ts';
import { isWindowsWebKit, WINDOWS_WEBKIT } from './helpers/platform.ts';
import { gotoRel } from './helpers/routes.ts';

test.use({ viewport: { width: 1280, height: 800 } });

declare global {
  interface Window {
    __vtClass?: ('add' | 'remove')[];
    __decrypt?: (string | null)[];
    __count?: string[];
    __rule?: (string | null)[];
    __states?: string[];
    __revealed?: string[];
    __armed?: number[];
    __flicker?: { samples: string[]; times: number[]; set: number; cleared: number };
    __sweep?: { animations: string[]; scan: number };
    __tickLog?: { start: number; end: number; cancel: number };
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

/** Records every add/remove of `vt-theme` on <html>, from before any script runs — including
    an add and remove in the same task (read from each mutation's old value). */
async function recordVtClass(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__vtClass = [];
    let had = false;
    const has = (value: string | null) => /(^|\s)vt-theme(\s|$)/.test(value ?? '');
    const note = (now: boolean) => {
      if (now !== had) window.__vtClass!.push(now ? 'add' : 'remove');
      had = now;
    };
    // <html> may not exist yet: watch the document for it.
    new MutationObserver((records) => {
      for (const record of records) {
        if (record.target !== document.documentElement) continue;
        note(has(record.oldValue));
      }
      note(document.documentElement?.classList.contains('vt-theme') ?? false);
    }).observe(document, {
      attributes: true,
      subtree: true,
      attributeFilter: ['class'],
      attributeOldValue: true,
    });
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
      // Touch screens: the brackets rest on the frame at 55%, nothing else. (Polled: the
      // brackets ease to their rest value, and a software-rastered WebKit is still easing.)
      await expect.poll(() => brackets(page)).toEqual([0.55, 0.55]);
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
    test.skip(isWindowsWebKit(browserName), WINDOWS_WEBKIT.links);
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
    // Every card's readout says the same, featured or not.
    const labels = await page.locator(`${CARD} .card__readout`).allTextContents();
    expect(new Set(labels.map((label) => label.trim()))).toEqual(new Set(['Open project']));
    // The link's name is the title alone: the readout chip adds nothing.
    await expect(link).toHaveAccessibleName('BodyCam External');
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

test.describe('section headings, motion on', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('arrives once: the rule draws, the index counts up, the label decrypts', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.__decrypt = [];
      window.__count = [];
      window.__rule = [];
      document.addEventListener('DOMContentLoaded', () => {
        const heading = document.querySelector('#about .section-heading')!;
        const title = document.querySelector('#about-title')!;
        const count = document.querySelector('#about [data-count]')!;
        new MutationObserver(() =>
          window.__decrypt!.push(title.getAttribute('data-decrypt')),
        ).observe(title, { attributes: true, attributeFilter: ['data-decrypt'] });
        new MutationObserver(() => window.__rule!.push(heading.getAttribute('data-rule'))).observe(
          heading,
          { attributes: true, attributeFilter: ['data-rule'] },
        );
        new MutationObserver(() => window.__count!.push(count.textContent ?? '')).observe(count, {
          childList: true,
          characterData: true,
          subtree: true,
        });
      });
    });
    await gotoRel(page, '');
    await page.waitForLoadState('load');
    const section = page.locator('#about');
    const rule = page.locator('#about .section-heading__rule');
    await expect(section).toHaveAccessibleName('About');
    // The heading code arrives after load + idle; below the fold, it arms the rule unseen.
    await expect.poll(() => interactionsLoaded(page)).toBe(true);
    await expect(page.locator('#about .section-heading')).toHaveAttribute('data-rule', 'armed');
    await expect(rule).toHaveCSS('scale', '0 1');
    await scrollIntoView(page, '#about .section-heading', 'center');
    await expect
      .poll(() => page.evaluate(() => window.__decrypt), { timeout: 5000 })
      .toEqual(['', null]);
    await expect.poll(() => page.evaluate(() => window.__rule)).toEqual(['armed', 'draw', null]);
    await expect(rule).toHaveCSS('scale', 'none');
    const title = page.locator('#about-title');
    await expect(title).toHaveText('About');
    await expect(title.locator('.section-heading__decrypt')).toHaveCount(0);
    await expect(section).toHaveAccessibleName('About');
    const counts = (await page.evaluate(() => window.__count)) ?? [];
    expect(counts[0]).toBe('00');
    expect(counts.at(-1)).toBe('01');
    // Once only: scrolling away and back replays nothing.
    await scrollIntoView(page, 'footer', 'end');
    await scrollIntoView(page, '#about .section-heading', 'center');
    await twoFrames(page);
    await twoFrames(page);
    expect(await page.evaluate(() => window.__decrypt)).toEqual(['', null]);
    expect(await page.evaluate(() => window.__rule)).toEqual(['armed', 'draw', null]);
  });

  test('the label flickers sparsely (about a third of its glyphs), not a full decrypt', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.__flicker = { samples: [], times: [], set: -1, cleared: -1 };
      document.addEventListener('DOMContentLoaded', () => {
        const title = document.querySelector('#experience-title')!;
        new MutationObserver(() => {
          const flicker = window.__flicker!;
          const layer = title.querySelector('.section-heading__decrypt');
          if (layer) {
            // The layer's text is rewritten every frame, so these are the effect's frames.
            flicker.samples.push(layer.textContent ?? '');
            flicker.times.push(performance.now());
          }
          const on = title.hasAttribute('data-decrypt');
          if (on && flicker.set < 0) flicker.set = performance.now();
          if (!on && flicker.set >= 0 && flicker.cleared < 0) flicker.cleared = performance.now();
        }).observe(title, {
          subtree: true,
          childList: true,
          characterData: true,
          attributes: true,
          attributeFilter: ['data-decrypt'],
        });
      });
    });
    await gotoRel(page, '');
    await page.waitForLoadState('load');
    await expect.poll(() => interactionsLoaded(page)).toBe(true);
    // Park the heading at the bottom edge, inside the observer's 12% bottom margin so it hasn't
    // arrived yet, and let the section behind it finish painting. Then bring it in by a short
    // scroll, so the flicker is timed on a settled page, not on the first paint of #experience.
    await scrollIntoView(page, '#experience .section-heading', 'end');
    await framesSettled(page);
    expect(await page.evaluate(() => window.__flicker!.set), 'not arrived yet').toBe(-1);
    await page.evaluate(() => scrollBy({ top: innerHeight * 0.3, behavior: 'instant' }));
    await expect
      .poll(() => page.evaluate(() => window.__flicker!.cleared), { timeout: 5000 })
      .toBeGreaterThan(0);
    const { samples, times, set, cleared } = (await page.evaluate(() => window.__flicker))!;
    const final = 'Experience';
    const letters = [...final].filter((ch) => /[a-z0-9]/i.test(ch)).length;
    // Every glyph position that ever showed something other than its own letter.
    const touched = new Set<number>();
    for (const sample of samples) {
      expect(sample).toHaveLength(final.length);
      [...sample].forEach((ch, i) => {
        if (ch.toUpperCase() !== final[i]!.toUpperCase()) touched.add(i);
      });
    }
    expect(touched.size, 'some glyphs flicker').toBeGreaterThan(0);
    expect(touched.size, `glyphs touched of ${letters}`).toBeLessThanOrEqual(
      Math.ceil(letters * 0.4),
    );
    // A flicker, not a decrypt: its own clock runs 400 ms (a full decrypt's, 600). scramble.ts
    // starts that clock on its first frame and stops on the first frame at or past 400 ms, so
    // its last running frame is under 400 ms after its first, however late frames land. Timed
    // wall-clock instead, a slow runner's long frames would add up to a frame gap at each end.
    // Samples: [0] the layer arriving, [1] the first frame, …, [-2] the last running frame,
    // [-1] the frame that writes the letters back. The slack covers a sample trailing its
    // frame's rAF timestamp by the other frame callbacks that ran first.
    expect(times.length, 'the flicker ran over several frames').toBeGreaterThan(3);
    expect(times.at(-2)! - times[1]!).toBeLessThan(400 + 50);
    // And it is still over quickly for the reader, even on a slow runner.
    expect(cleared - set).toBeLessThan(1500);
    await expect(page.locator('#experience-title')).toHaveText(final);
  });

  test('a heading on screen as the code arrives keeps its rule (no redraw)', async ({ page }) => {
    // Tall enough that About's heading is on screen at load.
    await page.setViewportSize({ width: 1440, height: 2000 });
    await page.addInitScript(() => {
      window.__rule = [];
      new MutationObserver((records) => {
        for (const r of records)
          window.__rule!.push((r.target as Element).getAttribute('data-rule'));
      }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-rule'] });
    });
    await gotoRel(page, '');
    await expect.poll(() => interactionsLoaded(page)).toBe(true);
    // The first section heading is on screen at load: it decrypts, but its rule never hides.
    const first = page.locator('.section-heading').first();
    await expect(first).toBeInViewport();
    await expect(first.locator('.section-heading__decrypt')).toHaveCount(0, { timeout: 5000 });
    await twoFrames(page);
    expect(await first.getAttribute('data-rule')).toBeNull();
    await expect(first.locator('.section-heading__rule')).toHaveCSS('scale', 'none');
  });

  test('forced colours: the decrypt layer never prints over the real heading', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.setViewportSize({ width: 1440, height: 2000 });
    await gotoRel(page, '');
    const layer = page.locator('.section-heading__decrypt').first();
    await layer.waitFor({ state: 'attached', timeout: 10_000 });
    expect(await layer.evaluate((el) => getComputedStyle(el).display)).toBe('none');
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
        window.__states = [];
        new MutationObserver((records) => {
          for (const record of records) window.__states!.push(record.attributeName ?? '');
        }).observe(document, {
          attributes: true,
          subtree: true,
          attributeFilter: ['data-decrypt', 'data-rule', 'data-reveal-state'],
        });
      });
      for (const path of ['', 'work/credential-correlation/']) {
        await gotoRel(page, path);
        await page.waitForLoadState('load');
        // Through the whole page, so every reveal would have had its chance.
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < height; y += 600) {
          await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y);
          await twoFrames(page);
        }
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
      await twoFrames(page);
      await twoFrames(page);
      expect(await page.evaluate(() => window.__states)).toEqual([]);
      await expect(page.locator('#about [data-count]')).toHaveText('01');
    });
  });
}

/**
 * Arrow nudges behind the whole gate (Ruling G14): the OS setting alone used to decide, so with
 * the Motion toggle off an arrow still slid on hover or focus.
 */
test.describe('arrow nudges', () => {
  test.use({ reducedMotion: 'no-preference' });

  const nudge = (page: Page, selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((el) => getComputedStyle(el.querySelector('.arrow')!).translate);

  for (const motion of ['on', 'off'] as const) {
    test(`with the Motion toggle ${motion}, arrows ${motion === 'on' ? 'nudge' : 'hold still'}`, async ({
      page,
    }) => {
      if (motion === 'off') await motionOffByToggle(page);
      const expectNudge = async (selector: string) => {
        if (motion === 'on') await expect.poll(() => nudge(page, selector)).not.toBe('none');
        else {
          await twoFrames(page);
          expect(await nudge(page, selector)).toBe('none');
        }
      };
      // Keyboard focus: the project's "next" link.
      await gotoRel(page, 'work/credential-correlation/');
      await page.locator('.prev-next__link--next').focus();
      await expectNudge('.prev-next__link--next');
      if (!(await finePointer(page))) return;
      // Hover: the project's back link, home's contact links, the 404's actions.
      await page.locator('.case__back').hover();
      await expectNudge('.case__back');
      await gotoRel(page, '');
      await page.locator('.contact__channel').first().hover();
      await expectNudge('.contact__channel');
      await gotoRel(page, '404.html');
      await page.locator('.not-found__actions a:has(.arrow)').hover();
      await expectNudge('.not-found__actions a:has(.arrow)');
    });
  }
});

test.describe('entrance reveals, motion on', () => {
  test.use({ reducedMotion: 'no-preference' });

  // Home landed on at a fragment, where the experience log and the later cards are on screen
  // at load. (Home's own first screen holds no reveal items: the hero and the first card row
  // never reveal — checked below.)
  for (const height of [900, 1200]) {
    for (const path of ['#experience', '#work']) {
      test(`everything on screen at load is shown, unanimated (${path}, 1440×${height})`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 1440, height });
        await page.addInitScript(() => {
          window.__revealed = [];
          document.addEventListener('animationstart', (event) => {
            if (event.animationName === 'reveal') window.__revealed!.push('played');
          });
        });
        await gotoRel(page, path);
        await page.waitForLoadState('load');
        // Classified: whatever is below the fold now waits.
        await expect(page.locator('[data-reveal-state="pending"]').first()).toBeAttached();
        const onScreen = await page.locator('[data-reveal]').evaluateAll((els) =>
          els
            .filter((el) => {
              const box = el.getBoundingClientRect();
              return box.bottom > 0 && box.top < innerHeight;
            })
            .map((el) => ({
              state: el.getAttribute('data-reveal-state'),
              opacity: getComputedStyle(el).opacity,
              animations: el.getAnimations().length,
            })),
        );
        expect(onScreen.length, 'reveal items on screen at load').toBeGreaterThan(0);
        for (const item of onScreen)
          expect(item).toEqual({ state: null, opacity: '1', animations: 0 });
        expect(await page.evaluate(() => window.__revealed)).toEqual([]);
      });
    }
  }

  // A fragment the page is already at when it loads — `#main`, at the top, is never scrolled
  // to — and one it jumps to: either way the entrances are armed straight after load, never
  // after waiting out a scroll that isn't coming.
  for (const fragment of ['#main', '#about']) {
    test(`landed on at ${fragment}, the entrances arm at once`, async ({ page }) => {
      await page.addInitScript(() => {
        window.__armed = [];
        addEventListener('load', () => window.__armed!.push(performance.now()), { once: true });
        new MutationObserver(() => {
          if (window.__armed!.length === 1 && document.querySelector('[data-reveal-state]')) {
            window.__armed!.push(performance.now());
          }
        }).observe(document, {
          attributes: true,
          subtree: true,
          attributeFilter: ['data-reveal-state'],
        });
      });
      await gotoRel(page, fragment);
      await page.waitForLoadState('load');
      await expect.poll(() => page.evaluate(() => window.__armed?.length)).toBe(2);
      const [load, armed] = (await page.evaluate(() => window.__armed)) ?? [];
      // Load, a frame, the observer's first report: well under the old 1.5 s fallback.
      expect(armed! - load!).toBeLessThan(600);
    });
  }

  test('never on the hero or the first card row', async ({ page }) => {
    await gotoRel(page, '');
    await expect(page.locator('.hero [data-reveal]')).toHaveCount(0);
    // The bento's first row: the lead and the two cards beside it.
    for (const card of await page.locator(`${CARD}:nth-child(-n + 3)`).all()) {
      expect(await card.getAttribute('data-reveal')).toBeNull();
    }
    await expect(page.locator(`${CARD}:nth-child(4)`)).toHaveAttribute('data-reveal');
  });

  test('an item below the fold waits, then plays once as it scrolls in', async ({ page }) => {
    await gotoRel(page, '');
    await page.waitForLoadState('load');
    const target = page.locator(`${CARD}[data-reveal]`).first();
    await expect(target).toHaveAttribute('data-reveal-state', 'pending');
    await expect(target).toHaveCSS('opacity', '0');
    await target.evaluate((el) => {
      (window as Window & { __played?: number }).__played = 0;
      el.addEventListener('animationstart', (event: Event) => {
        if ((event as AnimationEvent).animationName === 'reveal')
          (window as Window & { __played?: number }).__played! += 1;
      });
    });
    await scrollIntoView(page, `${CARD}[data-reveal]`, 'center');
    // It plays, then the state goes: nothing left behind (no clip that could cut a focus ring).
    await expect(target).not.toHaveAttribute('data-reveal-state', { timeout: 8000 });
    await expect(target).toHaveCSS('opacity', '1');
    await expect(target).toHaveCSS('clip-path', 'none');
    expect(await target.evaluate((el) => el.getAnimations().length)).toBe(0);
    // Once: away and back again, it doesn't replay.
    await scrollIntoView(page, 'header', 'start');
    await scrollIntoView(page, `${CARD}[data-reveal]`, 'center');
    await twoFrames(page);
    expect(await page.evaluate(() => (window as Window & { __played?: number }).__played)).toBe(1);
  });

  test('an item taller than the screen still plays as it comes in', async ({ page }) => {
    // Many screens tall: at most a sliver of it is ever on screen, far under 15% of it.
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        document
          .querySelector<HTMLElement>('.project-grid > .card[data-reveal]')!
          .style.setProperty('min-height', '9000px');
      });
    });
    await gotoRel(page, '');
    await page.waitForLoadState('load');
    const target = page.locator(`${CARD}[data-reveal]`).first();
    await expect(target).toHaveAttribute('data-reveal-state', 'pending');
    // Its top a third of the way up the screen: it covers the lower third, ~3% of itself.
    await target.evaluate((el) => {
      const top = el.getBoundingClientRect().top + scrollY;
      scrollTo({ top: top - innerHeight * (2 / 3), behavior: 'instant' });
    });
    await expect(target).not.toHaveAttribute('data-reveal-state', { timeout: 8000 });
    await expect(target).toHaveCSS('opacity', '1');
  });

  test('data-reveal-from="start" slides in from the inline-start side', async ({ page }) => {
    // reveal.ts is a module script (runs before `DOMContentLoaded`), so a fixture added via
    // page.addInitScript on that event would already have missed its querySelectorAll — the
    // fixture has to be in the HTML the browser parses, ahead of the script tag.
    await page.route('**/', async (route) => {
      if (route.request().resourceType() !== 'document') {
        await route.continue();
        return;
      }
      const response = await route.fetch();
      const html = await response.text();
      // Non-empty: a zero-area element never registers as intersecting (its intersection
      // ratio is always 0), so it would wait forever regardless of scroll position.
      const fixture =
        '<div data-reveal data-reveal-from="start" id="reveal-from-fixture">fixture</div>';
      expect(html).toContain('<!-- One-shot entrance reveals');
      await route.fulfill({
        response,
        body: html.replace(
          '<!-- One-shot entrance reveals',
          `${fixture}<!-- One-shot entrance reveals`,
        ),
      });
    });
    await gotoRel(page, '');
    await page.waitForLoadState('load');
    const target = page.locator('#reveal-from-fixture');
    await expect(target).toHaveAttribute('data-reveal-state', 'pending');
    // The raw (unresolved) custom-property value, not a computed length — fix wave minor 5's
    // `--reveal-shift` token (global.css) is substituted in as written, `calc(-1 * ...)` and all.
    expect(
      await target.evaluate((el) => getComputedStyle(el).getPropertyValue('--reveal-x').trim()),
    ).toBe('calc(-1 * 2.5rem)');
    // It's the last thing in <body>, so there's no room to scroll it past the trigger line
    // (10% above the viewport's bottom edge) — give the page more to scroll past it.
    await page.evaluate(() => {
      const spacer = document.createElement('div');
      spacer.style.setProperty('height', '150vh');
      document.body.append(spacer);
    });
    await target.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await expect(target).not.toHaveAttribute('data-reveal-state', { timeout: 8000 });
    await expect(target).toHaveCSS('translate', 'none');
    await expect(target).toHaveCSS('opacity', '1');
  });

  test('capabilities: picking a group opens its panel, moves the bar, and locks on', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoRel(page, 'capabilities/');
    await page.waitForLoadState('load');
    const groups = page.locator('.caps__group');
    const count = await groups.count();
    expect(count).toBeGreaterThan(1);
    // Before any pick: the first group only (a radio group, so no script needed).
    await expect(groups.first()).toBeVisible();
    for (let i = 1; i < count; i++) await expect(groups.nth(i)).toBeHidden();

    await scrollIntoView(page, '.caps', 'center');
    await expect(page.locator('.caps__panel')).not.toHaveAttribute('data-reveal-state', {
      timeout: 8000,
    });
    await page.locator('.caps__tab').nth(2).click();
    await expect(page.locator('.caps__radio').nth(2)).toBeChecked();
    await expect(groups.nth(2)).toBeVisible();
    await expect(groups.first()).toBeHidden();
    await expect(page.locator('[data-caps]')).toHaveAttribute('data-lock', '');
    // The bar sits on the third tab once its slide ends.
    await expect
      .poll(() =>
        page.evaluate(() => {
          const bar = document.querySelector('.caps__bar')!.getBoundingClientRect();
          const tab = document.querySelectorAll('.caps__tab')[2]!.getBoundingClientRect();
          return Math.round(bar.top - tab.top);
        }),
      )
      .toBe(0);
    // Every chip is a link to a project.
    const hrefs = await groups
      .nth(2)
      .locator('a.caps__chip')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href')));
    for (const href of hrefs) expect(href).toMatch(/\/Portfolio\/work\/[a-z0-9-]+\/$/);
  });

  test('capabilities: arrow keys move between groups', async ({ page }) => {
    await gotoRel(page, 'capabilities/');
    await page.locator('.caps__radio').first().focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.caps__radio').nth(1)).toBeChecked();
    await expect(page.locator('.caps__group').nth(1)).toBeVisible();
  });

  test('about timeline: every stop ends shown once the reader has scrolled past it', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoRel(page, '');
    await page.waitForLoadState('load');
    await expect(page.locator('[data-timeline]')).toHaveAttribute('data-live', '', {
      timeout: 5000,
    });
    await scrollIntoView(page, '#work', 'center');
    await expect(page.locator('.timeline__stop[data-tl]')).toHaveCount(0, { timeout: 5000 });
    await expect
      .poll(() =>
        page
          .locator('.timeline__title')
          .evaluateAll((els) => els.every((el) => getComputedStyle(el).opacity === '1')),
      )
      .toBe(true);
  });

  test('the experience log wipes down once as it scrolls in, leaving nothing behind', async ({
    page,
  }) => {
    await gotoRel(page, '');
    await page.waitForLoadState('load');
    const frame = page.locator('#experience .git-log__frame');
    await expect(frame).toHaveAttribute('data-reveal-state', 'pending');
    await scrollIntoView(page, '#experience .git-log__frame', 'center');
    await expect(frame).not.toHaveAttribute('data-reveal-state', { timeout: 8000 });
    await expect(frame).toHaveCSS('clip-path', 'none');
    await expect(frame).toHaveCSS('opacity', '1');
    expect(await frame.evaluate((el) => el.getAnimations().length)).toBe(0);
  });

  test('the contact block ends fully visible at 1920×1080 after scrolling to the bottom', async ({
    page,
  }) => {
    // Contact is the last thing on a short page, so reveal.ts (which only ever hides items
    // entirely below the viewport) must never leave it hidden.
    await page.setViewportSize({ width: 1920, height: 1080 });
    await gotoRel(page, '');
    await page.waitForLoadState('load');
    await page.evaluate(() =>
      scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
    );
    await expect(
      page.locator('.contact__figure[data-reveal-state], .contact__channels[data-reveal-state]'),
    ).toHaveCount(0, { timeout: 8000 });
    const opacities = await page
      .locator('.contact__frame, .contact__caption, .contact__channels > li')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
    for (const opacity of opacities) expect(opacity).toBe('1');
    await expect(page.locator('.contact__channel').first()).toBeInViewport();
    await expect(page.locator('.contact__channel').last()).toBeInViewport();
  });

  test("the photo's corners and scanline finish inside its entrance, with zero cancels", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoRel(page, '');
    await page.waitForLoadState('load');
    const figure = page.locator('.contact__figure');
    await expect(figure).toHaveAttribute('data-reveal-state', 'pending');
    // `animationend` vs. `animationcancel` (the experience hairline technique above): the
    // lock-on is scoped to the figure's reveal window and must finish before it closes.
    await figure.evaluate((el) => {
      window.__tickLog = { start: 0, end: 0, cancel: 0 };
      const onEvent = (event: Event) => {
        const name = (event as AnimationEvent).animationName;
        if (name !== 'contact-corners' && name !== 'contact-sweep') return;
        if (event.type === 'animationstart') window.__tickLog!.start += 1;
        else if (event.type === 'animationend') window.__tickLog!.end += 1;
        else if (event.type === 'animationcancel') window.__tickLog!.cancel += 1;
      };
      el.addEventListener('animationstart', onEvent);
      el.addEventListener('animationend', onEvent);
      el.addEventListener('animationcancel', onEvent);
    });
    await scrollIntoView(page, '.contact', 'center');
    await expect(figure).not.toHaveAttribute('data-reveal-state', { timeout: 8000 });
    await twoFrames(page);
    const tickLog = await page.evaluate(() => window.__tickLog);
    expect(tickLog!.cancel, 'the lock-on was cut off before it finished').toBe(0);
    // Two corner pairs and one sweep.
    expect(tickLog!.start).toBe(3);
    expect(tickLog!.end).toBe(3);
  });

  test('switching motion off shows everything still waiting', async ({ page }) => {
    await gotoRel(page, '');
    await page.waitForLoadState('load');
    await expect(page.locator('[data-reveal-state="pending"]').first()).toBeAttached();
    await page.locator('.hero [data-motion-toggle]').click();
    await expect(page.locator('[data-reveal-state]')).toHaveCount(0);
    // (With motion off every change is a 0.01 ms transition: read once it has run.)
    await expect
      .poll(() =>
        page
          .locator(REVEALED)
          .evaluateAll((els) => [...new Set(els.map((el) => getComputedStyle(el).opacity))]),
      )
      .toEqual(['1']);
  });

  test('back/forward: no card comes back transparent', async ({ page }) => {
    await page.addInitScript(() => {
      window.__revealed = [];
      document.addEventListener('animationstart', (event) => {
        if (event.animationName === 'reveal') window.__revealed!.push('played');
      });
    });
    await gotoRel(page, '');
    await page.waitForLoadState('load');
    const card = page.locator(`${CARD}:nth-child(4)`);
    await expect(card).toHaveAttribute('data-reveal-state', 'pending');
    await scrollIntoView(page, `${CARD}:nth-child(4)`, 'center');
    await expect(card).not.toHaveAttribute('data-reveal-state', { timeout: 8000 });
    await card.locator('.card__title a').click();
    await page.waitForURL(/\/work\/[^/]+\/$/);
    await page.goBack();
    await page.waitForLoadState('load');
    // The browser restores the scroll position progressively, well after load.
    await expect.poll(() => page.evaluate(() => scrollY), { timeout: 5000 }).toBeGreaterThan(0);
    await scrollSettled(page);
    await twoFrames(page);
    const onScreen = await page.locator(CARD).evaluateAll((els) =>
      els
        .filter((el) => {
          const box = el.getBoundingClientRect();
          return box.bottom > 0 && box.top < innerHeight;
        })
        .map((el) => `${el.getAttribute('data-reveal-state')}|${getComputedStyle(el).opacity}`),
    );
    expect(onScreen.length).toBeGreaterThan(0);
    expect(new Set(onScreen)).toEqual(new Set(['null|1']));
    // A return visit is shown as it was left: no entrance plays at all.
    expect(await page.evaluate(() => window.__revealed)).toEqual([]);
  });

  test('a back/forward-cache restore shows waiting items on screen at once', async ({ page }) => {
    await gotoRel(page, '');
    await page.waitForLoadState('load');
    const card = page.locator(`${CARD}:nth-child(4)`);
    await expect(card).toHaveAttribute('data-reveal-state', 'pending');
    // As if the page had been frozen with this card waiting on screen, then restored.
    await scrollIntoView(page, `${CARD}:nth-child(4)`, 'center');
    await card.evaluate((el: HTMLElement) => {
      el.dataset.revealState = 'pending';
      dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    });
    await expect(card).not.toHaveAttribute('data-reveal-state');
    await expect(card).toHaveCSS('opacity', '1');
    expect(await card.evaluate((el) => el.getAnimations().length)).toBe(0);
  });
});

/** Records, as a view transition's animations start, which run and whether the scanline is in. */
async function recordSweep(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const start = Document.prototype.startViewTransition;
    if (typeof start !== 'function') return;
    Document.prototype.startViewTransition = function (this: Document, update) {
      const vt = start.call(this, update);
      vt.ready.then(
        () => {
          window.__sweep = {
            animations: document
              .getAnimations()
              .map((a) => {
                const pseudo = (a.effect as KeyframeEffect | null)?.pseudoElement ?? '';
                return `${pseudo} ${(a as CSSAnimation).animationName ?? ''}`;
              })
              .filter((name) => name.startsWith('::view-transition')),
            scan: document.querySelectorAll('.theme-scan[aria-hidden="true"]').length,
          };
        },
        () => {},
      );
      return vt;
    };
  });
}

test.describe('theme toggle', () => {
  test('motion on: a scan-sweep transition that cleans up after itself', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const errors = watchConsole(page);
    await recordVtClass(page);
    await recordSweep(page);
    await gotoRel(page, '');
    await page.waitForLoadState('load');
    const html = page.locator('html');
    const toggle = page.locator('.site-header__end [data-theme-toggle]');
    const before = await html.getAttribute('data-scheme');
    await toggle.click();
    await expect.poll(() => html.getAttribute('data-scheme')).not.toBe(before);
    await expect(html).not.toHaveClass(/\bvt-theme\b/);
    const withVt = await page.evaluate(() => typeof document.startViewTransition === 'function');
    expect(await page.evaluate(() => window.__vtClass)).toEqual(withVt ? ['add', 'remove'] : []);
    if (withVt) {
      // The new scheme wiped down the page, led by the scanline in its own capture.
      const sweep = await page.evaluate(() => window.__sweep);
      expect(sweep?.animations).toEqual(
        expect.arrayContaining([
          '::view-transition-new(root) vt-theme-wipe',
          '::view-transition-group(theme-scan) vt-theme-scan',
        ]),
      );
      expect(sweep?.scan).toBe(1);
    }
    // Nothing of it is left: no scanline, no style attribute.
    await expect(page.locator('.theme-scan')).toHaveCount(0);
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
      const button = document.querySelector<HTMLButtonElement>(
        '.site-header__end [data-theme-toggle]',
      )!;
      button.click();
      button.click();
    });
    await expect(html).not.toHaveClass(/\bvt-theme\b/);
    expect(await html.getAttribute('data-scheme')).toBe(before);
    expect(await html.getAttribute('style')).toBeNull();
    await expect(page.locator('.theme-scan')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('motion on: a view transition refused outright still switches, instantly', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const errors = watchConsole(page);
    await recordVtClass(page);
    await page.addInitScript(() => {
      Document.prototype.startViewTransition = () => {
        throw new DOMException('refused', 'InvalidStateError');
      };
    });
    await gotoRel(page, 'work/');
    await page.waitForLoadState('load');
    const html = page.locator('html');
    const before = await html.getAttribute('data-scheme');
    await page.locator('.site-header__end [data-theme-toggle]').click();
    await expect.poll(() => html.getAttribute('data-scheme')).not.toBe(before);
    expect(await page.evaluate(() => window.__vtClass)).toEqual(['add', 'remove']);
    await expect(html).not.toHaveClass(/\bvt-theme\b/);
    expect(await html.getAttribute('style')).toBeNull();
    await expect(page.locator('.theme-scan')).toHaveCount(0);
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
      await page.locator('.site-header__end [data-theme-toggle]').click();
      await expect.poll(() => html.getAttribute('data-scheme')).not.toBe(before);
      expect(await page.evaluate(() => window.__vtClass)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
});

test.describe('axe, motion on', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('home has no violations with the reticle locked on', async ({ page, browserName }) => {
    test.skip(isWindowsWebKit(browserName), WINDOWS_WEBKIT.links);
    await gotoRel(page, '');
    await expect(page.locator('[data-focus-line]')).toHaveAttribute('data-state', 'done', {
      timeout: 10_000,
    });
    await page.locator('#work .section-heading__action').focus();
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
    await expect.poll(() => brackets(page)).toEqual([1, 1]);
    await scrollSettled(page);
    // The locked-on card in view below its section heading, which sits at the scroll padding —
    // so what's under the sticky header is the section's own top padding. Wherever the focus
    // scroll happens to stop, a link can otherwise sit half under the header (the hero's links or
    // Motion chip, depending on the viewport), which axe reads as a target too small to hit.
    await page
      .locator('#work .section-heading')
      .evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await twoFrames(page);
    await expect(page.locator(`${CARD} .card__title a`).first()).toBeFocused();
    // The jump can start entrances below the fold (on phones, the Experience rows); axe would
    // read their contrast mid-fade, so let every running entrance finish first.
    await expect(page.locator('[data-reveal-state="in"]')).toHaveCount(0, { timeout: 5000 });
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([]);
  });
});
