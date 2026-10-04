/**
 * Media behaviour: the trip-planner loops (muted, inline, postered, with a visible Pause
 * toggle; play only while on screen; a pause sticks; never play under reduced motion or with the
 * site's Motion toggle off, which pauses a playing loop live and, back on, resumes only a loop
 * the reader hadn't paused), and
 * the YouTube facade on the-forest (nothing requested from YouTube or ytimg until the click,
 * then a titled, focused player). Click-to-play videos get the same Play / Pause chip (and no
 * loop); a click on any video but a YouTube player opens it large in the lightbox, the chip
 * being its own button. Keyboard focus shows on footage: the chip fills with the accent, and
 * with no script a click-to-play video (native controls then) draws its ring inside the frame.
 * The poster is a picture under the video, whose own `poster` is a transparent pixel; it shows
 * with or without JS. On a slow connection a loop waits until the page's images are upgraded
 * before it starts.
 * Runs on desktop Chromium and mobile WebKit.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import sharp from 'sharp';
import { forceNet, holdFullImages, serverWidths } from './helpers/net.ts';
import { isWindowsWebKit, WINDOWS_WEBKIT } from './helpers/platform.ts';
import { gotoRel } from './helpers/routes.ts';

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chrome', 'media runs on chromium + webkit');
});

const LOOPS = '[data-video][data-autoplay]';
const CLICK_TO_PLAY = '[data-video]:not([data-autoplay])';
/** Long enough for the IntersectionObserver and a play() to have happened, if they would. */
const SETTLE_MS = 750;

const isPaused = (video: Locator) => video.evaluate((v: HTMLVideoElement) => v.paused);
const center = (element: Locator) =>
  element.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
const toTop = (page: Page) => page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
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
      }));
      expect(state).toMatchObject({
        muted: true,
        mutedAttribute: true,
        playsInline: true,
        loop: true,
        controls: false,
      });
      // The poster is the picture under the video; it loads as the loop nears the screen. The
      // video's own `poster` is a transparent pixel, so the picture shows through.
      await center(video);
      const still = loop.locator('img.loop-video__poster');
      await expect
        .poll(() => still.evaluate((img: HTMLImageElement) => img.currentSrc))
        .toMatch(/\/Portfolio\/_astro\/.+\.(avif|webp)$/);
      await expect(video).toHaveAttribute('poster', /^data:image\/gif;base64,/);
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

test.describe('trip-planner poster, under the video', () => {
  test.use({ javaScriptEnabled: false });
  test.skip(({ browserName }) => isWindowsWebKit(browserName), WINDOWS_WEBKIT.media);

  // The `<video>` has no background and a transparent pixel for a poster: until it has a frame
  // the picture beneath is what shows (with no poster at all, Chromium and WebKit paint it as an
  // opaque box). Checked as pixels, with no script: the loop's top part (the native controls
  // draw over its bottom) looks the same with the video hidden as with it showing.
  test('shows the picture under a video with no frame yet', async ({ page }) => {
    await page.goto('work/trip-planner/');
    const loop = page.locator('[data-video]').first();
    const video = loop.locator('video');
    await expect(video).toHaveAttribute('poster', /^data:image\/gif;base64,/);
    const still = loop.locator('img.loop-video__poster');
    await video.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect
      .poll(() => still.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true);
    const shoot = async () => {
      const png = await loop.screenshot();
      const { width = 0, height = 0 } = await sharp(png).metadata();
      return sharp(png)
        .extract({ left: 0, top: 0, width, height: Math.round(height * 0.6) })
        .removeAlpha()
        .raw()
        .toBuffer();
    };
    // Painted: a picture still decoding (it is `decoding="async"`) shows the plate, so look at
    // the picture alone until two looks in a row agree (timers and rAF don't run without JS).
    await video.evaluate((el) => (el.style.visibility = 'hidden'));
    let pictureOnly = await shoot();
    for (let tries = 0; tries < 20; tries++) {
      await page.waitForTimeout(100);
      const next = await shoot();
      const settled = next.equals(pictureOnly);
      pictureOnly = next;
      if (settled) break;
    }
    await video.evaluate((el) => (el.style.visibility = ''));
    const withVideo = await shoot();

    // The picture is on screen (not a flat plate) ...
    const mean = pictureOnly.reduce((sum, v) => sum + v, 0) / pictureOnly.length;
    const spread = Math.sqrt(
      pictureOnly.reduce((sum, v) => sum + (v - mean) ** 2, 0) / pictureOnly.length,
    );
    expect(spread).toBeGreaterThan(10);
    // ... and the video adds nothing over it.
    let difference = 0;
    for (let i = 0; i < withVideo.length; i++) {
      difference += Math.abs(withVideo[i]! - pictureOnly[i]!);
    }
    expect(difference / withVideo.length).toBeLessThan(1);
  });
});

