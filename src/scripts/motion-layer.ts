/**
 * The motion layer's one entry per page (interactions spec §1–§4), loaded by MotionLayer.astro
 * (Astro emits it once per page however many components render that; MotionToggle — so every
 * page, through the footer — ProjectGrid and SectionHeading do). Straight away it wires every
 * Motion toggle chip, smooth in-page anchor scrolling and, on /work/, the capability filter (its
 * chips should answer as soon as they show). One request for all of it: split into chunks, the
 * extra early requests cost more than the bytes. Once the page has loaded and painted, when
 * idle, it fetches the code for whatever else the page has: the hero instrument, the card
 * spotlight / section-heading decrypt, the home page's About timeline and capabilities panel, and a
 * project's section index and figure lightbox.
 * Everything in those starts after load + idle anyway (spec §0.1), so those requests never
 * compete with first paint or LCP.
 */
import { afterLoadIdle } from './motion';
import './motion-toggle';
import './smooth-scroll';
import './work-filter';

// Controls that should answer as soon as they show, in their own chunks so only the pages that
// have them pay: the Experience git log's toggles and chips, and /work/'s rotating leads.
if (document.querySelector('[data-git-log]')) void import('./git-log');
if (document.querySelector('[data-showcase]')) void import('./work-showcase');

const hasHero = document.querySelector('[data-hero]') !== null;
const hasInteractions = document.querySelector('[data-section-heading], [data-spotlight]') !== null;
const hasCase = document.querySelector('[data-case-index], [data-lightbox]') !== null;
const hasAbout = document.querySelector('[data-timeline], [data-caps]') !== null;

// After load, after the next paint, when idle — only then fetch, so these requests never join
// the first paint's (on a fast connection `load` can precede it).
if (hasHero || hasInteractions || hasCase || hasAbout) {
  const fetchLayer = () =>
    afterLoadIdle(() => {
      if (hasHero) void import('./hero');
      if (hasInteractions) void import('./interactions');
      if (hasCase) void import('./case');
      if (hasAbout) void import('./about');
    }, 300);
  afterLoadIdle(() => requestAnimationFrame(fetchLayer), 300);
}
