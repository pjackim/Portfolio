/**
 * One-shot entrance reveals (interactions spec §3; Ruling G6), in the spirit of the 2021 site's
 * WOW.js: an item below the fold waits hidden and, once ~15% of it is on screen, plays its
 * entrance once (a timed CSS animation, global.css) and is left alone for good.
 *
 * Visible by default. Nothing is ever hidden before this runs, and it only ever hides items
 * that are entirely below the viewport at that moment — so no-JS, motion-off and reduced-motion
 * visitors never see hidden content, and nothing already on screen can blink out and pop back.
 * It starts once the page has loaded (and landed on its fragment, if any). Coming back to a
 * page — the back/forward buttons or a reload, where the browser restores the scroll position
 * well after load — there are no entrances at all: the page is shown as it was left. And on a
 * back/forward-cache restore anything still waiting on screen is shown at once, unanimated —
 * so a cross-document cover morph never lands on a transparent card. Something else may show a
 * waiting item first by dropping its state — the /work/ filter does, for the rows it brings on
 * screen (its reflow is their entrance) — and then it never plays.
 *
 * Import-free on purpose, so Astro inlines it (no request on any page). The motion check
 * mirrors motionAllowed() in src/scripts/motion.ts, and `motion:change` is that module's event.
 */
export {}; // a module (its own scope), though it imports nothing

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const allowed = () => !reduce.matches && root.dataset.motion !== 'off';
const items = document.querySelectorAll<HTMLElement>('[data-reveal]');
/** Share of an item that must be on screen before it plays. */
const TRIGGER = 0.15;

const show = (el: HTMLElement) => {
  delete el.dataset.revealState;
};

/** Plays the entrance; the state goes once every animation in it (children too) is over. */
function play(el: HTMLElement): void {
  const done = () => {
    const running = el
      .getAnimations({ subtree: true })
      .some((a) => (a as CSSAnimation).animationName === 'reveal' && a.playState !== 'finished');
    if (running) return;
    el.removeEventListener('animationend', done);
    el.removeEventListener('animationcancel', done);
    show(el);
  };
  el.addEventListener('animationend', done);
  el.addEventListener('animationcancel', done);
  el.dataset.revealState = 'in';
}

/** A return visit: back/forward (not from the bfcache) or a reload. */
const returning = (): boolean => {
  const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  return navigation?.type === 'back_forward' || navigation?.type === 'reload';
};

function start(): void {
  if (items.length === 0 || !allowed() || returning()) return;
  const classified = new WeakSet<Element>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (!classified.has(el)) {
          classified.add(el);
          // On screen or above it as the page settles: it stays exactly as it is.
          if (entry.boundingClientRect.top < innerHeight) {
            observer.unobserve(el);
            continue;
          }
          el.dataset.revealState = 'pending';
          continue;
        }
        // Shown meanwhile by something else (the /work/ filter releases the rows it shows):
        // it no longer waits, so it never plays.
        if (el.dataset.revealState !== 'pending') {
          observer.unobserve(el);
          continue;
        }
        if (!entry.isIntersecting) continue;
        // Coming in from above (the reader scrolled back up past it) plays at once, so no
        // hidden slice ever sits at the top edge; from below, once enough of it is in view.
        const fromAbove = entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0);
        if (entry.intersectionRatio < TRIGGER && !fromAbove) continue;
        observer.unobserve(el);
        if (allowed()) play(el);
        else show(el);
      }
    },
    { threshold: [0, TRIGGER] },
  );
  for (const el of items) observer.observe(el);

  // Motion switched off (toggle or OS): everything waiting is shown, and nothing else plays.
  const release = () => {
    if (allowed()) return;
    observer.disconnect();
    for (const el of items) show(el);
  };
  reduce.addEventListener('change', release);
  document.addEventListener('motion:change', release);

  // Back/forward cache: whatever is on screen now is shown at once, unanimated.
  addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    for (const el of items) {
      if (el.dataset.revealState !== 'pending') continue;
      const box = el.getBoundingClientRect();
      if (box.top < innerHeight && box.bottom > 0) {
        observer.unobserve(el);
        show(el);
      }
    }
  });
}

/** The element the URL's fragment names, if any (a malformed escape is read as written). */
const fragmentTarget = (): HTMLElement | null => {
  let id = location.hash.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    // As the browser does.
  }
  return id ? document.getElementById(id) : null;
};

/** The page is where a fragment jump puts it: the target at the scroll padding, or as close as
    the page can scroll (a target near the top or the foot can't get there). */
const landedOn = (el: HTMLElement): boolean => {
  const padding = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
  const off = el.getBoundingClientRect().top - padding;
  const max = root.scrollHeight - innerHeight;
  return Math.abs(off) <= 2 || (off > 0 && scrollY >= max - 2) || (off < 0 && scrollY <= 2);
};

// After load and a frame. A page loaded at a fragment lands on it at once — smooth scrolling is
// only ever for in-page clicks (Ruling G9) — normally before `load`, so there is nothing to wait
// for. Only if the jump is still to come (the target isn't where it lands) wait for it to end,
// or 1.5 s, so what the reader lands on is never held back.
const begin = () => {
  const target = fragmentTarget();
  if (!target || landedOn(target)) {
    requestAnimationFrame(start);
    return;
  }
  let started = false;
  const go = () => {
    if (started) return;
    started = true;
    requestAnimationFrame(start);
  };
  addEventListener('scrollend', go, { once: true });
  setTimeout(go, 1500);
};
if (document.readyState === 'complete') begin();
else addEventListener('load', begin, { once: true });
