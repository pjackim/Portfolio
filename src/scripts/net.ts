/**
 * Adaptive image upgrade queue (the second half of src/lib/net-bootstrap.ts). On a connection
 * detected as slow, the head script makes every adaptive image (`img[data-net-img]`) pick a light
 * candidate from its own srcset by scaling `sizes`, keeping the authored list in `data-sizes`.
 * This script then brings them to full quality in the background, one at a time:
 * - starts once the window has loaded; each step goes to the image on screen (the priority one
 *   first), else the nearest one whose light candidate has finished loading;
 * - loads and decodes the full candidate off-DOM (`new Image()`, as lightbox.ts does), then puts
 *   `sizes` back: the element swaps to a cached, decoded file while the light one stays painted,
 *   so there is no blank frame and no shift (every box is sized by CSS, never by the file);
 * - an upgrade that takes more than PATIENCE_MS lets the next start beside it, and one that fails
 *   is queued again after 3, 10 and 30 s (or at once on `online` / a bfcache restore);
 * - `html[data-net-busy]` is set while images are being upgraded, and `net:idle` fires on the
 *   document when the queue drains (src/scripts/video.ts waits for it before starting a loop).
 * Save-Data mode (`data-net="save"`) is never upgraded. When the connection turns out fast (the
 * verdict flips to full quality), every light image gets its `sizes` back at once.
 *
 * A fast-mode page also times its images: an adaptive fetch slower than STALL_MS (or a priority
 * image still arriving after it) marks the connection slow for this tab (`sessionStorage`), and
 * a later full-size fetch that is both big and fast clears the mark. An explicit `net` override
 * in localStorage always wins and disables all of that.
 *
 * Import-free on purpose, so Astro inlines it (no request).
 */
export {}; // a module (its own scope), though it imports nothing

const root = document.documentElement;
/** An adaptive image fetch slower than this marks the connection slow for this tab. */
const STALL_MS = 3000;
/** An upgrade gets this long before the next one starts beside it. */
const PATIENCE_MS = 15_000;
/** A full-size fetch at least this fast (kbit/s) and this big clears a stored verdict. */
const RECOVER_KBPS = 4000;
const RECOVER_MIN_BYTES = 50_000;
/** A failed upgrade is tried again after each of these pauses, then left at its light file (or
    brought back sooner by `online` or a bfcache restore): a dropped or reset connection on a bad
    link rarely fires `online`. */
const RETRY_MS = [3000, 10_000, 30_000];

type Sized = HTMLImageElement | HTMLSourceElement;
const images = [...document.querySelectorAll<HTMLImageElement>('img[data-net-img]')];
const failures = new WeakMap<HTMLImageElement, number>();
let pageLoaded = document.readyState === 'complete';
let upgrading = 0;

/** The `img` and the `<source>`s of its `<picture>`: all of them carry the scaled `sizes`. */
const parts = (img: HTMLImageElement): Sized[] =>
  img.parentElement?.nodeName === 'PICTURE' ? ([...img.parentElement.children] as Sized[]) : [img];

/** Puts the authored `sizes` back: the browser selects the full-quality candidate again. */
function restore(img: HTMLImageElement): void {
  for (const el of parts(img)) {
    const sizes = el.dataset.sizes;
    if (sizes === undefined) continue;
    el.sizes = sizes;
    delete el.dataset.sizes;
  }
  img.dataset.netState = 'full';
}

/** An upgrade that failed: the light file stays, and the image is queued again after a pause. */
function failed(img: HTMLImageElement): void {
  img.dataset.netState = 'failed';
  const tries = failures.get(img) ?? 0;
  if (tries >= RETRY_MS.length) return;
  failures.set(img, tries + 1);
  setTimeout(() => {
    if (img.dataset.netState !== 'failed') return; // already retried, or the connection got fast
    img.dataset.netState = 'lite';
    pump();
  }, RETRY_MS[tries]);
}

const timing = (url: string) =>
  performance.getEntriesByName(url).at(-1) as PerformanceResourceTiming | undefined;

/** `net` pinned in localStorage (`fast`, `slow` or `save`): detection and timing are off. */
function pinned(): boolean {
  try {
    return ['fast', 'slow', 'save'].includes(localStorage.getItem('net') ?? '');
  } catch {
    return false;
  }
}

function stalled(): void {
  if (root.dataset.net || pinned()) return;
  try {
    sessionStorage.setItem('net', 'slow');
  } catch {
    // Storage blocked: the verdict still holds for this page.
  }
  document.dispatchEvent(new CustomEvent('net:check', { detail: 'slow' }));
}

