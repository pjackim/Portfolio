/**
 * Readout reels (interactions spec §2) — successor to the 2021 site's counter-up. Each digit is
 * a clipped column of 0–9 twice over, parked by CSS on its final value (so the SSR, no-JS and
 * motion-off states all read correctly). Here, once the row is on screen, every reel spins up
 * from 0 through a full turn and eases onto its value, staggered left to right (~900 ms in
 * all). The spin itself is a CSS animation on `translate`; this only arms and triggers it.
 */
import { motionAllowed, onMotionChange } from './motion';

export function rollReadouts(list: HTMLElement): void {
  if (!motionAllowed()) return;
  const reels = list.querySelectorAll<HTMLElement>('[data-reel]');
  if (reels.length === 0) return;
  reels.forEach((reel, i) => reel.style.setProperty('--i', String(i)));

  const settle = () => {
    list.dataset.roll = 'done';
    observer.disconnect();
    unsubscribe();
  };
  const unsubscribe = onMotionChange((allowed) => {
    if (!allowed) settle();
  });
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      list.dataset.roll = 'rolling';
      reels[reels.length - 1]!.addEventListener('animationend', settle, { once: true });
    },
    { threshold: 0.75 },
  );

  // Armed: reels wait at 0 until the row is seen (CSS), so the spin is what the reader sees.
  list.dataset.roll = 'armed';
  observer.observe(list);
}
