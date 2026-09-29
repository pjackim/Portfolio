/**
 * Motion layer (interactions spec §1, §2, §5): the hero "live instrument" and the Motion
 * toggle.
 * - Reduced motion: the attack-path canvas is a decorative (`aria-hidden`) static frame with no
 *   animation loop at all (no requestAnimationFrame calls, pixels stable); every animated
 *   readout shows its final text; the toggle defers to the OS setting.
 * - The static frame is drawn in the design tokens' colours (the safety nets turn every
 *   property change into a transition, which once leaked into the canvas colour probe).
 * - Motion on: the canvas animates (pixels change), the h1 is never touched, the focus line
 *   types for at most 5 s and settles on its full text, the reels roll to their values — each
 *   drum turning once in place, from its own digit, never parked on 0 first; on a
 *   connection so slow the CSS failsafe has already shown the line, it isn't retyped.
 * - The toggle: stops everything live (canvas, typing), is keyboard operable, and persists
 *   across a reload — and a navigation made after switching it off has no cross-document view
 *   transition; revealing it never shifts the layout (tablet widths, either motion state). The
 *   monogram caret blinks on the first page of a session only.
 * - Phones (under 40rem, Portfolio.dc.html "1c Summary first"): the hero is the summary alone,
 *   with no graph, focus line, readouts or hero chip; the footer chip is the motion control and
 *   the prompt's monogram is the one that blinks. The instrument tests above run on a wide
 *   viewport on every project so the phone engines still cover them.
 * Runs on every project (desktop Chromium, Pixel 7, iPhone 15 / WebKit).
 */
import { expect, test, type Page } from '@playwright/test';
import { headerMonogram, themeToggle } from './helpers/header.ts';
import { gotoRel, ROUTES } from './helpers/routes.ts';

declare global {
  interface Window {
    __rafCalls?: number;
    __h1Mutations?: number;
    __focusStates?: [string | null, number][];
    __shifts?: { value: number; sources: string[] }[];
    __rollStates?: (string | null)[];
    __reveals?: ('none' | 'skipped' | 'ran')[];
  }
}

const GRAPH = 'canvas[data-hero-graph]';
const FOCUS_LINE = '[data-focus-line]';
const TOGGLE = '.hero [data-motion-toggle]';
const FOCUS_TEXT = 'reverse engineering · machine learning · embedded systems';
/** Where the hero shows its instruments (all of them hide under 40rem). */
const WIDE = { width: 1280, height: 800 };
/** Every built case-study page is a project. */
const PROJECT_COUNT = ROUTES.filter((route) => /^work\/[^/]+\/$/.test(route)).length;

/** Counts every requestAnimationFrame call the page makes, from before its scripts run. */
async function countAnimationFrames(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__rafCalls = 0;
    const request = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      window.__rafCalls = (window.__rafCalls ?? 0) + 1;
      return request(callback);
    };
  });
}

const rafCalls = (page: Page) => page.evaluate(() => window.__rafCalls ?? 0);

/** Ink count + position-weighted hash of the canvas pixels: changes when anything moves. */
function graphSignature(page: Page): Promise<{ ink: number; hash: number }> {
  return page.locator(GRAPH).evaluate((canvas: HTMLCanvasElement) => {
    const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
    let ink = 0;
    let hash = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] === 0) continue;
      ink++;
      hash = (Math.imul(hash, 31) + i * data[i]!) | 0;
    }
    return { ink, hash };
  });
}

type Rgb = [number, number, number];

/** Median colour of the canvas's opaque pixels: the hosts (drawn opaque; edges stay translucent,
    ≤ 0.68 alpha, even where two cross). */
function graphNodeColor(page: Page): Promise<Rgb> {
  return page.locator(GRAPH).evaluate((canvas: HTMLCanvasElement) => {
    const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
    const channels: number[][] = [[], [], []];
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3]! < 250) continue;
      for (let c = 0; c < 3; c++) channels[c]!.push(data[i + c]!);
    }
    return channels.map((xs) => xs.sort((a, b) => a - b)[xs.length >> 1] ?? -1) as Rgb;
  });
}

/** A design token resolved to sRGB bytes, the way a canvas would paint it. */
function tokenColor(page: Page, token: string): Promise<Rgb> {
  return page.evaluate((token) => {
    const probe = document.createElement('span');
    probe.style.setProperty('color', `var(${token})`);
    document.body.append(probe);
    const css = getComputedStyle(probe).color;
    probe.remove();
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return [r!, g!, b!] as Rgb;
  }, token);
}

