/**
 * Capabilities panel behaviour (CapabilityGroups.astro). Picking a group needs no script (it is
 * a radio group, and CSS shows the chosen panel); this adds the design's extras:
 *
 * - Lock-on: sets `data-lock` on the block, which arms the CSS lock-on (corners, sweep, rows,
 *   chips) for every panel that appears from then on. It's armed once the panel's entrance
 *   (the reveal engine) lands, so the first group locks on as it opens, or at the first pick if
 *   the panel was already on screen. The group label flickers each time.
 * - Hover intent: resting a mouse on a group for a moment picks it, as in the design.
 * - Height morph: the panel grows or shrinks to the new group's height instead of jumping
 *   (Portfolio.dc.html `switchCap`: 420ms, ease-in-out), so what's below it glides too. A pick
 *   mid-morph starts from wherever the panel is, so a quick run across the groups (hover intent
 *   included) reads as one motion. Only while motion is allowed; otherwise it snaps, as before.
 */
import { motionAllowed } from './motion';
import { flicker } from './scramble';

/** How long a mouse rests on a group before it's picked. */
const INTENT_MS = 120;
/** From the panel's entrance starting to its lock-on (the wipe is most of the way open). */
const LOCK_AFTER_ENTRANCE_MS = 620;
/** The panel's height morph between groups. */
const MORPH = { id: 'caps-morph', duration: 420, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' };

export function wireCapabilities(root: HTMLElement): void {
  const panel = root.querySelector<HTMLElement>('.caps__panel');
  const radios = [...root.querySelectorAll<HTMLInputElement>('.caps__radio')];
  const labels = [...root.querySelectorAll<HTMLElement>('.caps__label')];
  if (!panel || radios.length === 0 || radios.length !== labels.length) return;

  const flickerOpen = () => {
    const label = labels[radios.findIndex((radio) => radio.checked)];
    if (label) flicker(label, 'caps__decrypt');
  };

  const lockOn = () => {
    root.dataset.lock = '';
    flickerOpen();
  };

  // The entrance: lock on once it's well under way. A panel that never waits (on screen at
  // load, or motion off) isn't armed until the first pick.
  const entrance = () => {
    const state = panel.dataset.revealState;
    if (state === 'pending') return false;
    if (state === 'in') setTimeout(lockOn, LOCK_AFTER_ENTRANCE_MS);
    return true;
  };
  if (panel.dataset.revealState !== undefined && !entrance()) {
    const watch = new MutationObserver(() => {
      if (entrance()) watch.disconnect();
    });
    watch.observe(panel, { attributes: true, attributeFilter: ['data-reveal-state'] });
  }

  // The panel's settled height, kept current (a resize, a font swap) while no morph runs; it is
  // where the next morph starts from.
  let settled = panel.offsetHeight;
  new ResizeObserver(() => {
    if (panel.dataset.morph === undefined) settled = panel.offsetHeight;
  }).observe(panel);

  const morph = () => {
    const running = panel.getAnimations().filter((a) => a.id === MORPH.id);
    // Mid-morph, the panel's current (animated) height; otherwise the last settled one.
    const from = running.length > 0 ? panel.offsetHeight : settled;
    for (const a of running) a.cancel();
    const to = panel.offsetHeight;
    settled = to;
    if (!motionAllowed() || Math.abs(to - from) < 1) {
      delete panel.dataset.morph;
      return;
    }
    panel.dataset.morph = '';
    const animation = panel.animate(
      { blockSize: [`${from}px`, `${to}px`] },
      { id: MORPH.id, duration: MORPH.duration, easing: MORPH.easing },
    );
    animation.addEventListener('finish', () => {
      delete panel.dataset.morph;
      settled = panel.offsetHeight;
    });
  };

  root.addEventListener('change', (event) => {
    if (!(event.target as Element).matches('.caps__radio')) return;
    morph();
    if (root.dataset.lock === undefined) root.dataset.lock = '';
    flickerOpen();
  });

  for (const radio of radios) {
    const tab = radio.closest<HTMLElement>('.caps__tab');
    if (!tab) continue;
    let timer = 0;
    tab.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'mouse') return;
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (radio.checked) return;
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }, INTENT_MS);
    });
    tab.addEventListener('pointerleave', () => clearTimeout(timer));
  }
}
