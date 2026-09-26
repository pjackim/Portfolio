/**
 * Smooth scrolling for in-page anchor clicks only (Ruling G9). A global `scroll-behavior: smooth`
 * also turned the fragment jump when a page loads at `#about` into a ~0.7 s glide; now a page
 * always lands on its fragment instantly, and only a click on a same-page `#hash` link glides —
 * while motion is allowed.
 *
 * The click's default fragment navigation still runs untouched (history entry, `:target`,
 * `hashchange`, the focus navigation starting point): this only switches smooth scrolling on
 * for it, with `smooth-scroll` on <html> (global.css, behind the motion gate), and off again once
 * the scroll ends. Part of the motion-layer entry.
 */
import { motionAllowed } from './motion';

const root = document.documentElement;
const CLASS = 'smooth-scroll';
/** Browsers without `scrollend` (and a click on the fragment already in view) end it here. */
const FALLBACK_MS = 2000;
let timer = 0;

/** The element a `#fragment` names — read as written when it isn't valid percent-encoding. */
function fragmentTarget(hash: string): HTMLElement | null {
  let id = hash.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    // A malformed escape (`#%zz`): the browser looks it up as written, and so do we.
  }
  return document.getElementById(id);
}

function end(): void {
  root.classList.remove(CLASS);
  clearTimeout(timer);
  removeEventListener('scrollend', end);
}

document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = (event.target as Element | null)?.closest?.('a[href]');
  if (!(link instanceof HTMLAnchorElement) || (link.target && link.target !== '_self')) return;
  if (!motionAllowed() || !link.hash) return;
  // Same document only: same path and query, a fragment that names an element here.
  if (
    link.origin !== location.origin ||
    link.pathname !== location.pathname ||
    link.search !== location.search
  ) {
    return;
  }
  if (!fragmentTarget(link.hash)) return;
  end();
  root.classList.add(CLASS);
  addEventListener('scrollend', end, { once: true });
  timer = window.setTimeout(end, FALLBACK_MS);
});
