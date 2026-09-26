/**
 * /work/ capability filter (interactions spec §4; markup and CSS in WorkFilter.astro). The filter
 * is `<html data-capability="<id>">` — set before first paint from `?capability=` by the
 * BaseLayout bootstrap — and CSS hides the rows (and emptied groups) it rules out. This wires
 * the chips: single-select `aria-pressed` buttons that set that attribute, keep `?capability=`
 * in the URL (`history.replaceState`; "All" removes it) and announce "Showing N of 15 projects"
 * in the bar's polite live region (and show the count in its readout).
 *
 * While motion is allowed the change runs inside a same-document view transition, with
 * `vt-filter` on <html> for its duration (the class that switches the rows' and headings'
 * transition names on), so the list reflows instead of jumping. Otherwise it applies at once.
 *
 * Entrances (src/scripts/reveal.ts): a row the filter shows is shown there and then — any row
 * still waiting below the fold for its entrance is released, so the reflow is its entrance and
 * nothing can be left transparent.
 *
 * Part of the motion-layer entry, so the chips work as soon as they show.
 */
import { motionAllowed } from './motion';

const PARAM = 'capability';
const VT_CLASS = 'vt-filter';
const root = document.documentElement;

function wire(bar: HTMLElement, list: HTMLElement): void {
  const rail = bar.querySelector<HTMLElement>('[role="group"]');
  const chips = [...bar.querySelectorAll<HTMLButtonElement>('button[data-capability]')];
  const ids = new Set(chips.map((chip) => chip.dataset.capability ?? '').filter(Boolean));
  const rows = [...list.querySelectorAll<HTMLElement>('[data-capabilities]')];
  const status = bar.querySelector<HTMLElement>('[data-filter-status]');
  const readout = bar.querySelector<HTMLElement>('[data-filter-shown]');

  const matches = (row: HTMLElement, id: string) =>
    id === '' || (row.dataset.capabilities ?? '').split(' ').includes(id);
  const count = (id: string) => rows.filter((row) => matches(row, id)).length;
  /** The active filter; an unknown `?capability=` value counts as none. */
  const current = () => {
    const id = root.dataset.capability ?? '';
    return ids.has(id) ? id : '';
  };

  const apply = (id: string) => {
    if (id) root.dataset.capability = id;
    else delete root.dataset.capability;
    for (const chip of chips) {
      chip.setAttribute('aria-pressed', String((chip.dataset.capability ?? '') === id));
    }
    for (const row of rows) {
      if (row.dataset.revealState === 'pending' && matches(row, id)) delete row.dataset.revealState;
    }
    if (readout) readout.textContent = String(count(id)).padStart(2, '0');
  };

  let running: ViewTransition | null = null;

  /** The change itself: a reflow while motion is allowed, else at once. */
  const transition = (id: string) => {
    if (!motionAllowed() || typeof document.startViewTransition !== 'function') {
      apply(id);
      return;
    }
    // The class goes on first: it must be in place when the old state is captured.
    root.classList.add(VT_CLASS);
    let vt: ViewTransition;
    try {
      vt = document.startViewTransition(() => apply(id));
    } catch {
      root.classList.remove(VT_CLASS);
      apply(id);
      return;
    }
    running = vt;
    // Skipped (another click, a hidden tab): the update still ran; nothing to report.
    vt.ready.catch(() => {});
    vt.finished
      .catch(() => {})
      .finally(() => {
        if (running !== vt) return;
        running = null;
        root.classList.remove(VT_CLASS);
      });
  };

  let announceTimer = 0;
  const announce = (id: string) => {
    if (!status) return;
    const shown = count(id);
    // Cleared first, so the same count twice in a row (4 of 15, then another 4) is still read.
    status.textContent = '';
    clearTimeout(announceTimer);
    announceTimer = window.setTimeout(() => {
      status.textContent = `Showing ${shown} of ${rows.length} projects`;
    }, 80);
  };

  /** On a phone the chips are a sideways-scrolling rail: keep the chosen one wholly in it. */
  const bringIntoView = (chip: HTMLElement) => {
    if (!rail || rail.scrollWidth <= rail.clientWidth) return;
    const box = chip.getBoundingClientRect();
    const view = rail.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(rail).paddingInlineStart) || 0;
    if (box.left < view.left + pad) rail.scrollLeft -= view.left + pad - box.left;
    else if (box.right > view.right - pad) rail.scrollLeft += box.right - (view.right - pad);
  };

  const remember = (id: string) => {
    const url = new URL(location.href);
    if (id) url.searchParams.set(PARAM, id);
    else url.searchParams.delete(PARAM);
    history.replaceState(history.state, '', url);
  };

  bar.addEventListener('click', (event) => {
    const chip = (event.target as Element).closest<HTMLButtonElement>('button[data-capability]');
    if (!chip) return;
    const id = chip.dataset.capability ?? '';
    if (id === current()) return;
    bringIntoView(chip);
    transition(id);
    remember(id);
    announce(id);
  });

  // Whatever the bootstrap applied from the URL, minus an unknown value (ignored).
  apply(current());
  const pressed = chips.find((chip) => chip.getAttribute('aria-pressed') === 'true');
  if (pressed) bringIntoView(pressed);
  bar.dataset.ready = '';
}

const bar = document.querySelector<HTMLElement>('[data-work-filter]');
const list = document.querySelector<HTMLElement>('[data-filter-list]');
if (bar && list) wire(bar, list);