async function expectGraphInTokenColours(page: Page): Promise<void> {
  const expected = await tokenColor(page, '--text-subtle');
  const actual = await graphNodeColor(page);
  for (let c = 0; c < 3; c++) {
    expect(
      Math.abs(actual[c]! - expected[c]!),
      `host colour ${actual} vs --text-subtle ${expected}`,
    ).toBeLessThanOrEqual(8);
  }
}

/** Records the focus line's data-state changes with timestamps, from before scripts run. */
async function recordFocusStates(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__focusStates = [];
    document.addEventListener('DOMContentLoaded', () => {
      const line = document.querySelector('[data-focus-line]');
      if (!line) return;
      new MutationObserver(() => {
        window.__focusStates!.push([line.getAttribute('data-state'), performance.now()]);
      }).observe(line, { attributes: true, attributeFilter: ['data-state'] });
    });
  });
}

/** Holds back the motion layer (and so the hero code) by `ms`, as a slow connection would. */
async function delayMotionLayer(page: Page, ms: number): Promise<void> {
  await page.route('**/_astro/MotionLayer*.js', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    await route.continue();
  });
}

/** The graph starts after load + idle; wait until it has drawn and settled into `state`. */
async function graphIs(page: Page, state: 'running' | 'static'): Promise<void> {
  await expect(page.locator(GRAPH)).toHaveAttribute('data-state', state, { timeout: 10_000 });
}

/**
 * The hero has finished laying out: fonts in, and the canvas's box and backing store unchanged
 * across a gap longer than the graph's resize debounce (150 ms). Until then a static frame can
 * still redraw once — the hero reflows as its fonts arrive and the graph's ResizeObserver
 * redraws the frame to the new box — which is a resize, not an animation loop.
 */
async function heroSettled(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  let last = '';
  await expect
    .poll(
      async () => {
        const now = await page
          .locator(GRAPH)
          .evaluate(
            (c: HTMLCanvasElement) => `${c.clientWidth}x${c.clientHeight}:${c.width}x${c.height}`,
          );
        const same = now === last;
        last = now;
        return same;
      },
      { intervals: [250], timeout: 5000 },
    )
    .toBe(true);
}

