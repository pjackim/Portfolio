/**
 * Home hero instrument (interactions spec §2), loaded by Hero.astro once the page has loaded.
 * The intro (≤ 5 s) goes first, with a short idle deadline so a busy main thread can't push it
 * back; then the ambient graph and the readout reels, each in its own idle slot.
 */
import { createHeroGraph } from './hero-graph';
import { typeFocusLine } from './focus-line';
import { afterLoadIdle } from './motion';
import { rollReadouts } from './readouts';
import { scramble } from './scramble';

const hero = document.querySelector<HTMLElement>('[data-hero]');
if (hero) {
  afterLoadIdle(() => {
    const line = hero.querySelector<HTMLElement>('[data-focus-line]');
    if (line) typeFocusLine(line);
    for (const part of hero.querySelectorAll<HTMLElement>('[data-scramble]')) {
      void scramble(part, part.textContent?.trim() ?? '', { duration: 650 });
    }
  }, 200);
  afterLoadIdle(() => {
    const canvas = hero.querySelector<HTMLCanvasElement>('[data-hero-graph]');
    if (canvas) createHeroGraph(canvas, hero);
  });
  afterLoadIdle(() => {
    const readouts = hero.querySelector<HTMLElement>('[data-readouts]');
    if (readouts) rollReadouts(readouts);
  });
}
