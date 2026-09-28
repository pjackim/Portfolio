/**
 * Experience git log geometry (Portfolio.dc.html, Claude Design, Sept 2026): which rows show and
 * the graph drawn beside them, for a given open set and `--grep` family. Pure and import-free,
 * so the build renders the default state (GitLog.astro) and src/scripts/git-log.ts redraws the
 * same way after a toggle or a filter, from the same numbers.
 *
 * Lanes: 0 is main (every commit); 1 is a commit's merged skills, joining main at its commit
 * with a rounded corner; 2 is its skills still being learned, an open branch that runs dashed
 * past the top of the log without merging. Rows have fixed heights (the list's CSS matches
 * ROW_H), so a row's centre is known without measuring.
 */

export type GraphFamily = 'security' | 'software' | 'teaching' | 'design' | 'edu' | 'main';

export interface GraphSkill {
  family: GraphFamily;
  learning?: boolean;
}

export interface GraphCommit {
  id: string;
  family: GraphFamily;
  skills: readonly GraphSkill[];
}

export interface GraphState {
  /** Commits opened by hand (ignored while a family is grepped). */
  open: ReadonlySet<string>;
  /** Grepped family: its commits open, everything else dims. */
  grep: GraphFamily | null;
}

export interface GraphPath {
  d: string;
  family: GraphFamily;
  /** `knockout`: a page-colour underlay that parts crossing lines; `open`: dashed. */
  kind: 'line' | 'open' | 'knockout';
  dim: boolean;
}

export interface GraphNode {
  cx: number;
  cy: number;
  r: number;
  family: GraphFamily;
  /** `ring`: hollow; `dot`: filled; `halo`: the faint ring round HEAD. */
  kind: 'ring' | 'dot' | 'halo';
  dim: boolean;
}

export interface GraphLayout {
  /** Per commit: shown open, and whether it matches the grep. */
  commits: { id: string; open: boolean; hit: boolean }[];
  paths: GraphPath[];
  nodes: GraphNode[];
  height: number;
}

/** Row heights in px: a commit, a skill, the closing `init` row. Kept in step with the CSS. */
export const ROW_H = { commit: 52, skill: 32, init: 36 } as const;
/** Space above the first row (the open branches rise into it). */
export const GRAPH_TOP = 20;
/** Graph box: its width, and each lane's x. */
export const GRAPH_W = 62;
export const laneX = (lane: number): number => 10 + lane * 20;

const R = 9;

export function commitState(c: GraphCommit, state: GraphState): { open: boolean; hit: boolean } {
  const hit = state.grep ? c.skills.some((s) => s.family === state.grep) : true;
  const open = c.skills.length > 0 && (state.grep ? hit : state.open.has(c.id));
  return { open, hit };
}

export function layoutGraph(list: readonly GraphCommit[], state: GraphState): GraphLayout {
  const paths: GraphPath[] = [];
  const nodes: GraphNode[] = [];
  const commits: GraphLayout['commits'] = [];
  const merges: { y: number; family: GraphFamily; dim: boolean }[] = [];
  let y = GRAPH_TOP;
  let firstY = 0;
  const x0 = laneX(0);

  const row = (h: number) => {
    const mid = y + h / 2;
    y += h;
    return mid;
  };

  list.forEach((c, i) => {
    const { open, hit } = commitState(c, state);
    commits.push({ id: c.id, open, hit });
    const cy = row(ROW_H.commit);
    if (i === 0) {
      firstY = cy;
      nodes.push({ cx: x0, cy, r: 10, family: 'main', kind: 'halo', dim: !hit });
      nodes.push({ cx: x0, cy, r: 5.5, family: 'main', kind: 'dot', dim: !hit });
    } else nodes.push({ cx: x0, cy, r: 5.5, family: 'main', kind: 'ring', dim: !hit });
    if (!open) return;

    let lastDone = -1;
    const learning: { y: number; family: GraphFamily }[] = [];
    for (const s of c.skills) {
      const sy = row(ROW_H.skill);
      const dim = state.grep !== null && s.family !== state.grep;
      const lane = s.learning ? 2 : 1;
      nodes.push({
        cx: laneX(lane),
        cy: sy,
        r: 3.5,
        family: s.family,
        kind: s.learning ? 'ring' : 'dot',
        dim,
      });
      if (s.learning) learning.push({ y: sy, family: s.family });
      else lastDone = sy;
    }
    if (lastDone > -1) {
      const x = laneX(1);
      paths.push({
        d: `M${x},${lastDone} L${x},${cy + R}`,
        family: c.family,
        kind: 'line',
        dim: !hit,
      });
      merges.push({ y: cy, family: c.family, dim: !hit });
    }
    const top = learning[0];
    const bottom = learning.at(-1);
    if (top && bottom) {
      const x = laneX(2);
      paths.push({
        d: `M${x},${bottom.y} L${x},${top.y}`,
        family: top.family,
        kind: 'line',
        dim: !hit,
      });
      paths.push({ d: `M${x},${top.y} L${x},3`, family: top.family, kind: 'open', dim: !hit });
    }
  });

  const initY = row(ROW_H.init);
  nodes.push({ cx: x0, cy: initY, r: 3.5, family: 'main', kind: 'ring', dim: false });
  paths.unshift({
    d: `M${x0},${initY} L${x0},${firstY}`,
    family: 'main',
    kind: 'line',
    dim: false,
  });

  // Merges into main: a corner off lane 1, with a page-colour underlay so a lane it crosses
  // reads as passing behind it.
  for (const m of merges) {
    const lx = laneX(1);
    const head = `M${lx},${m.y + R} Q${lx},${m.y} ${lx - R},${m.y}`;
    paths.push({ d: `${head} L${x0 + 6},${m.y}`, family: m.family, kind: 'knockout', dim: m.dim });
    paths.push({ d: `${head} L${x0},${m.y}`, family: m.family, kind: 'line', dim: m.dim });
  }

  return { commits, paths, nodes, height: y + 8 };
}

/** The graph's SVG children: classes only (GitLog.astro styles them), so the CSP holds. */
export function graphMarkup(g: GraphLayout): string {
  const dim = (d: boolean) => (d ? ' is-dim' : '');
  return [
    ...g.paths.map(
      (p) => `<path d="${p.d}" class="gl-path gl-path--${p.kind} gl-f-${p.family}${dim(p.dim)}"/>`,
    ),
    ...g.nodes.map(
      (n) =>
        `<circle cx="${n.cx}" cy="${n.cy}" r="${n.r}" class="gl-node gl-node--${n.kind} gl-f-${n.family}${dim(n.dim)}"/>`,
    ),
  ].join('');
}

/** The shell command shown above the log. */
export const logCommand = (grep: GraphFamily | null): string =>
  grep ? `git log --graph --grep=${grep}` : 'git log --graph --first-parent';
