/**
 * Motion toggle chips (interactions spec §1). Every `[data-motion-toggle]` on the page shows
 * and switches the same site-wide setting: `MOTION ● ON` / `MOTION ○ OFF`. When the OS asks for
 * reduced motion that wins: the chip reads `MOTION ○ OFF (SYSTEM)`, is `aria-disabled`, and its
 * description says why.
 *
 * Semantics: a toggle button with a constant name, "Reduce motion", pressed while motion is
 * off (ARIA APG: a toggle's label must not change with its state). The chip is rendered
 * `hidden` and only revealed here, so without JS there is no control that can't work.
 */
import {
  motionAllowed,
  onMotionChange,
  setMotion,
  syncStoredMotion,
  systemReducesMotion,
} from './motion';

const buttons = document.querySelectorAll<HTMLButtonElement>('[data-motion-toggle]');

function render(): void {
  const system = systemReducesMotion();
  const on = motionAllowed();
  const state = system ? 'system' : on ? 'on' : 'off';
  for (const button of buttons) {
    button.dataset.state = state;
    button.setAttribute('aria-pressed', String(!on));
    if (system) button.setAttribute('aria-disabled', 'true');
    else button.removeAttribute('aria-disabled');
    const label = button.querySelector('[data-motion-state]');
    if (label) label.textContent = system ? 'Off (system)' : on ? 'On' : 'Off';
    const note = button.querySelector('[data-motion-note]');
    if (system && note?.id) button.setAttribute('aria-describedby', note.id);
    else button.removeAttribute('aria-describedby');
    button.hidden = false;
  }
}

buttons.forEach((button, i) => {
  const note = button.querySelector<HTMLElement>('[data-motion-note]');
  if (note) note.id = `motion-note-${i}`;
  button.addEventListener('click', () => {
    if (systemReducesMotion()) return;
    setMotion(motionAllowed() ? 'off' : 'on');
  });
});

onMotionChange(render);
syncStoredMotion();
render();
