/**
 * Card spotlight (interactions spec §3), fetched by the motion layer after load + idle on pages
 * that have a card grid. It only ever re-renders decorative pixels: the accessible text is never
 * touched.
 */
import { motionAllowed } from './motion';

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