/** Asserts no animation frame is requested and no pixel changes over `ms`. */
async function expectFrozen(page: Page, ms = 900): Promise<void> {
  await heroSettled(page);
  const calls = await rafCalls(page);
  const before = await graphSignature(page);
  await page.waitForTimeout(ms);
  expect(await rafCalls(page), 'requestAnimationFrame calls while frozen').toBe(calls);
  expect(await graphSignature(page)).toEqual(before);
  expect(before.ink, 'the static frame shows the graph').toBeGreaterThan(0);
}

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce', viewport: WIDE });

  test('the graph is a decorative static frame with no animation loop', async ({ page }) => {
    await countAnimationFrames(page);
    await gotoRel(page, '');
    const graph = page.locator(GRAPH);
    await expect(graph).toHaveAttribute('aria-hidden', 'true');
    await graphIs(page, 'static');
    await expectFrozen(page);
  });

  test('the static frame is drawn in the token colours', async ({ page }) => {
    await gotoRel(page, '');
    await graphIs(page, 'static');
    await expectGraphInTokenColours(page);
    // Re-read after a scheme change (the safety net is still on).
    await themeToggle(page).click();
    await expect(page.locator('html')).toHaveAttribute('data-scheme', /light|dark/);
    await expect
      .poll(async () => {
        const [expected, actual] = [
          await tokenColor(page, '--text-subtle'),
          await graphNodeColor(page),
        ];
        return expected.every((v, c) => Math.abs(v - actual[c]!) <= 8);
      })
      .toBe(true);
  });

  test('animated readouts show their final text', async ({ page }) => {
    await gotoRel(page, '');
    const line = page.locator(FOCUS_LINE);
    await expect(line).toHaveAttribute('data-state', 'done');
    await expect(line.locator('.hero__focus-static')).toBeVisible();
    await expect(line.locator('.hero__focus-static')).toContainText(FOCUS_TEXT);
    await expect(page.locator('[data-readouts]')).not.toHaveAttribute('data-roll');
    await expect(page.locator('.hero__eyebrow [data-scramble]').first()).toHaveText(
      'Cyber Security Researcher',
    );
  });

  test('the monogram caret does not blink', async ({ page }) => {
    await gotoRel(page, '');
    const cursor = headerMonogram(page).locator('.monogram__cursor');
    expect(await cursor.evaluate((el) => el.getAnimations().length)).toBe(0);
  });

  test('the Motion toggle defers to the system setting', async ({ page }) => {
    await gotoRel(page, '');
    const toggle = page.locator(TOGGLE);
    await expect(toggle).toBeVisible();
    // Named by its visible label (label in name); not pressed: motion is off.
    await expect(toggle).toHaveAccessibleName('Motion');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(toggle).toHaveAttribute('aria-disabled', 'true');
    await expect(toggle.locator('[data-motion-state]')).toHaveText('Off (system)');
    await expect(toggle).toHaveAccessibleDescription(/device is set to reduce motion/);
    // aria-disabled: Playwright won't treat it as actionable, so force the click through.
    await toggle.click({ force: true });
    await expect(page.locator('html')).not.toHaveAttribute('data-motion');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('motion on', () => {
  test.use({ reducedMotion: 'no-preference', viewport: WIDE });

  test('the graph animates', async ({ page }) => {
    await gotoRel(page, '');
    await expect(page.locator(GRAPH)).toHaveAttribute('aria-hidden', 'true');
    await graphIs(page, 'running');
    const first = await graphSignature(page);
    expect(first.ink).toBeGreaterThan(0);
    // Hosts drift 3–9 px/s: any frame drawn after this one differs (polled, so a starved test
    // machine that skips frames for a while can't fail it).
    await expect.poll(() => graphSignature(page), { timeout: 5000 }).not.toEqual(first);
  });

  test('the status strip is NOW · EDU: the focus areas are the typed line alone', async ({
    page,
  }) => {
    await gotoRel(page, '');
    const strip = page.locator('.hero .status-strip');
    await expect(strip.locator('dt')).toHaveText(['Now', 'Edu']);
    // Said once, by the focus line (its visible layers are aria-hidden twins of its own text).
    await expect(page.locator('.hero')).toContainText(/Focus: reverse engineering/);
    await expect(strip).not.toContainText(/reverse engineering/i);
    // Wide: two equal cells side by side; phones: stacked rows.
    const cells = await strip.locator('.status-strip__cell').evaluateAll((els) =>
      els.map((el) => {
        const box = el.getBoundingClientRect();
        return { top: Math.round(box.top), width: Math.round(box.width) };
      }),
    );
    expect(cells).toHaveLength(2);
    if ((page.viewportSize()?.width ?? 0) >= 640) {
      expect(cells[0]!.top).toBe(cells[1]!.top);
      expect(Math.abs(cells[0]!.width - cells[1]!.width)).toBeLessThanOrEqual(1);
    } else {
      expect(cells[1]!.top).toBeGreaterThan(cells[0]!.top);
    }
  });

  test('the h1 keeps its server-rendered text, untouched', async ({ page, request }) => {
    const html = await (await request.get('')).text();
    const ssr = /<h1[^>]*>([^<]*)<\/h1>/.exec(html)?.[1]?.trim();
    expect(ssr).toBe('Parker Jackim');
    await page.addInitScript(() => {
      window.__h1Mutations = 0;
      document.addEventListener('DOMContentLoaded', () => {
        const h1 = document.querySelector('h1');
        if (!h1) return;
        new MutationObserver((records) => {
          window.__h1Mutations = (window.__h1Mutations ?? 0) + records.length;
        }).observe(h1, { subtree: true, childList: true, characterData: true, attributes: true });
      });
    });
    await gotoRel(page, '');
    await expect(page.locator(FOCUS_LINE)).toHaveAttribute('data-state', 'done', {
      timeout: 10_000,
    });
    await graphIs(page, 'running');
    await expect(page.locator('h1')).toHaveText(ssr!);
    expect(await page.evaluate(() => window.__h1Mutations)).toBe(0);
  });

  test('the focus line types for at most 5 s, then settles on the full text', async ({ page }) => {
    await recordFocusStates(page);
    await gotoRel(page, '');
    const line = page.locator(FOCUS_LINE);
    const typed = line.locator('[data-focus-typed]');
    // The real text is available to assistive tech from the start.
    await expect(line.locator('.visually-hidden')).toHaveText(
      'Focus: reverse engineering, machine learning, embedded systems',
    );
    await expect(line.locator('.hero__focus-stack')).toHaveAttribute('aria-hidden', 'true');

    await expect(line).toHaveAttribute('data-state', 'typing');
    const partial = (await typed.textContent()) ?? '';
    expect(FOCUS_TEXT.startsWith(partial)).toBe(true);

    await expect(line).toHaveAttribute('data-state', 'done', { timeout: 10_000 });
    await expect(typed).toHaveText(FOCUS_TEXT);
    await expect(line.locator('.hero__focus-static')).toBeVisible();
    // WCAG 2.2.2: from the first typed frame to the settled line (caret stopped) ≤ 5 s.
    const states = (await page.evaluate(() => window.__focusStates)) ?? [];
    const started = states.find(([state]) => state === 'typing')?.[1];
    const settled = states.find(([state]) => state === 'done')?.[1];
    expect(started).toBeDefined();
    expect(settled! - started!).toBeLessThanOrEqual(5000);
  });

  test('on a slow connection the failsafe line is not retyped', async ({ page }) => {
    test.slow();
    await recordFocusStates(page);
    // The hero code arrives after the 6 s CSS failsafe has already shown the static line.
    await delayMotionLayer(page, 6500);
    await gotoRel(page, '');
    const line = page.locator(FOCUS_LINE);
    await expect(line).toHaveAttribute('data-state', 'done', { timeout: 10_000 });
    await expect(line.locator('.hero__focus-static')).toBeVisible();
    await expect(line.locator('.hero__focus-static')).toContainText(FOCUS_TEXT);
    const states = (await page.evaluate(() => window.__focusStates)) ?? [];
    expect(states.map(([state]) => state)).toEqual(['done']);
  });

  test('the readouts roll onto their values', async ({ page }) => {
    await gotoRel(page, '');
    const featured = await page.locator('.project-grid > li').count();
    const list = page.locator('[data-readouts]');
    await expect(list.locator('.visually-hidden')).toHaveText([
      `${PROJECT_COUNT} projects`,
      `${featured} case studies`,
    ]);
    await list.scrollIntoViewIfNeeded();
    await expect(list).toHaveAttribute('data-roll', 'done', { timeout: 10_000 });
    // Each reel rests on its digit: translated (10 + digit) line boxes up.
    const reels = await list.locator('[data-digit]').evaluateAll((digits) =>
      digits.map((el) => {
        const reel = el.firstElementChild as HTMLElement;
        const line = el.getBoundingClientRect().height;
        const y = parseFloat(getComputedStyle(reel).translate.split(' ')[1] ?? '0');
        return { digit: Number((el as HTMLElement).dataset.digit), steps: Math.round(-y / line) };
      }),
    );
    expect(reels.map((r) => String(r.digit)).join('')).toBe(
      `${String(PROJECT_COUNT).padStart(2, '0')}${String(featured).padStart(2, '0')}`,
    );
    for (const { digit, steps } of reels) expect(steps).toBe(10 + digit);
  });

  test('each readout drum turns once in place, never parked on another value', async ({ page }) => {
    await page.addInitScript(() => {
      window.__rollStates = [];
      document.addEventListener('DOMContentLoaded', () => {
        const list = document.querySelector('[data-readouts]');
        if (!list) return;
        new MutationObserver(() =>
          window.__rollStates!.push(list.getAttribute('data-roll')),
        ).observe(list, { attributes: true, attributeFilter: ['data-roll'] });
      });
    });
    await gotoRel(page, '');
    const list = page.locator('[data-readouts]');
    await list.scrollIntoViewIfNeeded();
    /** Line boxes each reel is translated up by, as painted now. */
    const steps = () =>
      list.locator('[data-digit]').evaluateAll((digits) =>
        digits.map((el) => {
          const reel = el.firstElementChild as HTMLElement;
          const y = parseFloat(getComputedStyle(reel).translate.split(' ')[1] ?? '0');
          return (0 - y) / el.getBoundingClientRect().height; // (never -0)
        }),
      );
    const digits = await list
      .locator('[data-digit]')
      .evaluateAll((els) => els.map((el) => Number((el as HTMLElement).dataset.digit)));
    // Caught as the turn begins: every drum (those still waiting their stagger too) shows its own
    // digit, one turn up — the same glyph it rests on. Caught from inside the page, the frame
    // the roll starts (the runner's own polling can trail it by hundreds of ms, by which time
    // drums have turned or finished), and held at the start of each drum's own active phase.
    // Not at time 0: seeking a drum already turning back into its delay fires `animationend`
    // (CSS Animations 2, active → before), and the last drum's `animationend` ends the roll.
    await list.evaluate(
      (el) =>
        new Promise<void>((started) => {
          const check = () => {
            if (el.getAttribute('data-roll') !== 'rolling') {
              requestAnimationFrame(check);
              return;
            }
            for (const reel of el.querySelectorAll('[data-reel]')) {
              for (const animation of reel.getAnimations()) {
                animation.pause();
                animation.currentTime = animation.effect?.getTiming().delay ?? 0;
              }
            }
            started();
          };
          check();
        }),
    );
    await expect(list).toHaveAttribute('data-roll', 'rolling');
    expect((await steps()).map(Math.round)).toEqual(digits);
    // Mid-turn: somewhere between the two, never below its own digit.
    await list.evaluate((el) => {
      for (const reel of el.querySelectorAll('[data-reel]')) {
        for (const animation of reel.getAnimations()) animation.currentTime = 400;
      }
    });
    const mid = await steps();
    mid.forEach((s, i) => {
      expect(s).toBeGreaterThan(digits[i]!);
      expect(s).toBeLessThan(digits[i]! + 10);
    });
    await list.evaluate((el) => {
      for (const reel of el.querySelectorAll('[data-reel]')) {
        for (const animation of reel.getAnimations()) animation.play();
      }
    });
    await expect(list).toHaveAttribute('data-roll', 'done', { timeout: 10_000 });
    expect((await steps()).map(Math.round)).toEqual(digits.map((d) => d + 10));
    expect(await page.evaluate(() => window.__rollStates)).toEqual(['rolling', 'done']);
  });

  test('the Motion toggle stops everything and persists across reload', async ({ page }) => {
    await countAnimationFrames(page);
    await gotoRel(page, '');
    const html = page.locator('html');
    const toggle = page.locator(TOGGLE);
    // "Motion", pressed = motion on: the name starts with the visible label (WCAG 2.5.3).
    await expect(toggle).toHaveAccessibleName('Motion');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(toggle.locator('[data-motion-state]')).toHaveText('On');
    await graphIs(page, 'running');

    await toggle.click();
    await expect(html).toHaveAttribute('data-motion', 'off');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(toggle.locator('[data-motion-state]')).toHaveText('Off');
    // Typing snaps to its final line (it may still have been running).
    await expect(page.locator(FOCUS_LINE)).toHaveAttribute('data-state', 'done');
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await graphIs(page, 'static');
    await expectFrozen(page);
    expect(await page.evaluate(() => localStorage.getItem('motion'))).toBe('off');

    await page.reload();
    await expect(html).toHaveAttribute('data-motion', 'off');
    await expect(toggle.locator('[data-motion-state]')).toHaveText('Off');
    await expect(page.locator(FOCUS_LINE)).toHaveAttribute('data-state', 'done');
    await graphIs(page, 'static');
    await expectFrozen(page);

    await toggle.click();
    await expect(html).not.toHaveAttribute('data-motion');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await graphIs(page, 'running');
    expect(await page.evaluate(() => localStorage.getItem('motion'))).toBeNull();
  });

  test('switched off, the next page arrives without a cross-document transition', async ({
    page,
  }) => {
    // What each page's reveal saw: no transition, one that was skipped, or one that ran.
    await page.addInitScript(() => {
      window.__reveals = [];
      addEventListener('pagereveal', (event) => {
        const vt = (event as Event & { viewTransition?: ViewTransition | null }).viewTransition;
        if (!vt) {
          window.__reveals!.push('none');
          return;
        }
        vt.ready.then(
          () => window.__reveals!.push('ran'),
          () => window.__reveals!.push('skipped'),
        );
      });
    });
    await gotoRel(page, '');
    // With motion on, a same-origin navigation runs one (where the browser has them at all).
    await page.locator('.site-nav a', { hasText: 'Work' }).click();
    await page.waitForURL(/\/work\/$/);
    await page.waitForLoadState('load');
    await page.waitForTimeout(600);
    const supported = (await page.evaluate(() => window.__reveals)) ?? [];
    test.skip(!supported.includes('ran'), 'no cross-document view transitions here');

    // Switched off on this page, then away: the transition is skipped on both sides.
    const chip = page.locator('footer [data-motion-toggle]');
    await expect(chip).not.toBeHidden({ timeout: 10_000 });
    await page.evaluate(() =>
      document.querySelector<HTMLButtonElement>('footer [data-motion-toggle]')!.click(),
    );
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
    await page.locator('.brand').click();
    await page.waitForURL(/\/Portfolio\/$/);
    await page.waitForLoadState('load');
    await page.waitForTimeout(600);
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
    const reveals = (await page.evaluate(() => window.__reveals)) ?? [];
    expect(reveals.length).toBe(1);
    expect(['none', 'skipped']).toContain(reveals[0]);
  });

  test('switching motion off mid-sequence snaps the focus line', async ({ page }) => {
    await gotoRel(page, '');
    const line = page.locator(FOCUS_LINE);
    await expect(line).toHaveAttribute('data-state', 'typing');
    await page.evaluate(() => {
      document.querySelector<HTMLButtonElement>('.hero [data-motion-toggle]')?.click();
    });
    await expect(line).toHaveAttribute('data-state', 'done');
    await expect(line.locator('[data-focus-typed]')).toHaveText(FOCUS_TEXT);
  });

  test('the Motion toggle works from the keyboard', async ({ page }) => {
    await gotoRel(page, '');
    const toggle = page.locator(TOGGLE);
    await expect(toggle).toBeVisible();
    await toggle.focus();
    await expect(toggle).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
    await page.keyboard.press('Space');
    await expect(page.locator('html')).not.toHaveAttribute('data-motion');
  });

  test('the monogram caret blinks on the first page of a session only', async ({ page }) => {
    await gotoRel(page, '');
    const monogram = headerMonogram(page);
    const blinking = () =>
      monogram.locator('.monogram__cursor').evaluate((el) => el.getAnimations().length);
    await expect(monogram).toHaveClass(/\bis-blinking\b/);
    expect(await blinking()).toBe(1);
    await gotoRel(page, 'work/');
    await expect(monogram).not.toHaveClass(/\bis-blinking\b/);
    expect(await blinking()).toBe(0);
  });
});

test.describe('phones', () => {
  test.use({ reducedMotion: 'no-preference', viewport: { width: 390, height: 844 } });

  test('the hero is the full chapter opener, and the footer chip runs motion', async ({ page }) => {
    await gotoRel(page, '');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.hero__lede')).toBeVisible();
    // The focus line and actions are part of the phone hero too (Portfolio.dc.html `data-mhero`);
    // only the graph, readouts and status strip are the wider layouts'.
    await expect(page.locator(FOCUS_LINE)).toBeVisible();
    await expect(page.locator('.hero__actions')).toBeVisible();
    for (const hidden of [GRAPH, '[data-readouts]', TOGGLE, '.hero .status-strip']) {
      await expect(page.locator(hidden), hidden).toBeHidden();
    }
    // The phone bar's monogram is the one on show, and it blinks on the first page.
    const monogram = headerMonogram(page);
    await expect(monogram).toHaveCount(1);
    await expect(monogram).toHaveClass(/\bis-blinking\b/);
    const chip = page.locator('footer [data-motion-toggle]');
    await expect(chip).not.toBeHidden({ timeout: 10_000 });
    await chip.click();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  });
});

/**
 * Revealing the Motion chip (hidden until its script runs) never shifts the layout: the slot
 * reserves the chip's widest box. Tablet widths are where the rail's readouts and chip sit
 * closest to wrapping (from 40rem, where the hero first shows them); the chip's script is held
 * back so the reveal lands after first paint.
 */
for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  for (const width of [640, 700]) {
    test.describe(`chip reveal at ${width}px (${reducedMotion})`, () => {
      test.use({ reducedMotion, viewport: { width, height: 900 } });

      test('causes no layout shift', async ({ page, browserName }) => {
        test.skip(browserName === 'webkit', 'layout-shift entries are Chromium-only');
        await page.addInitScript(() => {
          window.__shifts = [];
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as (PerformanceEntry & {
              value: number;
              sources?: { node?: Node | null }[];
            })[]) {
              window.__shifts!.push({
                value: entry.value,
                sources: (entry.sources ?? []).map(
                  (source) => (source.node as Element | null)?.className?.toString() ?? '#text',
                ),
              });
            }
          }).observe({ type: 'layout-shift', buffered: true });
        });
        await delayMotionLayer(page, 400);
        await gotoRel(page, '');
        await expect(page.locator(TOGGLE)).toBeVisible();
        await page.waitForTimeout(400);
        const shifts = (await page.evaluate(() => window.__shifts)) ?? [];
        // Sub-pixel rounding can register a shift entry with no visible movement (Chromium
        // reports these down to ~1e-5); anything under Google's "good" CLS budget (0.1), with
        // a wide margin, is noise, not the chip's reveal shifting real content.
        const total = shifts.reduce((sum, s) => sum + s.value, 0);
        expect(total, `layout-shift entries: ${JSON.stringify(shifts)}`).toBeLessThan(0.01);
      });
    });
  }
}
