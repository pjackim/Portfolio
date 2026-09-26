/**
 * "Decrypt" text effect (interactions spec §1): the text resolves left to right out of random
 * glyphs, then lands on exactly `finalText`.
 *
 * - Only letters and digits are scrambled; spaces and punctuation hold their place, so word
 *   breaks never move. Every substitute comes from a monospace charset and replaces exactly one
 *   character, so in Geist Mono the line keeps its width (n ch plus tracking) — nothing reflows.
 * - Accessibility: the element must be hidden from assistive tech (`aria-hidden` on it or an
 *   ancestor) with the real text available elsewhere (a visually hidden twin or an `aria-label`).
 *   Anything else is left untouched.
 * - A no-op when motion isn't allowed, and it snaps to the final text if motion is switched
 *   off mid-run.
 */
import { motionAllowed, onMotionChange } from './motion';

export const SCRAMBLE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/_<>#%';

export interface ScrambleOptions {
  /** Total run time in ms, capped at 700. */
  duration?: number;
  charset?: string;
}

/** How often unresolved glyphs re-roll: ~25 Hz reads as decoding, 60 Hz as noise. */
const ROLL_MS = 40;
/** Share of the run spent fully scrambled before the left-to-right lock starts. */
const LEAD = 0.2;
const SCRAMBLED = /[A-Za-z0-9]/;

export function scramble(
  el: HTMLElement,
  finalText: string,
  { duration = 600, charset = SCRAMBLE_CHARSET }: ScrambleOptions = {},
): Promise<void> {
  const total = Math.min(duration, 700);
  if (!el.closest('[aria-hidden="true"]')) {
    if (import.meta.env.DEV) console.warn('scramble: element is not aria-hidden; skipped', el);
    return Promise.resolve();
  }
  if (!motionAllowed() || finalText.length === 0 || total <= 0) {
    el.textContent = finalText;
    return Promise.resolve();
  }

  const chars = [...finalText];
  const n = chars.length;
  const out = chars.slice();
  const pick = () => charset[Math.floor(Math.random() * charset.length)] ?? '#';

  return new Promise((resolve) => {
    let start = -1;
    let lastRoll = -Infinity;
    let raf = 0;

    const finish = () => {
      cancelAnimationFrame(raf);
      unsubscribe();
      el.textContent = finalText;
      resolve();
    };
    const unsubscribe = onMotionChange((allowed) => {
      if (!allowed) finish();
    });

    const frame = (now: number) => {
      if (start < 0) start = now;
      const t = (now - start) / total;
      if (t >= 1) return finish();
      // Characters [0, locked) have resolved; the rest re-roll every ROLL_MS.
      const locked = t <= LEAD ? 0 : Math.floor(((t - LEAD) / (1 - LEAD)) * n);
      const roll = now - lastRoll >= ROLL_MS;
      if (roll) lastRoll = now;
      for (let i = 0; i < n; i++) {
        const ch = chars[i]!;
        if (i < locked || !SCRAMBLED.test(ch)) out[i] = ch;
        else if (roll) out[i] = pick();
      }
      el.textContent = out.join('');
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  });
}
