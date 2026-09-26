/**
 * Motion layer (interactions spec §1, §2, §5): the hero "live instrument" and the Motion
 * toggle.
 * - Reduced motion: the attack-path canvas is a decorative (`aria-hidden`) static frame with no
 *   animation loop at all (no requestAnimationFrame calls, pixels stable); every animated
 *   readout shows its final text; the toggle defers to the OS setting.
 * - Motion on: the canvas animates (pixels change), the h1 is never touched, the focus line
 *   types and settles on its full text within 5.5 s of load, the reels roll to their values.
 * - The toggle: stops everything live (canvas, typing), is keyboard operable, and persists
 *   across a reload. The monogram caret blinks on the first page of a session only.
 * Runs on every project (desktop Chromium, Pixel 7, iPhone 15 / WebKit).
 */
import { expect, test, type Page } from '@playwright/test';
import { gotoRel, ROUTES } from './helpers/routes.ts';

declare global {
  interface Window {
    __rafCalls?: number;
    __h1Mutations?: number;
  }
}

const GRAPH = 'canvas[data-hero-graph]';
const FOCUS_LINE = '[data-focus-line]';
const TOGGLE = '.hero [data-motion-toggle]';
const FOCUS_TEXT = 'reverse engineering · machine learning · embedded systems';
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

/** The graph starts after load + idle; wait until it has drawn and settled into `state`. */
async function graphIs(page: Page, state: 'running' | 'static'): Promise<void> {
  await expect(page.locator(GRAPH)).toHaveAttribute('data-state', state, { timeout: 10_000 });
}

/** Asserts no animation frame is requested and no pixel changes over `ms`. */
async function expectFrozen(page: Page, ms = 900): Promise<void> {
  const calls = await rafCalls(page);
  const before = await graphSignature(page);
  await page.waitForTimeout(ms);
  expect(await rafCalls(page), 'requestAnimationFrame calls while frozen').toBe(calls);
  expect(await graphSignature(page)).toEqual(before);
  expect(before.ink, 'the static frame shows the graph').toBeGreaterThan(0);
}

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the graph is a decorative static frame with no animation loop', async ({ page }) => {
    await countAnimationFrames(page);
    await gotoRel(page, '');
    const graph = page.locator(GRAPH);
    await expect(graph).toHaveAttribute('aria-hidden', 'true');
    await graphIs(page, 'static');
    await expectFrozen(page);
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
    await expect(page.locator('.site-header .monogram')).not.toHaveClass(/\bis-blinking\b/);
  });

  test('the Motion toggle defers to the system setting', async ({ page }) => {
    await gotoRel(page, '');
    const toggle = page.locator(TOGGLE);
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAccessibleName('Reduce motion');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(toggle).toHaveAttribute('aria-disabled', 'true');
    await expect(toggle.locator('[data-motion-state]')).toHaveText('Off (system)');
    await expect(toggle).toHaveAccessibleDescription(/device is set to reduce motion/);
    // aria-disabled: Playwright won't treat it as actionable, so force the click through.
    await toggle.click({ force: true });
    await expect(page.locator('html')).not.toHaveAttribute('data-motion');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('motion on', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the graph animates', async ({ page }) => {
    await gotoRel(page, '');
    await expect(page.locator(GRAPH)).toHaveAttribute('aria-hidden', 'true');
    await graphIs(page, 'running');
    const first = await graphSignature(page);
    await page.waitForTimeout(700);
    const second = await graphSignature(page);
    expect(first.ink).toBeGreaterThan(0);
    expect(second).not.toEqual(first);
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

  test('the focus line types, then settles on the full text within 5.5 s', async ({ page }) => {
    await gotoRel(page, ''); // resolves on `load`
    const loaded = Date.now();
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

    await expect(line).toHaveAttribute('data-state', 'done', {
      timeout: 5500 - (Date.now() - loaded),
    });
    await expect(typed).toHaveText(FOCUS_TEXT);
    await expect(line.locator('.hero__focus-static')).toBeVisible();
  });

  test('the readouts roll onto their values', async ({ page }) => {
    await gotoRel(page, '');
    const featured = await page.locator('.project-grid > li').count();
    const list = page.locator('[data-readouts]');
    await expect(list.locator('.visually-hidden')).toHaveText([
      `${PROJECT_COUNT} projects`,
      `${featured} case studies`,
      'About 120 million credentials analyzed',
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
      `${String(PROJECT_COUNT).padStart(2, '0')}${String(featured).padStart(2, '0')}120`,
    );
    for (const { digit, steps } of reels) expect(steps).toBe(10 + digit);
  });

  test('the Motion toggle stops everything and persists across reload', async ({ page }) => {
    await countAnimationFrames(page);
    await gotoRel(page, '');
    const html = page.locator('html');
    const toggle = page.locator(TOGGLE);
    await expect(toggle).toHaveAccessibleName('Reduce motion');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(toggle.locator('[data-motion-state]')).toHaveText('On');
    await graphIs(page, 'running');

    await toggle.click();
    await expect(html).toHaveAttribute('data-motion', 'off');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
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
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await graphIs(page, 'running');
    expect(await page.evaluate(() => localStorage.getItem('motion'))).toBeNull();
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
    const monogram = page.locator('.site-header .monogram');
    await expect(monogram).toHaveClass(/\bis-blinking\b/);
    await gotoRel(page, 'work/');
    await expect(monogram).not.toHaveClass(/\bis-blinking\b/);
  });
});
