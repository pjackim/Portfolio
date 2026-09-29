/**
 * Media behaviour: the trip-planner loops (muted, inline, postered, with a visible Pause
 * toggle; play only while on screen; a pause sticks; never play under reduced motion or with the
 * site's Motion toggle off, which pauses a playing loop live and, back on, resumes only a loop
 * the reader hadn't paused), and
 * the YouTube facade on the-forest (nothing requested from YouTube or ytimg until the click,
 * then a titled, focused player). Keyboard focus shows on footage: the loop chip fills with the
 * accent, and a click-to-play video draws its ring inside the frame. Runs on desktop Chromium
 * and mobile WebKit.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { isWindowsWebKit, WINDOWS_WEBKIT } from './helpers/platform.ts';
import { gotoRel } from './helpers/routes.ts';

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chrome', 'media runs on chromium + webkit');
});

const LOOPS = '[data-video][data-autoplay]';
/** Long enough for the IntersectionObserver and a play() to have happened, if they would. */
const SETTLE_MS = 750;

const isPaused = (video: Locator) => video.evaluate((v: HTMLVideoElement) => v.paused);
const center = (element: Locator) =>
  element.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
const toTop = (page: Page) => page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));

test.describe('trip-planner loops', () => {
  test.skip(({ browserName }) => isWindowsWebKit(browserName), WINDOWS_WEBKIT.media);

  test('are muted, inline and postered, with a pause button', async ({ page }) => {
    await gotoRel(page, 'work/trip-planner/');
    const loops = page.locator(LOOPS);
    await expect(loops).toHaveCount(2);
    for (const loop of await loops.all()) {
      const video = loop.locator('video');
      const state = await video.evaluate((v: HTMLVideoElement) => ({
        muted: v.muted,
        mutedAttribute: v.defaultMuted,
        playsInline: v.playsInline,
        loop: v.loop,
        controls: v.controls,
        poster: v.getAttribute('poster') ?? '',
      }));
      expect(state).toMatchObject({
        muted: true,
        mutedAttribute: true,
        playsInline: true,
        loop: true,
        controls: false,
      });
      expect(state.poster).toMatch(/^\/Portfolio\/.+\.webp$/);
      const toggle = loop.getByRole('button', { name: /^(Pause|Play) video$/ });
      await expect(toggle).toBeVisible();
    }
  });

  test('play once scrolled into view, and a pause sticks', async ({ page }) => {
    await gotoRel(page, 'work/trip-planner/');
    const loop = page.locator(LOOPS).first();
    const video = loop.locator('video');
    const toggle = loop.getByRole('button');

    // Below the fold: not playing yet.
    await page.waitForTimeout(SETTLE_MS);
    expect(await isPaused(video)).toBe(true);

    await center(video);
    await expect.poll(() => isPaused(video), { timeout: 10_000 }).toBe(false);
    await expect(toggle).toHaveAccessibleName('Pause video');

    await toggle.click();
    await expect.poll(() => isPaused(video)).toBe(true);
    await expect(toggle).toHaveAccessibleName('Play video');

    // Scrolled away and back: still paused.
    await toTop(page);
    await page.waitForTimeout(SETTLE_MS);
    await center(video);
    await page.waitForTimeout(SETTLE_MS);
    expect(await isPaused(video)).toBe(true);

    // Play resumes it.
    await toggle.click();
    await expect.poll(() => isPaused(video)).toBe(false);
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('nothing plays', async ({ page }) => {
      await gotoRel(page, 'work/trip-planner/');
      const videos = page.locator('video');
      for (const video of await page.locator(`${LOOPS} video`).all()) {
        await center(video);
        await page.waitForTimeout(SETTLE_MS);
      }
      const playing = await videos.evaluateAll((all) =>
        all.filter((v) => !(v as HTMLVideoElement).paused).map((v) => v.getAttribute('aria-label')),
      );
      expect(playing).toEqual([]);
      await expect(page.locator(`${LOOPS} .video-toggle`).first()).toHaveAccessibleName(
        'Play video',
      );
    });
  });

  test.describe('with the site Motion toggle', () => {
    test.use({ reducedMotion: 'no-preference' });

    /** Flips the footer's Motion chip without scrolling to it (the loop stays on screen). */
    const toggleMotion = async (page: Page) => {
      await expect(page.locator('footer [data-motion-toggle]')).not.toBeHidden({ timeout: 10_000 });
      await page.evaluate(() =>
        document.querySelector<HTMLButtonElement>('footer [data-motion-toggle]')!.click(),
      );
    };

    test('stored off: nothing plays', async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem('motion', 'off'));
      await gotoRel(page, 'work/trip-planner/');
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
      const video = page.locator(`${LOOPS} video`).first();
      await center(video);
      await page.waitForTimeout(SETTLE_MS);
      expect(await isPaused(video)).toBe(true);
      await expect(page.locator(LOOPS).first().getByRole('button')).toHaveAccessibleName(
        'Play video',
      );
    });

    test('off pauses a playing loop; back on resumes it, unless the reader paused it', async ({
      page,
    }) => {
      await gotoRel(page, 'work/trip-planner/');
      const loop = page.locator(LOOPS).first();
      const video = loop.locator('video');
      await center(video);
      await expect.poll(() => isPaused(video), { timeout: 10_000 }).toBe(false);

      await toggleMotion(page);
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
      await expect.poll(() => isPaused(video)).toBe(true);
      await expect(loop.getByRole('button')).toHaveAccessibleName('Play video');

      await toggleMotion(page);
      await expect(page.locator('html')).not.toHaveAttribute('data-motion');
      await expect.poll(() => isPaused(video)).toBe(false);

      // Paused by the reader: motion going off and on again leaves it paused.
      await loop.getByRole('button').click();
      await expect.poll(() => isPaused(video)).toBe(true);
      await toggleMotion(page);
      await toggleMotion(page);
      await expect(page.locator('html')).not.toHaveAttribute('data-motion');
      await page.waitForTimeout(SETTLE_MS);
      expect(await isPaused(video)).toBe(true);
    });
  });
});

