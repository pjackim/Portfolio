/**
 * Card spotlight and section-heading decrypt (interactions spec §3), fetched by the motion layer
 * after load + idle on pages that have either. Both only ever re-render decorative pixels or
 * glyphs: the accessible text is never touched.
 */
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

const pad2 = (n: number) => String(n).padStart(2, '0');

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
 * The label decrypts over itself: an `aria-hidden` layer with the same text is laid exactly on
 * the h2 (same box, font and wrapping) and scrambled, while the h2's own glyphs are transparent.
 * The h2 — and so the section's accessible name — keeps its text throughout, and the layer is
 * removed when it lands.
 */
function decrypt(title: HTMLElement): void {
  const text = title.textContent?.trim() ?? '';
  if (!text) return;
  const layer = document.createElement('span');
  layer.className = 'section-heading__decrypt';
  layer.setAttribute('aria-hidden', 'true');
  layer.textContent = text;
  title.append(layer);
  title.dataset.decrypt = '';
  void scramble(layer, text, { duration: 600 }).then(() => {
    layer.remove();
    delete title.dataset.decrypt;
  });
}

/** Each heading plays once, the first time it comes into view with motion allowed. */
function watchHeadings(headings: NodeListOf<HTMLElement>): void {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        if (!motionAllowed()) continue;
        const title = entry.target.querySelector<HTMLElement>('.section-heading__title');
        const index = entry.target.querySelector<HTMLElement>('[data-count]');
        if (title) decrypt(title);
        if (index) countUp(index);
      }
    },
    // In view by a margin, so the effect plays where it will be seen, not at the very edge.
    { rootMargin: '0px 0px -12% 0px' },
  );
  for (const heading of headings) observer.observe(heading);
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
