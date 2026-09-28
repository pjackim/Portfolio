/**
 * Experience git log (GitLog.astro): the commit toggles and the `--grep` chips. State is the set
 * of commits opened by hand and the grepped family. Each change re-applies it to the rows
 * (`data-open`, `data-dim`, `aria-expanded`) and redraws the graph from src/lib/git-log.ts, the
 * same geometry the build rendered. Opening a commit while a family is grepped drops the grep
 * and starts from that commit alone. Fetched by the motion layer as soon as a page has a log.
 */
import {
  commitState,
  graphMarkup,
  layoutGraph,
  logCommand,
  type GraphCommit,
  type GraphFamily,
  type GraphState,
} from '../lib/git-log';

function wire(root: HTMLElement): void {
  const svg = root.querySelector<SVGSVGElement>('[data-git-graph]');
  const cmd = root.querySelector<HTMLElement>('[data-git-cmd]');
  const chips = [...root.querySelectorAll<HTMLButtonElement>('button[data-grep]')];
  const items = [...root.querySelectorAll<HTMLElement>('[data-commit]')];
  const commits: GraphCommit[] = items.map((li) => ({
    id: li.dataset.commit ?? '',
    family: (li.dataset.family ?? 'main') as GraphFamily,
    skills: [...li.querySelectorAll<HTMLElement>('[data-skill]')].map((s) => ({
      family: (s.dataset.family ?? 'main') as GraphFamily,
      learning: s.dataset.learning !== undefined,
    })),
  }));

  let state: GraphState = {
    open: new Set(
      items.filter((li) => li.dataset.open !== undefined).map((li) => li.dataset.commit ?? ''),
    ),
    grep: null,
  };

  const flag = (el: HTMLElement, name: string, on: boolean) => {
    if (on) el.dataset[name] = '';
    else delete el.dataset[name];
  };

  const render = () => {
    const layout = layoutGraph(commits, state);
    if (svg) {
      svg.innerHTML = graphMarkup(layout);
      svg.setAttribute('height', String(layout.height));
    }
    items.forEach((li, i) => {
      const commit = commits[i];
      if (!commit) return;
      const { open, hit } = commitState(commit, state);
      flag(li, 'open', open);
      flag(li, 'dim', !hit);
      li.querySelector('.commit__toggle')?.setAttribute('aria-expanded', String(open));
      for (const skill of li.querySelectorAll<HTMLElement>('[data-skill]')) {
        flag(skill, 'dim', state.grep !== null && skill.dataset.family !== state.grep);
      }
    });
    for (const chip of chips) {
      chip.setAttribute('aria-pressed', String((chip.dataset.grep || null) === state.grep));
    }
    if (cmd) cmd.textContent = logCommand(state.grep);
  };

  root.addEventListener('click', (event) => {
    const target = event.target as Element;
    const chip = target.closest<HTMLButtonElement>('button[data-grep]');
    if (chip) {
      const grep = (chip.dataset.grep || null) as GraphFamily | null;
      if (grep === state.grep) return;
      state = { open: state.open, grep };
      render();
      return;
    }
    const toggle = target.closest<HTMLButtonElement>('.commit__toggle');
    const li = toggle?.closest<HTMLElement>('[data-commit]');
    if (!li) return;
    const commit = commits[items.indexOf(li)];
    if (!commit) return;
    const { open } = commitState(commit, state);
    const next = new Set(state.grep ? [] : state.open);
    if (open) next.delete(commit.id);
    else next.add(commit.id);
    state = { open: next, grep: null };
    render();
  });

  root.dataset.ready = '';
}

for (const root of document.querySelectorAll<HTMLElement>('[data-git-log]')) wire(root);
