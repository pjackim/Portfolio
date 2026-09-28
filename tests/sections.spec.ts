/**
 * The experience git log and the /work/ showcases (Portfolio.dc.html, Claude Design, Sept 2026).
 * - Git log (/experience/, and home's Experience): every commit, newest first, HEAD open and the
 *   rest folded; a commit's toggle opens its skills and the graph grows to match; a `--grep` chip
 *   opens its family's commits, dims the rest and says so in the command line, and "all" goes
 *   back; skills still being learned are marked; without JavaScript there are no controls and
 *   HEAD's skills still show.
 * - Showcases (/work/): each lead's tick fills over 6 s and moves the lead on when it's full;
 *   hover or the status button pauses it (WCAG 2.2.2), and with reduced motion nothing runs; a
 *   tick picks a project and focus follows to the same tick in the new lead; hovering a row (fine
 *   pointer) floats its cover beside the pointer, inside the list.
 * Runs on every project (desktop Chromium, Pixel 7, iPhone 15 / WebKit), on a wide viewport; the
 * phone layouts are tests/phone.spec.ts.
 */
import { expect, test, type Page } from '@playwright/test';
import { gotoRel } from './helpers/routes.ts';

test.use({ viewport: { width: 1280, height: 800 } });

const LOG = '[data-git-log]';
const COMMIT = `${LOG} li[data-commit]`;

const logReady = (page: Page) => expect(page.locator(`${LOG}[data-ready]`)).toBeAttached();
const graphHeight = (page: Page) =>
  page.locator(`${LOG} [data-git-graph]`).evaluate((el) => el.getBoundingClientRect().height);

test.describe('experience log', () => {
  test.use({ reducedMotion: 'reduce' });

  test('every commit, newest first: HEAD open, the rest folded', async ({ page }) => {
    await gotoRel(page, 'experience/');
    const commits = page.locator(COMMIT);
    expect(await commits.count()).toBeGreaterThan(3);
    const head = commits.first();
    await expect(head).toContainText('HEAD → main');
    await expect(head).toHaveAttribute('data-open');
    await expect(head.locator('[data-skill]').first()).toBeVisible();
    await expect(head.locator('.commit__toggle')).toHaveAttribute('aria-expanded', 'true');
    const openBelowHead = await commits.evaluateAll(
      (els) => els.slice(1).filter((el) => el.hasAttribute('data-open')).length,
    );
    expect(openBelowHead).toBe(0);
  });

  test('a toggle opens its commit, and the graph grows to match', async ({ page }) => {
    await gotoRel(page, 'experience/');
    await logReady(page);
    const commit = page.locator(`${COMMIT}:has(button.commit__toggle)`).nth(1);
    const toggle = commit.locator('button.commit__toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(commit.locator('[data-skill]').first()).toBeHidden();
    const before = await graphHeight(page);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(commit.locator('[data-skill]').first()).toBeVisible();
    await expect.poll(() => graphHeight(page)).toBeGreaterThan(before);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => graphHeight(page)).toBe(before);
  });

  test('--grep opens a family, dims the rest, and says so', async ({ page }) => {
    await gotoRel(page, 'experience/');
    await logReady(page);
    const cmd = page.locator(`${LOG} [data-git-cmd]`);
    await expect(cmd).toHaveText('git log --graph --first-parent');
    await page.locator(`${LOG} button[data-grep="software"]`).click();
    await expect(page.locator(`${LOG} button[data-grep="software"]`)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator(`${LOG} button[data-grep=""]`)).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(cmd).toHaveText('git log --graph --grep=software');
    const rows = await page.locator(COMMIT).evaluateAll((els) =>
      els.map((el) => ({
        dim: el.hasAttribute('data-dim'),
        open: el.hasAttribute('data-open'),
        hit: [...el.querySelectorAll<HTMLElement>('[data-skill]')].some(
          (s) => s.dataset.family === 'software',
        ),
      })),
    );
    expect(rows.some((r) => r.hit)).toBe(true);
    for (const r of rows) expect(r).toEqual({ dim: !r.hit, open: r.hit, hit: r.hit });
    await page.locator(`${LOG} button[data-grep=""]`).click();
    await expect(cmd).toHaveText('git log --graph --first-parent');
    await expect(page.locator(`${COMMIT}[data-dim]`)).toHaveCount(0);
  });

  test('skills still being learned are marked', async ({ page }) => {
    await gotoRel(page, 'experience/');
    const learning = page.locator(`${COMMIT} [data-skill][data-learning]`);
    expect(await learning.count()).toBeGreaterThan(0);
    await expect(learning.first()).toContainText('learning');
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('no controls, and HEAD still shows its skills', async ({ page }) => {
      await gotoRel(page, 'experience/');
      await expect(page.locator(`${LOG} button[data-grep]`).first()).toBeHidden();
      await expect(page.locator(`${COMMIT} button.commit__toggle`).first()).toBeHidden();
      await expect(page.locator(COMMIT).first().locator('[data-skill]').first()).toBeVisible();
    });
  });
});

