/**
 * Shared pieces for the adaptive image loader's specs (src/lib/net-bootstrap.ts,
 * src/scripts/net.ts). playwright.config.ts starts every context with `localStorage.net =
 * 'fast'`, so a spec that wants the slow or Save-Data path pins its own mode here, and one that
 * tests detection clears the pin and fakes the connection instead.
 */
import type { Locator, Page, Route } from '@playwright/test';
import sharp from 'sharp';
import { builtHtml } from './routes.ts';

export type NetMode = 'fast' | 'slow' | 'save';

/** Pins the loader's mode (`localStorage.net`) for every document the page loads. */
export async function forceNet(page: Page, mode: NetMode): Promise<void> {
  await page.addInitScript((m) => localStorage.setItem('net', m), mode);
}

/**
 * Clears the pinned mode and replaces `navigator.connection` (Chromium's NetInfo; WebKit has
 * none) with `connection`, or removes it with `undefined`, in every document the page loads.
 */
export async function fakeConnection(
  page: Page,
  connection: Record<string, unknown> | undefined,
): Promise<void> {
  await page.addInitScript((value) => {
    localStorage.removeItem('net');
    const fake = value && { ...value, addEventListener() {} };
    Object.defineProperty(Navigator.prototype, 'connection', {
      get: () => fake,
      configurable: true,
    });
  }, connection);
}

/** The widest candidate a light image may be at 1280px and 1× in these specs: the hero's light
    pick there is its 800w file, and its full-quality one is wider. */
export const LITE_MAX = 800;

/** Image requests (what `page.route` and the request log care about). */
export const IMAGE_URL = /\.(?:avif|webp)(?:\?|$)/;

/** URL path → `w` descriptor of every srcset candidate in a page's HTML. */
export function srcsetWidths(html: string): Map<string, number> {
  const widths = new Map<string, number>();
  for (const [, srcset] of html.matchAll(/\ssrcset="([^"]*)"/g)) {
    for (const candidate of (srcset ?? '').split(',')) {
      const [url, descriptor] = candidate.trim().split(/\s+/);
      if (url && descriptor?.endsWith('w')) widths.set(url, Number.parseInt(descriptor, 10));
    }
  }
  return widths;
}

/** `srcsetWidths` of the page at base-relative `path`, as the server sends it (read from `dist/`). */
export function serverWidths(path: string): Map<string, number> {
  return srcsetWidths(builtHtml(path));
}

/** URL paths of every srcset candidate of an image (its own `<picture>`'s sources, or itself). */
export async function candidatePaths(img: Locator): Promise<Set<string>> {
  const paths = await img.evaluate((el) => {
    const scope = el.parentElement?.nodeName === 'PICTURE' ? [...el.parentElement.children] : [el];
    return scope.flatMap((node) =>
      (node.getAttribute('srcset') ?? '')
        .split(',')
        .map((candidate) => candidate.trim().split(/\s+/)[0] ?? '')
        .filter(Boolean)
        .map((url) => new URL(url, document.baseURI).pathname),
    );
  });
  return new Set(paths);
}

/** The `sizes` of every adaptive image and its `<source>`s under `within`, in document order, as
    parsed from `html` (the server's) or from the live DOM when `html` is omitted. */
export function sizesOf(page: Page, html?: string, within = 'body'): Promise<(string | null)[]> {
  return page.evaluate(
    ([source, scope]) => {
      const doc =
        source === undefined ? document : new DOMParser().parseFromString(source, 'text/html');
      const elements = doc.querySelectorAll(
        `${scope} img[data-net-img], ${scope} picture:has(> img[data-net-img]) > source`,
      );
      return [...elements].map((el) => el.getAttribute('sizes'));
    },
    [html, within] as const,
  );
}

/**
 * Holds every image request wider than `LITE_MAX` (by the widths in `widths`) until `release()`
 * is called; everything else goes straight through. Returns the release function and the
 * request log: path, width and when it was seen, in order.
 */
export async function holdFullImages(
  page: Page,
  widths: Map<string, number>,
): Promise<{
  release: () => void;
  log: { path: string; width: number | undefined; held: boolean }[];
}> {
  let release!: () => void;
  const released = new Promise<void>((resolve) => (release = resolve));
  const log: { path: string; width: number | undefined; held: boolean }[] = [];
  await page.route(IMAGE_URL, async (route: Route) => {
    const path = new URL(route.request().url()).pathname;
    const width = widths.get(path);
    const held = width !== undefined && width > LITE_MAX;
    log.push({ path, width, held });
    if (held) await released;
    await route.continue();
  });
  return { release, log };
}

/** Frames of `target` seen from now until `stop()`: how many, and how many show the bare plate. */
export interface PaintWatch {
  stop: () => Promise<{ frames: number; blank: number }>;
}

/**
 * Watches what is actually painted over `target` (which must be on screen): every compositor
 * frame through a CDP screencast in Chromium, a loop of screenshots elsewhere (fewer frames, the
 * same check). A frame is blank when its region is one flat colour: the plate behind an image
 * that is momentarily not painted. Images here are screenshots and covers, never flat.
 */
export async function watchPaint(page: Page, target: Locator): Promise<PaintWatch> {
  const box = await target.boundingBox();
  if (!box) throw new Error('watchPaint: the target is not on screen');
  const viewportWidth = await page.evaluate(() => innerWidth);
  const shots: Buffer[] = [];
  let finish: () => Promise<void>;
  if (page.context().browser()?.browserType().name() === 'chromium') {
    const cdp = await page.context().newCDPSession(page);
    cdp.on('Page.screencastFrame', ({ data, sessionId }) => {
      shots.push(Buffer.from(data, 'base64'));
      void cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
    finish = async () => {
      await cdp.send('Page.stopScreencast');
    };
  } else {
    let running = true;
    const loop = (async () => {
      while (running) shots.push(await page.screenshot({ animations: 'allow' }));
    })();
    finish = async () => {
      running = false;
      await loop;
    };
  }
  return {
    async stop() {
      await finish();
      let blank = 0;
      for (const shot of shots) {
        const { width = viewportWidth, height = 0 } = await sharp(shot).metadata();
        const scale = width / viewportWidth;
        // The middle 80% of the target, as much of it as is on screen.
        const left = Math.max(0, Math.round((box.x + box.width * 0.1) * scale));
        const top = Math.max(0, Math.round((box.y + box.height * 0.1) * scale));
        const { channels } = await sharp(shot)
          .extract({
            left,
            top,
            width: Math.min(width - left, Math.round(box.width * 0.8 * scale)),
            height: Math.min(height - top, Math.round(box.height * 0.8 * scale)),
          })
          .stats();
        if (channels.every((channel) => channel.stdev < 1)) blank++;
      }
      return { frames: shots.length, blank };
    },
  };
}
