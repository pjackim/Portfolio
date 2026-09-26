/**
 * Motion gate (interactions spec §0.2, §1): the single answer to "may this animate?".
 *
 * Motion is allowed while the OS doesn't ask for reduced motion AND the site's Motion toggle
 * hasn't switched it off. The toggle's choice lives on `<html data-motion="off">` (applied
 * before first paint by BaseLayout's inline bootstrap from localStorage `motion`) — the same
 * attribute the CSS gate in global.css keys on, so scripts and styles always agree.
 *
 * Change notifications go through a DOM event on `document` rather than module state, so every
 * bundle that imports this file hears every toggle, even if the bundler duplicates the module.
 */
export type MotionSetting = 'on' | 'off';

const KEY = 'motion';
const EVENT = 'motion:change';
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

/** The OS asks for reduced motion; this always wins over the toggle. */
export const systemReducesMotion = (): boolean => reduce.matches;

/** True when animations may run: no OS reduced-motion request and the toggle isn't off. */
export const motionAllowed = (): boolean => !reduce.matches && root.dataset.motion !== 'off';

/**
 * Calls `callback(motionAllowed())` whenever the answer may have changed: the OS preference
 * flips or the toggle is used (on this page, another tab, or a back/forward-cache restore).
 * Returns an unsubscribe function.
 */
export function onMotionChange(callback: (allowed: boolean) => void): () => void {
  const handler = () => callback(motionAllowed());
  reduce.addEventListener('change', handler);
  document.addEventListener(EVENT, handler);
  return () => {
    reduce.removeEventListener('change', handler);
    document.removeEventListener(EVENT, handler);
  };
}

function apply(setting: MotionSetting): void {
  const current: MotionSetting = root.dataset.motion === 'off' ? 'off' : 'on';
  if (setting === current) return;
  if (setting === 'off') root.dataset.motion = 'off';
  else delete root.dataset.motion;
  document.dispatchEvent(new Event(EVENT));
}

/** Switches site motion on or off, live, and remembers the choice (localStorage `motion`). */
export function setMotion(setting: MotionSetting): void {
  apply(setting);
  try {
    if (setting === 'off') localStorage.setItem(KEY, 'off');
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the choice still holds for this page.
  }
}

/**
 * Keeps this page in step with choices made elsewhere: another tab (`storage`) or while this
 * page sat in the back/forward cache (`pageshow`). Call once per page.
 */
export function syncStoredMotion(): void {
  const read = () => {
    try {
      apply(localStorage.getItem(KEY) === 'off' ? 'off' : 'on');
    } catch {
      // Storage blocked: nothing to sync from.
    }
  };
  addEventListener('storage', (event) => {
    if (event.key === KEY || event.key === null) read();
  });
  addEventListener('pageshow', (event) => {
    if (event.persisted) read();
  });
}

/**
 * Runs `task` once the page has finished loading and the main thread is idle, so ambient work
 * never competes with first paint or LCP (spec §0.1). Falls back to a macrotask where
 * `requestIdleCallback` is missing (Safari).
 */
export function afterLoadIdle(task: () => void, timeout = 800): void {
  const idle = () => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(() => task(), { timeout });
    else setTimeout(task, 1);
  };
  if (document.readyState === 'complete') idle();
  else addEventListener('load', idle, { once: true });
}