test.describe('trip-planner loops on a slow connection', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'canplaythrough without a play: Chromium');
  });

  // The loop waits for the page's images to be upgraded to full quality (the hero's full file is
  // held here), then loads its one file, and plays once it can play through.
  test('wait for the images to be upgraded, then play', async ({ page }) => {
    test.setTimeout(60_000);
    const path = 'work/trip-planner/';
    await forceNet(page, 'slow');
    const { release } = await holdFullImages(page, serverWidths(path));
    await gotoRel(page, path);
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-net', 'slow');
    const video = page.locator(`${LOOPS} video`).first();
    await center(video);

    await expect(html).toHaveAttribute('data-net-busy', '');
    await page.waitForTimeout(SETTLE_MS);
    expect(await isPaused(video)).toBe(true);
    expect(await video.evaluate((v: HTMLVideoElement) => v.preload)).toBe('none');
    await expect(page.locator(LOOPS).first().getByRole('button')).toHaveAccessibleName(
      'Play video',
    );

    release();
    await expect(html).not.toHaveAttribute('data-net-busy', { timeout: 20_000 });
    await expect.poll(() => isPaused(video), { timeout: 20_000 }).toBe(false);
    expect(await video.evaluate((v: HTMLVideoElement) => v.preload)).toBe('auto');
    await expect(page.locator(LOOPS).first().getByRole('button')).toHaveAccessibleName(
      'Pause video',
    );
  });

  test('Play starts one at once', async ({ page }) => {
    const path = 'work/trip-planner/';
    await forceNet(page, 'slow');
    const { release } = await holdFullImages(page, serverWidths(path));
    await gotoRel(page, path);
    const loop = page.locator(LOOPS).first();
    const video = loop.locator('video');
    await center(video);
    await expect(page.locator('html')).toHaveAttribute('data-net-busy', '');
    expect(await isPaused(video)).toBe(true);
    await loop.getByRole('button').click();
    await expect.poll(() => isPaused(video), { timeout: 20_000 }).toBe(false);
    release();
  });

  // A Play already pressed (its file still arriving) is not undone when the images finish: the
  // loop must not be armed with a load(), which aborts that request and starts the download over.
  test('a loop already playing is not reloaded when the images finish', async ({ page }) => {
    test.setTimeout(60_000);
    const path = 'work/trip-planner/';
    await forceNet(page, 'slow');
    const { release } = await holdFullImages(page, serverWidths(path));
    // Hold the video file too, so play() stays pending while the images are released.
    const videoRequests: string[] = [];
    let releaseVideo!: () => void;
    const videoHeld = new Promise<void>((resolve) => (releaseVideo = resolve));
    await page.route(/\.(?:mp4|webm)(?:\?|$)/, async (route) => {
      videoRequests.push(route.request().url());
      await videoHeld;
      await route.continue();
    });
    await gotoRel(page, path);
    const loop = page.locator(LOOPS).first();
    const video = loop.locator('video');
    await center(video);
    await expect(page.locator('html')).toHaveAttribute('data-net-busy', '');
    await video.evaluate((v: HTMLVideoElement) => {
      v.dataset.emptied = '0';
      v.addEventListener('emptied', () => (v.dataset.emptied = String(+v.dataset.emptied! + 1)));
    });

    await loop.getByRole('button').click();
    await expect.poll(() => videoRequests.length).toBe(1);
    expect(await isPaused(video)).toBe(false);

    release();
    await expect(page.locator('html')).not.toHaveAttribute('data-net-busy', { timeout: 20_000 });
    await page.waitForTimeout(SETTLE_MS);
    expect(await video.evaluate((v: HTMLVideoElement) => v.dataset.emptied)).toBe('0');
    expect(videoRequests).toHaveLength(1);
    expect(await isPaused(video)).toBe(false);

    releaseVideo();
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused && v.readyState >= 3), {
        timeout: 20_000,
      })
      .toBe(true);
  });
});

test.describe('trip-planner video focus, from the keyboard', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'keyboard focus: desktop Chromium');
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
});

