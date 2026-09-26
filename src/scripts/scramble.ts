/**
 * "Decrypt" text effect (interactions spec §1): the text resolves left to right out of random
 * glyphs, then lands on exactly `finalText` — or, with a `density` below 1, a sparse signal
 * flicker: only that share of the glyphs, picked at random, glitches for a moment somewhere in
 * the run and settles, while the rest never change (the section headings' arrival, so a label
 * seen again and again doesn't replay a full decrypt each time).
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
  /**
   * Share of the letters and digits that scramble, 0–1. 1 (the default) is the full decrypt:
   * every glyph rolls, then they lock left to right. Below 1, a sparse flicker: that share of
   * glyphs (at least one), each scrambled for its own short window within the run.
   */
  density?: number;
}

/** How often unresolved glyphs re-roll: ~25 Hz reads as decoding, 60 Hz as noise. */
const ROLL_MS = 40;
/** Full decrypt: share of the run spent fully scrambled before the left-to-right lock starts. */
const LEAD = 0.2;
/** Sparse flicker: a glyph's window opens in the first FLICKER_START of the run and lasts
    FLICKER_MIN–FLICKER_MAX of it. */
const FLICKER_START = 0.55;
const FLICKER_MIN = 0.25;
const FLICKER_MAX = 0.45;
const SCRAMBLED = /[A-Za-z0-9]/;

/**
 * When each character is scrambled, as fractions of the run: [on, off). Characters that never
 * scramble get an empty window.
 */
function windows(chars: string[], density: number): { on: Float32Array; off: Float32Array } {
  const n = chars.length;
  const on = new Float32Array(n);
  const off = new Float32Array(n);
  if (density >= 1) {
    // Everything rolls from the start; character i locks once the sweep has passed it.
    for (let i = 0; i < n; i++) off[i] = LEAD + ((1 - LEAD) * (i + 1)) / n;
    return { on, off };
  }
  const candidates: number[] = [];
  chars.forEach((ch, i) => {
    if (SCRAMBLED.test(ch)) candidates.push(i);
  });
  const picks = Math.min(candidates.length, Math.max(1, Math.round(density * candidates.length)));
  for (let k = 0; k < picks; k++) {
    // Partial Fisher–Yates: a random candidate not picked yet.
    const j = k + Math.floor(Math.random() * (candidates.length - k));
    [candidates[k], candidates[j]] = [candidates[j]!, candidates[k]!];
    const i = candidates[k]!;
    on[i] = Math.random() * FLICKER_START;
    off[i] = Math.min(1, on[i]! + FLICKER_MIN + Math.random() * (FLICKER_MAX - FLICKER_MIN));
  }
  return { on, off };
}

export function scramble(
  el: HTMLElement,
  finalText: string,
  { duration = 600, charset = SCRAMBLE_CHARSET, density = 1 }: ScrambleOptions = {},
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
  const { on, off } = windows(chars, density);
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
      // Characters inside their window show a random glyph, re-rolled every ROLL_MS (and at once
      // as the window opens); the rest show their own.
      const roll = now - lastRoll >= ROLL_MS;
      if (roll) lastRoll = now;
      for (let i = 0; i < n; i++) {
        const ch = chars[i]!;
        if (t < on[i]! || t >= off[i]! || !SCRAMBLED.test(ch)) out[i] = ch;
        else if (roll || out[i] === ch) out[i] = pick();
      }
      el.textContent = out.join('');
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  });
}
