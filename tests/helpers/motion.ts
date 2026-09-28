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

/** Reveal items on screen that still carry a reveal state (waiting, or mid-entrance). */
export const revealsInFlightOnScreen = (page: Page): Promise<number> =>
  page.evaluate(
    () =>
      [...document.querySelectorAll('[data-reveal-state]')].filter((el) => {
        const box = el.getBoundingClientRect();
        return box.bottom > 0 && box.top < innerHeight;
      }).length,
  );

/** CSS transitions still running (a fade caught mid-way would skew axe's contrast checks). */
export const runningTransitions = (page: Page): Promise<number> =>
  page.evaluate(
    () =>
      document
        .getAnimations()
        .filter((a) => a instanceof CSSTransition && a.playState === 'running').length,
  );