test.describe('trip-planner video focus, from the keyboard', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'keyboard focus: desktop Chromium');
  });

  /** The accent as the page resolves it, read off a probe styled through the CSSOM. */
  const accent = (page: Page) =>
    page.evaluate(() => {
      const probe = document.createElement('i');
      probe.style.color = 'var(--accent)';
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    });

  // The ring alone would sit on the footage, where no one colour keeps 3:1.
  test('the Pause / Play chip fills with the accent', async ({ page }) => {
    await gotoRel(page, 'work/trip-planner/');
    const toggle = page.locator(`${LOOPS} .video-toggle`).first();
    await center(toggle);
    await toggle.focus();
    expect(await toggle.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
    await expect(toggle).toHaveCSS('background-color', await accent(page));
  });

  // The figure frame's overflow clips the video's own ring, so one is drawn inside it.
  test('a click-to-play video shows a ring inside its frame', async ({ page }) => {
    await gotoRel(page, 'work/trip-planner/');
    const wrapper = page.locator('[data-video]:not([data-autoplay])').first();
    const video = wrapper.locator('video');
    await expect(video).toHaveJSProperty('controls', true);
    await center(video);
    const ring = () =>
      wrapper.evaluate((el) => {
        const after = getComputedStyle(el, '::after');
        return { content: after.content, style: after.borderTopStyle, color: after.borderTopColor };
      });
    expect((await ring()).content).toBe('none');
    await video.focus();
    expect(await video.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
    expect(await ring()).toEqual({ content: '""', style: 'solid', color: await accent(page) });
  });
});

test('the-forest YouTube facade requests nothing from YouTube until clicked', async ({ page }) => {
  const youtube: string[] = [];
  page.on('request', (request) => {
    if (/youtube|ytimg/i.test(request.url())) youtube.push(request.url());
  });
  // Hermetic: the player document is stubbed, never fetched from YouTube.
  await page.route(/^https:\/\/www\.youtube-nocookie\.com\//, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>player</title>' }),
  );

  await gotoRel(page, 'work/the-forest/');
  const facade = page.locator('.yt-frame button.yt');
  await expect(facade).toHaveAccessibleName(/^Play video: \S/);
  await center(facade);
  await page.waitForLoadState('load');
  await page.waitForTimeout(SETTLE_MS);
  expect(youtube).toEqual([]);

  await facade.click();
  const player = page.locator('.yt-frame iframe.yt-player');
  await expect(player).toHaveAttribute('title', /\S/);
  await expect(player).toHaveAttribute(
    'src',
    /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}\?/,
  );
  await expect(player).toBeFocused();
  await expect.poll(() => youtube.length).toBeGreaterThan(0);
});
