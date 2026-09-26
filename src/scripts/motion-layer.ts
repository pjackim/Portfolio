/**
 * The motion layer's one entry per page (interactions spec §1–§2), loaded by MotionToggle.astro
 * (Astro emits it once per page however many chips render; the hero always renders one). It
 * wires every Motion toggle chip straight away and, on a page with the hero, fetches the hero
 * instrument's code only once the page has loaded and painted — everything in it starts after
 * load + idle anyway (spec §0.1), so it never competes with first paint or LCP.
 */
import { afterLoadIdle } from './motion';
import './motion-toggle';

// After load, after the next paint, when idle — only then fetch the hero instrument, so its
// request never joins the first paint's (on a fast connection `load` can precede it).
if (document.querySelector('[data-hero]')) {
  const fetchHero = () => afterLoadIdle(() => void import('./hero'), 300);
  afterLoadIdle(() => requestAnimationFrame(fetchHero), 300);
}
