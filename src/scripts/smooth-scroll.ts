/**
 * Smooth scrolling with Lenis, for mouse-and-wheel desktops only: it eases wheel scrolling and
 * glides same-page `#hash` link clicks (Ruling G9). Touch devices and phones (their home page
 * uses native scroll-snap panels) keep native scrolling, and so does anyone with reduced motion
 * or the Motion toggle off; Lenis is created and destroyed live as that answer changes.
 *
 * Lenis is fetched after load + idle (it's never needed for first paint), and a page still
 * always lands on its fragment instantly. The click's default fragment navigation runs
 * untouched (history entry, `:target`, focus starting point): on `hashchange` this rewinds to
 * where the click happened and lets Lenis glide to where the browser jumped. Styles for it
 * (`html.lenis`) are in global.css.
 */
import { afterLoadIdle, motionAllowed, onMotionChange } from './motion';
import type Lenis from 'lenis';

const wheelDesktop = matchMedia('(min-width: 40rem) and (hover: hover) and (pointer: fine)');
let lenis: Lenis | undefined;
let loading = false;
let clickedFrom = -1;

const wanted = (): boolean => motionAllowed() && wheelDesktop.matches;

function stop(): void {
  lenis?.destroy();
  lenis = undefined;
}

async function sync(): Promise<void> {
  if (!wanted()) return stop();
  if (lenis || loading) return;
  loading = true;
  const { default: Lenis } = await import('lenis');
  loading = false;
  if (!wanted() || lenis) return;
  lenis = new Lenis({
    autoRaf: true,
    // A modal dialog (lightbox, contact sheet) scrolls on its own, never the page behind it.
    prevent: (node) => node.localName === 'dialog',
  });
}

// Remember where a same-page link click started, so its instant jump can become a glide.
document.addEventListener(
  'click',
  (event) => {
    clickedFrom = -1;
    if (!lenis || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element | null)?.closest?.('a[href]');
    if (!(link instanceof HTMLAnchorElement) || (link.target && link.target !== '_self')) return;
    if (link.origin === location.origin && link.pathname === location.pathname && link.hash) {
      clickedFrom = scrollY;
    }
  },
  true,
);

addEventListener('hashchange', () => {
  const from = clickedFrom;
  clickedFrom = -1;
  if (!lenis || from < 0 || from === scrollY) return;
  const to = scrollY;
  lenis.scrollTo(from, { immediate: true, force: true });
  lenis.scrollTo(to, { force: true });
});

afterLoadIdle(() => {
  void sync();
  onMotionChange(() => void sync());
  wheelDesktop.addEventListener('change', () => void sync());
}, 300);
