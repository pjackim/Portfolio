/**
 * The experience git log and the /work/ showcases (Portfolio.dc.html, Claude Design, Sept 2026;
 * the log reworked on design/git-log-rework).
 * - Git log (/experience/, and home's Experience): every milestone, newest first, all open by
 *   default; a milestone's toggle folds and opens its skills, nested under it; every row carries a
 *   graph slice exactly its own height, so the lanes meet row to row whatever wraps; a `--grep`
 *   chip opens its family's milestones, dims the rest and says so in the command line, a
 *   milestone's toggle still works while a family is picked, and "all" goes back; skills still
 *   being learned sit above HEAD, marked; without JavaScript there are no controls and every
 *   milestone's skills still show.
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
const logHeight = (page: Page) =>
  page
    .locator(`${LOG} .git-log__list`)
    .first()
    .evaluate((el) => el.getBoundingClientRect().height);

test.describe('experience log', () => {
  test.use({ reducedMotion: 'reduce' });

  test('every milestone, newest first: all open by default', async ({ page }) => {
    await gotoRel(page, 'experience/');
    const commits = page.locator(COMMIT);
    expect(await commits.count()).toBeGreaterThan(3);
    const head = commits.first();
    await expect(head).toContainText('HEAD → main');
    await expect(head).toHaveAttribute('data-open');
    await expect(head.locator('[data-skill]').first()).toBeVisible();
    await expect(head.locator('.commit__toggle')).toHaveAttribute('aria-expanded', 'true');
    const folded = await commits.evaluateAll(
      (els) =>
        els.filter((el) => el.querySelector('.commit__toggle') && !el.hasAttribute('data-open'))
          .length,
    );
    expect(folded).toBe(0);
    await expect(page.locator(`${COMMIT} .commit__toggle[aria-expanded="false"]`)).toHaveCount(0);
  });

  test('a toggle folds and opens its milestone, with its skills nested under it', async ({
    page,
  }) => {
    await gotoRel(page, 'experience/');
    await logReady(page);
    const commit = page.locator(`${COMMIT}:has(button.commit__toggle)`).nth(1);
    const toggle = commit.locator('button.commit__toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(commit.locator('[data-skill]').first()).toBeVisible();
    const before = await logHeight(page);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(commit.locator('[data-skill]').first()).toBeHidden();
    await expect.poll(() => logHeight(page)).toBeLessThan(before);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const skill = commit.locator('[data-skill] .skill__name').first();
    await expect(skill).toBeVisible();
    // Nested: the skill's text starts to the right of its milestone's title.
    const title = (await commit.locator('.commit__title').boundingBox())!;
    const text = await skill.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.left + parseFloat(getComputedStyle(el).paddingInlineStart);
    });
    expect(text).toBeGreaterThan(title.x + 8);
    // Staggered like the graph: a skill on a lane further from main starts further in, and the
    // tick into each skill is its family's colour, the same as its dot in the graph.
    const skills = await commit.locator('[data-skill]').evaluateAll((els) =>
      els.map((el) => {
        const name = el.querySelector<HTMLElement>('.skill__name')!;
        const tick = getComputedStyle(name, '::after');
        const last = el === el.parentElement?.lastElementChild;
        return {
          lane: Number(el.getAttribute('data-lane')),
          x:
            name.getBoundingClientRect().left +
            parseFloat(getComputedStyle(name).paddingInlineStart),
          tick: last ? tick.borderBottomColor : tick.borderTopColor,
          dot: getComputedStyle(el.querySelector('.gl-node--fill')!).fill,
        };
      }),
    );
    expect(new Set(skills.map((s) => s.lane)).size).toBeGreaterThan(1);
    for (const a of skills) {
      for (const b of skills) {
        if (a.lane < b.lane) expect(b.x - a.x).toBeGreaterThanOrEqual(4);
        if (a.lane === b.lane) expect(Math.abs(a.x - b.x)).toBeLessThan(1);
      }
      expect(a.tick).toBe(a.dot);
    }
    await expect.poll(() => logHeight(page)).toBe(before);
  });

  test('every row has a graph slice exactly its height, so the lanes meet', async ({ page }) => {
    await gotoRel(page, 'experience/');
    await logReady(page);
    // Open everything, so the skill rows are measured too.
    const folded = page.locator(`${COMMIT} button.commit__toggle[aria-expanded="false"]`);
    while ((await folded.count()) > 0) await folded.first().click();
    const off = await page.locator(`${LOG} .git-log__row`).evaluateAll((rows) =>
      rows
        .filter((r) => r.getBoundingClientRect().height > 0)
        .map((r) => {
          const svg = r.querySelector('.gl-svg')!.getBoundingClientRect();
          const row = r.getBoundingClientRect();
          return Math.abs(svg.top - row.top) + Math.abs(svg.bottom - row.bottom);
        })
        .filter((d) => d > 0.5),
    );
    expect(off).toEqual([]);
  });

  test("the graph's geometry matches the CSS: column width and node line", async ({ page }) => {
    await gotoRel(page, 'experience/');
    await logReady(page);
    // GitLog.astro's --gl-w and --y are literals mirroring src/lib/git-log.ts (graphWidth,
    // NODE_Y): each graph column must be exactly its SVG's width, and each milestone's title must
    // sit on the node line of its row's main-line node.
    const drift = await page.locator(`${COMMIT} > .commit__row`).evaluateAll((rows) =>
      rows.flatMap((r) => {
        const svg = r.querySelector<SVGSVGElement>('.gl-svg')!;
        const gutter = svg.parentElement!.getBoundingClientRect();
        const node = svg.querySelector('circle.gl-f-main:not(.gl-halo)')!.getBoundingClientRect();
        const title = r.querySelector('.commit__title')!.getBoundingClientRect();
        const width = Math.abs(gutter.width - Number(svg.getAttribute('width')));
        const line = Math.abs(node.top + node.height / 2 - (title.top + title.height / 2));
        return width > 0.5 || line > 2 ? [{ width, line }] : [];
      }),
    );
    expect(drift).toEqual([]);
  });

  test('--grep opens a family, dims the rest, and says so', async ({ page }) => {
    await gotoRel(page, 'experience/');
    await logReady(page);
    const cmd = page.locator(`${LOG} [data-git-cmd]`);
    await expect(cmd).toHaveText('git log --graph --all');
    await page.locator(`${LOG} button[data-grep="software"]`).click();
    await expect(page.locator(`${LOG} button[data-grep="software"]`)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator(`${LOG} button[data-grep=""]`)).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(cmd).toHaveText('git log --graph --all --grep=software');
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
    await expect(cmd).toHaveText('git log --graph --all');
    await expect(page.locator(`${LOG} [data-dim]`)).toHaveCount(0);
  });

  test('a toggle still works while a family is picked, and keeps the pick', async ({ page }) => {
    await gotoRel(page, 'experience/');
    await logReady(page);
    const chip = page.locator(`${LOG} button[data-grep="design"]`);
    await chip.click();
    // A milestone the pick left folded (by id: once open, it no longer matches `:not([data-open])`).
    const id = await page
      .locator(`${COMMIT}:not([data-open]):has(button.commit__toggle)`)
      .first()
      .getAttribute('data-commit');
    const toggle = page.locator(`${LOG} li[data-commit="${id}"] button.commit__toggle`);
    // The note (a live region) describes the pick; a toggle must not rewrite, and so re-announce, it.
    const note = page.locator(`${LOG} [data-git-note] b`).first();
    await note.evaluate((el) => el.setAttribute('data-seen', ''));
    await toggle.click();
    await expect(note).toHaveAttribute('data-seen', '');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator(`${LOG} [data-git-cmd]`)).toHaveText(
      'git log --graph --all --grep=design',
    );
  });

  test('skills still being learned sit above HEAD, marked', async ({ page }) => {
    await gotoRel(page, 'experience/');
    const learning = page.locator(`${LOG} [data-skill][data-learning]`);
    expect(await learning.count()).toBeGreaterThan(0);
    await expect(learning.first()).toContainText('learning');
    const tip = (await learning.last().boundingBox())!;
    const head = (await page.locator(COMMIT).first().boundingBox())!;
    expect(tip.y + tip.height).toBeLessThanOrEqual(head.y + 1);
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
