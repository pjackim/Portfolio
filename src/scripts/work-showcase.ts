/**
 * /work/'s rotating leads (WorkShowcase.astro). The timer is CSS: the current tick's bar fills
 * over 6 seconds (paused on hover, focus, off screen or by the status button), and its
 * `animationend` steps the lead on here. With motion off there is no animation, so nothing moves
 * on by itself. A tick picks a project (focus follows to the same tick in the new panel); rows
 * mark the project in the lead, and float their cover beside the pointer.
 *
 * The capability filter (work-filter.ts) hides rows and ticks with CSS; when it changes, the
 * lead moves to the first project still shown, and the count and empty state follow.
 * Fetched by the motion layer as soon as the page has a showcase.
 */
import { pad2 } from '../lib/format';

const root = document.documentElement;

/** Shown: not hidden by the filter's CSS, which hides whatever lacks the chosen capability.
    (Matched here rather than read from the computed style: inside an emptied showcase's hidden
    list, WebKit reports every row as `display: none`, so it would never fill again.) */
const shown = (el: HTMLElement) => {
  const capability = root.dataset.capability;
  return !capability || (el.dataset.capabilities ?? '').split(' ').includes(capability);
};

function wire(section: HTMLElement): void {
  const leads = [...section.querySelectorAll<HTMLElement>('[data-lead]')];
  const rows = [...section.querySelectorAll<HTMLElement>('[data-project]')];
  const list = section.querySelector<HTMLElement>('[data-showcase-list]');
  const toggle = section.querySelector<HTMLButtonElement>('[data-showcase-toggle]');
  const pos = section.querySelector<HTMLElement>('[data-showcase-pos]');
  const count = section.querySelector<HTMLElement>('[data-showcase-count]');
  let current = leads[0]?.dataset.lead ?? '';

  const visible = () => rows.filter(shown).map((row) => row.dataset.project ?? '');

  const show = (id: string, focus = false) => {
    const changed = id !== current;
    current = id;
    for (const lead of leads) {
      lead.hidden = lead.dataset.lead !== id;
      if (changed && !lead.hidden) lead.dataset.enter = '';
      else delete lead.dataset.enter;
    }
    for (const row of rows) {
      if (row.dataset.project === id) row.dataset.on = '';
      else delete row.dataset.on;
    }
    const ids = visible();
    if (pos) pos.textContent = `${pad2(ids.indexOf(id) + 1)} / ${pad2(ids.length)}`;
    if (focus) {
      section
        .querySelector<HTMLElement>(`[data-lead="${id}"] [data-tick="${id}"]`)
        ?.focus({ preventScroll: true });
    }
  };

  /** After a filter change: the count, the empty state, and a lead that's still shown. */
  const sync = () => {
    const ids = visible();
    if (count) count.textContent = pad2(ids.length);
    if (ids.length) delete section.dataset.empty;
    else section.dataset.empty = '';
    if (ids.length > 1) section.dataset.auto = '';
    else delete section.dataset.auto;
    show(ids.includes(current) ? current : (ids[0] ?? current));
  };

  section.addEventListener('click', (event) => {
    const tick = (event.target as Element).closest<HTMLElement>('[data-tick]');
    if (tick?.dataset.tick) show(tick.dataset.tick, true);
  });

  section.addEventListener('animationend', (event) => {
    if (event.animationName !== 'tick-fill') return;
    const ids = visible();
    const next = ids[(ids.indexOf(current) + 1) % ids.length];
    if (ids.length > 1 && next !== undefined) show(next);
  });

  toggle?.addEventListener('click', () => {
    const paused = section.dataset.paused === undefined;
    if (paused) section.dataset.paused = '';
    else delete section.dataset.paused;
    toggle.setAttribute('aria-pressed', String(paused));
  });

  new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) delete section.dataset.offscreen;
    else section.dataset.offscreen = '';
  }).observe(section);

  // The cover preview follows the pointer over the list, kept inside its width.
  const thumb = list?.querySelector<HTMLElement>('.work-row__thumb');
  list?.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    const box = list.getBoundingClientRect();
    const x = Math.min(event.clientX - box.left + 28, box.width - (thumb?.offsetWidth ?? 0));
    list.style.setProperty('--px', `${Math.max(0, x)}px`);
    list.style.setProperty('--py', `${event.clientY - box.top - 84}px`);
  });

  new MutationObserver(sync).observe(root, {
    attributes: true,
    attributeFilter: ['data-capability'],
  });
  sync();
  section.dataset.ready = '';
}

for (const section of document.querySelectorAll<HTMLElement>('[data-showcase]')) wire(section);