function recovered(url: string): void {
  const t = timing(url);
  if (!t || t.transferSize < RECOVER_MIN_BYTES) return;
  if ((t.transferSize * 8) / (t.responseEnd - t.requestStart) < RECOVER_KBPS) return;
  try {
    sessionStorage.removeItem('net');
  } catch {
    return;
  }
  document.dispatchEvent(new Event('net:check'));
}

/** The image to upgrade next (on screen first, then nearest), and whether a light candidate on
    screen is still arriving (the page isn't idle yet). */
function pick(): [HTMLImageElement | undefined, boolean] {
  let best: HTMLImageElement | undefined;
  let bestRank = Infinity;
  let waiting = false;
  for (const img of images) {
    if (img.dataset.netState !== 'lite' || img.dataset.netImg === 'lite') continue;
    const box = img.getBoundingClientRect();
    if (box.width === 0) continue; // not rendered: a hidden lead, the other layout's cards
    const onScreen = box.bottom > 0 && box.top < innerHeight;
    const rank = onScreen
      ? img.dataset.netImg === 'priority'
        ? -1
        : 0
      : Math.min(Math.abs(box.top), Math.abs(box.bottom - innerHeight));
    if (!img.complete) {
      waiting ||= onScreen;
      continue;
    }
    if (img.naturalWidth > 0 && rank < bestRank) {
      best = img;
      bestRank = rank;
    }
  }
  return [best, waiting];
}

/** Loads and decodes the full candidate off-DOM, then restores `sizes`: the element swaps to it
    from the memory cache, the light image painted until then. */
async function upgrade(img: HTMLImageElement): Promise<void> {
  const path = new URL(img.currentSrc).pathname;
  const chosen = parts(img).find((el) => el.srcset.includes(path)) ?? img;
  img.dataset.netState = 'loading';
  const probe = new Image();
  probe.fetchPriority = 'low';
  probe.sizes = chosen.dataset.sizes ?? '';
  probe.srcset = chosen.srcset;
  try {
    await probe.decode();
  } catch {
    if (!probe.complete || probe.naturalWidth === 0) {
      if (img.dataset.netState === 'loading') failed(img);
      return;
    }
  }
  if (img.dataset.netState !== 'loading') return; // the connection got fast: already restored
  img.decoding = 'sync'; // the swap paints decoded pixels, never an empty frame
  const settle = () => {
    img.decoding = 'async';
    void probe; // held until the element shows it
  };
  img.addEventListener('load', settle, { once: true });
  setTimeout(settle, 1000); // no `load` when the light candidate was already the full one
  restore(img);
  recovered(probe.currentSrc);
}

function pump(): void {
  const mode = root.dataset.net;
  if (mode !== 'slow') {
    // Fast: anything light goes straight back to its authored sizes; the swap is native.
    if (!mode) for (const img of images) if (img.dataset.sizes !== undefined) restore(img);
    return;
  }
  if (!pageLoaded || upgrading > 0) return;
  const [img, waiting] = pick();
  if (!img) {
    if (!waiting && root.dataset.netBusy !== undefined) {
      delete root.dataset.netBusy;
      document.dispatchEvent(new Event('net:idle'));
    }
    return;
  }
  root.dataset.netBusy = '';
  upgrading++;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    upgrading--;
    pump();
  };
  setTimeout(release, PATIENCE_MS);
  void upgrade(img).then(release, release);
}

// A candidate arrived: time it (fast mode), then move the queue on.
document.addEventListener(
  'load',
  (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || img.dataset.netImg === undefined) return;
    const t = timing(img.currentSrc);
    if (t && t.transferSize > 0 && t.responseEnd - t.requestStart > STALL_MS) stalled();
    pump();
  },
  true,
);
document.addEventListener(
  'error',
  (event) => {
    if (event.target instanceof HTMLImageElement) pump();
  },
  true,
);
document.addEventListener('net:change', pump);
addEventListener(
  'load',
  () => {
    pageLoaded = true;
    pump();
  },
  { once: true },
);
const retry = () => {
  for (const img of images) if (img.dataset.netState === 'failed') img.dataset.netState = 'lite';
  pump();
};
addEventListener('online', retry);
addEventListener('pageshow', (event) => {
  if (event.persisted) retry();
});

// A priority image still on its way after STALL_MS: the connection is slow.
if (!root.dataset.net) {
  for (const img of images) {
    if (img.dataset.netImg !== 'priority' || img.complete) continue;
    setTimeout(() => {
      if (!img.complete) stalled();
    }, STALL_MS);
  }
}
pump();
