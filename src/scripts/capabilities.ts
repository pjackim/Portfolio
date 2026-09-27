/**
 * Capabilities panel behaviour (CapabilityGroups.astro). Picking a group needs no script (it is
 * a radio group, and CSS shows the chosen panel); this adds the design's extras:
 *
 * - Lock-on: sets `data-lock` on the block, which arms the CSS lock-on (corners, sweep, rows,
 *   chips) for every panel that appears from then on. It's armed once the panel's entrance
 *   (the reveal engine) lands, so the first group locks on as it opens, or at the first pick if
 *   the panel was already on screen. The group label flickers each time.
 * - Hover intent: resting a mouse on a group for a moment picks it, as in the design.
 */
import { flicker } from './scramble';

/** How long a mouse rests on a group before it's picked. */
const INTENT_MS = 120;
/** From the panel's entrance starting to its lock-on (the wipe is most of the way open). */
const LOCK_AFTER_ENTRANCE_MS = 620;

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

  root.addEventListener('change', (event) => {
    if (!(event.target as Element).matches('.caps__radio')) return;
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
