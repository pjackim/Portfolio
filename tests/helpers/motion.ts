/**
 * Shared waits for the motion layer's deferred code (interactions spec §1–§3). The motion layer
 * fetches `interactions` (card spotlight, section-heading draw + decrypt) only after load, the
 * next paint and idle, so a test that needs it must wait for it rather than sleep.
 */
import type { Page } from '@playwright/test';

/** The card/heading module has arrived (its request has completed). */
export const interactionsLoaded = (page: Page): Promise<boolean> =>
  page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .some((r) => /\/interactions\.[\w-]+\.js$/.test(r.name)),
  );

/** Two animation frames: long enough for IntersectionObserver callbacks queued now to run. */
export const twoFrames = (page: Page): Promise<void> =>
  page.evaluate(
    () =>
      new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))),
  );

/**
 * Resolves once three frames in a row come in under 34 ms (or after 3 s regardless): the page
 * has finished painting what just scrolled into view. A software-rastered browser (CI's WebKit)
 * can spend 100–200 ms a frame on a freshly exposed section, longer than a short effect lasts.
 */
export const framesSettled = (page: Page): Promise<void> =>
  page.evaluate(
    () =>
      new Promise<void>((done) => {
        const start = performance.now();
        let last = start;
        let fast = 0;
        const tick = (now: number) => {
          fast = now - last < 34 ? fast + 1 : 0;
          last = now;
          if (fast >= 3 || now - start > 3000) done();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );

/** Reveal items on screen that still carry a reveal state (waiting, or mid-entrance). */
export const revealsInFlightOnScreen = (page: Page): Promise<number> =>
  page.evaluate(
    () =>
      [...document.querySelectorAll('[data-reveal-state]')].filter((el) => {
        const box = el.getBoundingClientRect();
        return box.bottom > 0 && box.top < innerHeight;
      }).length,
  );
