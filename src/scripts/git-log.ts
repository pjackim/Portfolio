/**
 * Experience git log (GitLog.astro): the milestone toggles and the family chips. The graph is
 * drawn at build time (src/lib/git-log.ts) and never changes; state is which milestones are open
 * and which family is picked. Everything tagged `data-fams` (rows and graph strokes) is marked
 * `data-hit` or `data-dim` against the family; main is untagged and never dims.
 *
 * - A chip `--grep`s a family: its milestones open, its lane lights, the rest dims, and the
 *   command line and note say so. "all" clears the pick and leaves open what's open.
 * - A milestone's toggle (the whole row) opens or folds it, whatever is picked.
 * - Hovering a skill (fine pointer) previews its family the same way, without picking it; the
 *   command line and the note stay on the pick.
 *
 * Fetched by the motion layer as soon as a page has a log.
 */
import { logCommand } from '../lib/git-log';

const flag = (el: HTMLElement, name: string, on: boolean) => {
  if (on) el.dataset[name] = '';
  else delete el.dataset[name];
};

const has = (el: HTMLElement, family: string) =>
  (el.dataset.fams ?? '').split(' ').includes(family);

function wire(root: HTMLElement): void {
  const marked = [...root.querySelectorAll<HTMLElement>('[data-fams]')];
  const chips = [...root.querySelectorAll<HTMLButtonElement>('button[data-grep]')];
  const commits = [...root.querySelectorAll<HTMLElement>('li[data-commit]')];
  const tips = [...root.querySelectorAll<HTMLElement>('[data-tip]')];
  const cmd = root.querySelector<HTMLElement>('[data-git-cmd]');
  const note = root.querySelector<HTMLElement>('[data-git-note]');
  const idle = note?.textContent ?? '';
  const open = new Set(
    commits.filter((li) => li.dataset.open !== undefined).map((li) => li.dataset.commit ?? ''),
  );
  let picked: string | null = null;
  let preview: string | null = null;

  const summary = (family: string) => {
    if (!note) return;
    const hits = commits.filter((li) => has(li, family));
    const title = (li: HTMLElement | undefined) => li?.dataset.title ?? '';
    const learning = tips.filter((li) => has(li, family)).length;
    const name = document.createElement('b');
    name.textContent = family;
    const parts = [
      hits.length === 1
        ? `1 milestone, ${title(hits[0])}`
        : `${hits.length} milestones, ${title(hits.at(-1))} → ${title(hits[0])}`,
    ];
    if (learning) parts.push(`${learning} still learning`);
    note.replaceChildren(name, ` · ${parts.join(' · ')}`);
  };

  const render = () => {
    const family = preview ?? picked;
    for (const el of marked) {
      flag(el, 'dim', family !== null && !has(el, family));
      flag(el, 'hit', family !== null && has(el, family));
    }
    if (family) root.dataset.pick = family;
    else delete root.dataset.pick;
    for (const chip of chips) {
      chip.setAttribute('aria-pressed', String((chip.dataset.grep || null) === picked));
    }
    for (const li of commits) {
      const on = open.has(li.dataset.commit ?? '');
      flag(li, 'open', on);
      li.querySelector('.commit__toggle')?.setAttribute('aria-expanded', String(on));
    }
    if (cmd) cmd.textContent = logCommand(picked);
    if (picked) summary(picked);
    else if (note) note.textContent = idle;
  };

  root.addEventListener('click', (event) => {
    const target = event.target as Element;
    // Rows open with a short entrance only once someone has opened one (not on load).
    root.dataset.animate = '';
    const chip = target.closest<HTMLButtonElement>('button[data-grep]');
    if (chip) {
      picked = chip.dataset.grep || null;
      preview = null;
      if (picked) {
        open.clear();
        for (const li of commits) if (has(li, picked)) open.add(li.dataset.commit ?? '');
      }
      render();
      return;
    }
    const li = target.closest('.commit__toggle')?.closest<HTMLElement>('li[data-commit]');
    if (!li) return;
    const id = li.dataset.commit ?? '';
    if (open.has(id)) open.delete(id);
    else open.add(id);
    render();
  });

  const hover = (next: string | null) => {
    if (next === preview) return;
    preview = next;
    render();
  };
  root.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'touch') return;
    const skill = (event.target as Element).closest<HTMLElement>('[data-skill]');
    hover(skill?.dataset.family ?? null);
  });
  root.addEventListener('pointerleave', () => hover(null));

  render();
  root.dataset.ready = '';
}

for (const root of document.querySelectorAll<HTMLElement>('[data-git-log]')) wire(root);
