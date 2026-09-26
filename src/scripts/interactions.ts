/**
 * Card spotlight and section-heading decrypt (interactions spec §3), fetched by the motion layer
 * after load + idle on pages that have either. Both only ever re-render decorative pixels or
 * glyphs: the accessible text is never touched.
 */
import { pad2 } from '../lib/format';
import { motionAllowed, onMotionChange } from './motion';
import { scramble } from './scramble';

/**
 * Spotlight: one delegated, passive `pointermove` listener on the grid writes the pointer's
 * position inside the card under it to that card's `--mx` / `--my` (CSSOM custom properties
 * only), at most once per frame. CSS draws the light, behind the motion gate and for fine
 * pointers only; touch never lights it.
 */
function trackSpotlight(grid: HTMLElement): void {
  let card: HTMLElement | null = null;
  let x = 0;
  let y = 0;
  let frame = 0;

  const flush = () => {
    frame = 0;
    if (!card) return;
    const box = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${Math.round(x - box.left)}px`);
    card.style.setProperty('--my', `${Math.round(y - box.top)}px`);
  };

  grid.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'touch' || !motionAllowed()) return;
      card = (event.target as Element).closest<HTMLElement>('.card');
      x = event.clientX;
      y = event.clientY;
      if (card && !frame) frame = requestAnimationFrame(flush);
    },
    { passive: true },
  );
}

/** `00` → the heading's own index, eased, on tabular digits (so the width never moves). */
function countUp(el: HTMLElement, duration = 420): void {
  const target = Number.parseInt(el.textContent ?? '', 10);
  if (!Number.isFinite(target) || target <= 0) return;
  const final = pad2(target);
  let start = -1;
  let raf = 0;
  const finish = () => {
    cancelAnimationFrame(raf);
    unsubscribe();
    el.textContent = final;
  };
  const unsubscribe = onMotionChange((allowed) => {
    if (!allowed) finish();
  });
  const frame = (now: number) => {
    if (start < 0) start = now;
    const t = Math.min(1, (now - start) / duration);
    if (t >= 1) return finish();
    el.textContent = pad2(Math.round((1 - (1 - t) ** 3) * target));
    raf = requestAnimationFrame(frame);
  };
  el.textContent = pad2(0);
  raf = requestAnimationFrame(frame);
}

/**
 * The label flickers as it arrives — a sparse signal flicker, not a full decrypt: about a third
 * of its glyphs glitch for a moment and settle, within 400 ms (the hero eyebrow alone keeps the
 * full left-to-right decrypt, so the headings further down don't repeat it). It plays on an
 * `aria-hidden` layer with the same text, laid exactly on the h2 (same box, font and wrapping),
 * while the h2's own glyphs are transparent. The h2 — and so the section's accessible name —
 * keeps its text throughout, and the layer is removed when it lands.
 */
const FLICKER_MS = 400;
const FLICKER_DENSITY = 0.35;

function decrypt(title: HTMLElement): void {
  const text = title.textContent?.trim() ?? '';
  if (!text) return;
  const layer = document.createElement('span');
  layer.className = 'section-heading__decrypt';
  layer.setAttribute('aria-hidden', 'true');
  layer.textContent = text;
  title.append(layer);
  title.dataset.decrypt = '';
  void scramble(layer, text, { duration: FLICKER_MS, density: FLICKER_DENSITY }).then(() => {
    layer.remove();
    delete title.dataset.decrypt;
  });
}

/**
 * The rule draws out from the label (a timed CSS animation, SectionHeading.astro). Only a heading
 * that was below the fold when this arrived was armed — its rule hidden, unseen — so a rule the
 * reader has already seen never blinks out to redraw.
 */
function drawRule(heading: HTMLElement): void {
  const rule = heading.querySelector<HTMLElement>('.section-heading__rule');
  if (!rule) return;
  const done = () => {
    rule.removeEventListener('animationend', done);
    rule.removeEventListener('animationcancel', done);
    delete heading.dataset.rule;
  };
  rule.addEventListener('animationend', done);
  rule.addEventListener('animationcancel', done);
  heading.dataset.rule = 'draw';
}

/**
 * Each heading plays once, the first time it comes into view with motion allowed: the rule
 * draws (if armed), the index counts up, the label flickers. One observer drives all three. A
 * heading a /work/ filter change brings into view arrives settled: the reflow is its entrance.
 */
function watchHeadings(headings: NodeListOf<HTMLElement>): void {
  const seen = new WeakSet<Element>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const heading = entry.target as HTMLElement;
        const first = !seen.has(heading);
        seen.add(heading);
        if (!entry.isIntersecting) {
          // Entirely below the viewport: arm the rule, out of sight, to draw on arrival.
          if (first && motionAllowed() && entry.boundingClientRect.top >= innerHeight) {
            heading.dataset.rule = 'armed';
          }
          continue;
        }
        observer.unobserve(heading);
        // Motion off, or arriving in a /work/ filter's reflow (a view transition, `vt-filter`
        // on <html>, WorkFilter.astro): shown settled — the rule drawn, no count-up, no decrypt.
        if (!motionAllowed() || document.documentElement.classList.contains('vt-filter')) {
          delete heading.dataset.rule;
          continue;
        }
        const title = heading.querySelector<HTMLElement>('.section-heading__title');
        const index = heading.querySelector<HTMLElement>('[data-count]');
        if (heading.dataset.rule === 'armed') drawRule(heading);
        if (title) decrypt(title);
        if (index) countUp(index);
      }
    },
    // In view by a margin, so the effect plays where it will be seen, not at the very edge.
    { rootMargin: '0px 0px -12% 0px' },
  );
  for (const heading of headings) observer.observe(heading);
  // Motion switched off: every armed rule is simply drawn.
  onMotionChange((allowed) => {
    if (allowed) return;
    for (const heading of headings) delete heading.dataset.rule;
  });
}

/**
 * The cover is a cross-document morph subject (`cover-<slug>`), and the HUD sits inside it: on
 * the way out, the readout chip and scanline are dropped from the outgoing snapshot (pageswap
 * runs before it is taken), so only the brackets ride the zoom into the case study.
 */
function dropHudOnLeave(grid: HTMLElement): void {
  addEventListener('pageswap', (event) => {
    if (event.viewTransition) grid.dataset.leaving = '';
  });
  addEventListener('pageshow', (event) => {
    if (event.persisted) delete grid.dataset.leaving;
  });
}

const grid = document.querySelector<HTMLElement>('[data-spotlight]');
if (grid) {
  trackSpotlight(grid);
  dropHudOnLeave(grid);
}

const headings = document.querySelectorAll<HTMLElement>('[data-section-heading]');
if (headings.length > 0) watchHeadings(headings);