const SHOWCASE = '[data-showcase]';
const lead = (page: Page) => page.locator(`${SHOWCASE} >> nth=0`).locator('[data-lead]:visible');
/** The running (or paused) fill of the first showcase's pressed tick. */
const fill = (page: Page) =>
  page
    .locator(`${SHOWCASE} >> nth=0`)
    .locator('[data-lead]:not([hidden]) .tick[aria-pressed="true"] .tick__bar');
const fillState = (page: Page) =>
  fill(page).evaluate((el) => el.getAnimations()[0]?.playState ?? 'none');

async function showcaseReady(page: Page): Promise<void> {
  await expect(page.locator(`${SHOWCASE}:not([data-ready])`)).toHaveCount(0);
  await expect(page.locator(`${SHOWCASE} >> nth=0`)).toHaveAttribute('data-ready', '');
}

test.describe('work showcase, motion on', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the lead moves on when its tick fills, and hovering pauses it', async ({ page }) => {
    await gotoRel(page, 'work/');
    await showcaseReady(page);
    await page.mouse.move(2, 2);
    const first = await lead(page).getAttribute('data-lead');
    await expect.poll(() => fillState(page)).toBe('running');
    // Fill it now rather than wait out the 6 s.
    await fill(page).evaluate((el) => el.getAnimations()[0]!.finish());
    await expect(lead(page)).not.toHaveAttribute('data-lead', first!);
    await expect(page.locator(`${SHOWCASE} >> nth=0`).locator('[data-showcase-pos]')).toHaveText(
      /^02 \/ \d\d$/,
    );
    await expect.poll(() => fillState(page)).toBe('running');
    await lead(page).hover();
    await expect.poll(() => fillState(page)).toBe('paused');
  });

  test('the status button pauses the rotation, and says so', async ({ page }) => {
    await gotoRel(page, 'work/');
    await showcaseReady(page);
    const button = page.locator(`${SHOWCASE} >> nth=0`).locator('[data-showcase-toggle]');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(button).toContainText('Paused');
    await page.mouse.move(2, 2);
    await button.blur();
    await expect.poll(() => fillState(page)).toBe('paused');
  });

  test('a tick picks a project, and focus follows to the same tick', async ({ page }) => {
    await gotoRel(page, 'work/');
    await showcaseReady(page);
    const tick = lead(page).locator('.tick').nth(2);
    const id = await tick.getAttribute('data-tick');
    await tick.click();
    await expect(lead(page)).toHaveAttribute('data-lead', id!);
    const again = lead(page).locator(`.tick[data-tick="${id}"]`);
    await expect(again).toBeFocused();
    await expect(again).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.locator(`${SHOWCASE} >> nth=0`).locator(`[data-project="${id}"]`),
    ).toHaveAttribute('data-on', '');
  });

  test('hovering a row floats its cover beside the pointer, inside the list', async ({ page }) => {
    await gotoRel(page, 'work/');
    test.skip(
      !(await page.evaluate(() => matchMedia('(hover: hover)').matches)),
      'hover only (touch screens get the lead instead)',
    );
    await showcaseReady(page);
    const list = page.locator(`${SHOWCASE} >> nth=0`).locator('[data-showcase-list]');
    const row = list.locator('[data-project]').nth(1);
    await row.scrollIntoViewIfNeeded();
    const box = (await row.boundingBox())!;
    // Near the row's right end: the preview must still fit inside the list.
    await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2, { steps: 4 });
    const thumb = row.locator('.work-row__thumb');
    await expect(thumb).toHaveCSS('opacity', '1');
    const listBox = (await list.boundingBox())!;
    await expect
      .poll(async () => {
        const t = (await thumb.boundingBox())!;
        return t.x + t.width <= listBox.x + listBox.width + 1;
      })
      .toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
});

test.describe('work showcase, reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('nothing moves on by itself', async ({ page }) => {
    await gotoRel(page, 'work/');
    await showcaseReady(page);
    await page.mouse.move(2, 2);
    expect(await fillState(page)).toBe('none');
    const running = await page.evaluate(
      () =>
        document.getAnimations().filter((a) => (a as CSSAnimation).animationName === 'tick-fill')
          .length,
    );
    expect(running).toBe(0);
  });
});