test.describe('trip-planner click-to-play video focus, with no script', () => {
  test.use({ javaScriptEnabled: false });
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'keyboard focus: desktop Chromium');
  });

  // The native controls stay with no script. The figure frame's overflow clips the video's own
  // ring, so one is drawn inside it.
  test('a click-to-play video shows a ring inside its frame', async ({ page }) => {
    await gotoRel(page, 'work/trip-planner/');
    const wrapper = page.locator(CLICK_TO_PLAY).first();
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

test.describe('trip-planner click-to-play videos', () => {
  test.skip(({ browserName }) => isWindowsWebKit(browserName), WINDOWS_WEBKIT.media);

  test('have the Play / Pause chip, no native controls and no loop', async ({ page }) => {
    await gotoRel(page, 'work/trip-planner/');
    const wrapper = page.locator(CLICK_TO_PLAY).first();
    const video = wrapper.locator('video');
    const toggle = wrapper.getByRole('button');
    await center(video);
    await expect(video).toHaveJSProperty('controls', false);
    await expect(video).toHaveJSProperty('loop', false);
    await expect(toggle).toHaveAccessibleName('Play video');
    // Nothing plays until it is asked to, on screen or not.
    await page.waitForTimeout(SETTLE_MS);
    expect(await isPaused(video)).toBe(true);

    await toggle.click();
    await expect.poll(() => isPaused(video), { timeout: 10_000 }).toBe(false);
    await expect(toggle).toHaveAccessibleName('Pause video');
    await toggle.click();
    await expect.poll(() => isPaused(video)).toBe(true);
    await expect(toggle).toHaveAccessibleName('Play video');
  });
});

test.describe('trip-planner video lightbox', () => {
  test.skip(({ browserName }) => isWindowsWebKit(browserName), WINDOWS_WEBKIT.media);

  const KINDS = [
    { name: 'a loop', selector: LOOPS, loops: true },
    { name: 'a click-to-play video', selector: CLICK_TO_PLAY, loops: false },
  ];

  /** The first video of a kind, on screen, once the lightbox has wired it (it waits for its styles). */
  async function ready(page: Page, selector: string) {
    await gotoRel(page, 'work/trip-planner/');
    const wrapper = page.locator(selector).first();
    const video = wrapper.locator('video');
    await center(video);
    await expect(video).toHaveAttribute('data-zoomable', '');
    return {
      video,
      toggle: wrapper.getByRole('button'),
      dialog: page.locator('dialog[data-lightbox]'),
    };
  }

  /** A point on the picture, well clear of the chip in its bottom-right corner. */
  const PICTURE = { position: { x: 24, y: 24 } };

  for (const { name, selector, loops } of KINDS) {
    test(`a click on ${name} opens it large and playing; Esc closes it, focus back on the chip`, async ({
      page,
    }) => {
      const { video, toggle, dialog } = await ready(page, selector);
      if (loops) await expect.poll(() => isPaused(video), { timeout: 10_000 }).toBe(false);

      await video.click(PICTURE);
      await expect(dialog).toBeVisible();
      const clip = dialog.locator('video');
      await expect(clip).toBeVisible();
      await expect(clip).toHaveAttribute('aria-label', /\S/);
      await expect(clip.locator('source')).not.toHaveCount(0);
      await expect(clip).toHaveJSProperty('controls', true);
      await expect(clip).toHaveJSProperty('loop', loops);
      await expect.poll(() => isPaused(clip), { timeout: 10_000 }).toBe(false);
      // The page's own copy yields to it, and the page behind can't scroll.
      expect(await isPaused(video)).toBe(true);
      await expect(page.locator('html')).toHaveClass(/\blightbox-open\b/);
      await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
      // There is no larger file to link to.
      await expect(dialog.locator('.lightbox__full')).toBeHidden();

      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(toggle).toBeFocused();
      await expect(page.locator('html')).not.toHaveClass(/lightbox-open|vt-lightbox/);
      expect(await isPaused(clip)).toBe(true);
      // A loop that was playing picks up again in the page; one nobody started stays put.
      if (loops) await expect.poll(() => isPaused(video)).toBe(false);
      else expect(await isPaused(video)).toBe(true);
    });

    test(`the chip of ${name} plays or pauses it in the page and opens nothing`, async ({
      page,
    }) => {
      const { video, toggle, dialog } = await ready(page, selector);
      if (loops) await expect.poll(() => isPaused(video), { timeout: 10_000 }).toBe(false);
      const wasPaused = await isPaused(video);

      await toggle.click();
      await expect.poll(() => isPaused(video), { timeout: 10_000 }).toBe(!wasPaused);
      await expect(dialog).not.toHaveAttribute('open', '');
      await expect(page.locator('html')).not.toHaveClass(/lightbox-open/);
    });
  }

  test('a click on a YouTube player starts it and opens no lightbox', async ({ page }) => {
    // Hermetic: the player document is stubbed, never fetched from YouTube.
    await page.route(/^https:\/\/www\.youtube-nocookie\.com\//, (route) =>
      route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>player</title>' }),
    );
    await gotoRel(page, 'work/the-forest/');
    const frame = page.locator('.yt-frame');
    const facade = frame.locator('button.yt');
    await center(facade);
    await page.waitForLoadState('load');
    await expect(page.locator('.figure[data-kind="youtube"][data-zoomable]')).toHaveCount(0);
    await facade.click();
    await expect(frame.locator('iframe.yt-player')).toBeVisible();
    await expect(page.locator('dialog[data-lightbox][open]')).toHaveCount(0);
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
