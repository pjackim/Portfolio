/**
 * Typed focus line (interactions spec §2): `FOCUS › reverse engineering▍` types each focus area
 * in turn, holding on each, and settles on the full line; then the caret stops.
 *
 * Timing: 40 ms a character with a 1.1 s hold between areas. The areas are appended (" · …")
 * rather than typed, deleted and retyped: with deletes the sequence runs ~6.2 s, and WCAG 2.2.2
 * (spec §0.2) caps unpausable movement at 5 s. Appending lands on the exact final line in
 * ~4.5 s, plus a short caret tail — under 5 s in total.
 *
 * Markup contract (Hero.astro): the line holds a visually hidden twin with the real text, and
 * an `aria-hidden` stack of two layers in one grid cell: the static line (the final text; it
 * also reserves the settled height, so typing never shifts anything) and the live layer, whose
 * `[data-focus-typed]` span (final text in `data-text`) this script fills. `data-state` on the
 * line: absent → CSS shows a waiting prompt (when motion is allowed); `typing` → live layer;
 * `done` → back to the static line.
 */
import { motionAllowed, onMotionChange } from './motion';

const TYPE_MS = 40;
const HOLD_MS = 1100;
const CARET_TAIL_MS = 300;
const SEPARATOR = ' · ';

export function typeFocusLine(line: HTMLElement): void {
  const typed = line.querySelector<HTMLElement>('[data-focus-typed]');
  const finalText = typed?.dataset.text ?? '';
  if (!typed || !finalText) return;
  if (!motionAllowed()) {
    line.dataset.state = 'done';
    return;
  }

  // When each character appears, and the hold windows between areas.
  const areas = finalText.split(SEPARATOR);
  const appearAt: number[] = [];
  const holds: [number, number][] = [];
  let t = 0;
  areas.forEach((area, i) => {
    const piece = i === 0 ? area : SEPARATOR + area;
    for (let k = 0; k < piece.length; k++) appearAt.push((t += TYPE_MS));
    if (i < areas.length - 1) {
      holds.push([t, t + HOLD_MS]);
      t += HOLD_MS;
    }
  });
  const end = t + CARET_TAIL_MS;

  let raf = 0;
  let start = -1;
  let shown = -1;
  const finish = () => {
    cancelAnimationFrame(raf);
    unsubscribe();
    typed.textContent = finalText;
    line.classList.remove('is-holding');
    line.dataset.state = 'done';
  };
  const unsubscribe = onMotionChange((allowed) => {
    if (!allowed) finish();
  });

  const frame = (now: number) => {
    if (start < 0) start = now;
    const elapsed = now - start;
    if (elapsed >= end) return finish();
    let n = 0;
    while (n < appearAt.length && appearAt[n]! <= elapsed) n++;
    if (n !== shown) {
      typed.textContent = finalText.slice(0, n);
      shown = n;
    }
    // The caret blinks while holding and after the last character; it is solid while typing.
    const holding = n === appearAt.length || holds.some(([a, b]) => elapsed >= a && elapsed < b);
    line.classList.toggle('is-holding', holding);
    raf = requestAnimationFrame(frame);
  };

  typed.textContent = '';
  line.dataset.state = 'typing';
  raf = requestAnimationFrame(frame);
}
