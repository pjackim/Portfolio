/**
 * The motion layer's one entry per page (interactions spec §1–§3), loaded by MotionLayer.astro
 * (Astro emits it once per page however many components render that; MotionToggle, ProjectGrid
 * and SectionHeading do). Straight away it wires every Motion toggle chip and smooth in-page
 * anchor scrolling; then — once the page has loaded and painted, when idle — it fetches the code
 * for whatever the page has: the hero instrument, and the card spotlight / section-heading
 * decrypt. Everything in those starts after load + idle anyway (spec §0.1), so the requests never
 * compete with first paint or LCP.
 */
import { afterLoadIdle } from './motion';
import './motion-toggle';
import './smooth-scroll';

const hasHero = document.querySelector('[data-hero]') !== null;
const hasInteractions = document.querySelector('[data-section-heading], [data-spotlight]') !== null;

// After load, after the next paint, when idle — only then fetch, so these requests never join
// the first paint's (on a fast connection `load` can precede it).
if (hasHero || hasInteractions) {
  const fetchLayer = () =>
    afterLoadIdle(() => {
      if (hasHero) void import('./hero');
      if (hasInteractions) void import('./interactions');
    }, 300);
  afterLoadIdle(() => requestAnimationFrame(fetchLayer), 300);
}
