/**
 * Experience git log graph (GitLog.astro): the lanes beside the log, drawn as one SVG slice per
 * row. Pure and import-free.
 *
 * Main (lane 0) carries the milestones, newest first. Each skill family is one long-lived branch
 * on its own lane: it forks from main at the milestone before the first one that used it, merges
 * into every milestone that used it, and ends at its last merge. While a family still has skills
 * being learned (HEAD's `learning` skills), its branch runs on past HEAD, dashed because it isn't
 * merged, to those skills: branch tips above HEAD. A milestone's skills are its branches'
 * commits, listed under it when it's open (git log order: a merge commit above what it merged).
 *
 * The lanes don't depend on which milestones are open (a folded milestone's skill rows just
 * aren't shown), so the build draws every slice and the script only toggles state. A slice
 * fills its row's height (verticals run to 100%) and puts every junction on the row's node line,
 * a fixed distance from the row's top, so rows can wrap to any height and the lanes still meet.
 */

export interface GraphSkill {
  family: string;
  learning?: boolean | undefined;
}

export interface GraphCommit {
  skills: readonly GraphSkill[];
}

/** Node line, px from the top of a milestone row and of a skill / tip / `init` row. */
export const NODE_Y = { commit: 24, skill: 18 } as const;

const X0 = 8;
const PITCH = 16;
const R = 7;
const laneX = (k: number) => X0 + k * PITCH;

/** Width of the graph column for `lanes` branches beside main. */
export const graphWidth = (lanes: number): number => X0 * 2 + lanes * PITCH;

type Stroke = 'solid' | 'dash';

/** One lane's part of a row. */
interface Seg {
  /** 0 is main. */
  k: number;
  family: string;
  /** Stroke from the row's top to the node line, and from it to the row's bottom. */
  above?: Stroke | undefined;
  below?: Stroke | undefined;
  node?: 'dot' | 'ring' | 'head' | 'end' | undefined;
  /** Connector to main on the node line: `merge` curves in from below, `fork` curves out and up. */
  join?: 'merge' | 'fork' | undefined;
}

/** A row's slice: classes only (GitLog.astro styles them), so the CSP holds. */
function slice(segs: readonly Seg[], y: number, width: number): string {
  const lines: string[] = [];
  const gaps: string[] = [];
  const joins: string[] = [];
  const nodes: string[] = [];
  const reach = Math.max(0, ...segs.filter((s) => s.join).map((s) => laneX(s.k)));
  const attrs = (s: Seg, cls: string) =>
    `class="${cls} gl-f-${s.family}"${s.k > 0 ? ` data-fams="${s.family}"` : ''}`;
  const line = (st: Stroke) => (st === 'dash' ? 'gl-line gl-line--dash' : 'gl-line');

  for (const s of segs) {
    const x = laneX(s.k);
    if (s.above) {
      const end = s.join === 'fork' && !s.below ? y - R : y;
      // From just above the row's top, so it overlaps the row above instead of leaving a seam.
      lines.push(`<line x1="${x}" x2="${x}" y1="-1" y2="${end}" ${attrs(s, line(s.above))}/>`);
    }
    if (s.below) {
      const start = s.join === 'merge' && !s.above ? y + R : y;
      lines.push(`<line x1="${x}" x2="${x}" y1="${start}" y2="100%" ${attrs(s, line(s.below))}/>`);
    }
    // A lane a connector crosses without joining breaks around it, so it reads as behind.
    if (!s.join && s.k > 0 && s.above && s.below && !s.node && x < reach) {
      gaps.push(`<line x1="${x}" x2="${x}" y1="${y - 3.5}" y2="${y + 3.5}" class="gl-gap"/>`);
    }
    if (s.node === 'head') {
      nodes.push(
        `<circle cx="${x}" cy="${y}" r="9.5" ${attrs(s, 'gl-halo')}/>`,
        `<circle cx="${x}" cy="${y}" r="5.5" ${attrs(s, 'gl-node gl-node--fill')}/>`,
      );
    } else if (s.node) {
      const r = s.node === 'end' ? 3.5 : s.k === 0 ? 5 : 4;
      const cls = s.node === 'dot' ? 'gl-node gl-node--fill' : 'gl-node';
      nodes.push(`<circle cx="${x}" cy="${y}" r="${r}" ${attrs(s, cls)}/>`);
    }
  }

  // Connectors farthest first, so the one nearest main is drawn on top.
  for (const s of segs.filter((seg) => seg.join).sort((a, b) => b.k - a.k)) {
    const x = laneX(s.k);
    const d =
      s.join === 'merge'
        ? `M${x},${y + R} Q${x},${y} ${x - R},${y} L${X0},${y}`
        : `M${X0},${y} L${x - R},${y} Q${x},${y} ${x},${y - R}`;
    const st = (s.join === 'fork' ? s.above : s.below) ?? 'solid';
    joins.push(`<path d="${d}" ${attrs(s, line(st))}/>`);
  }

  return `<svg class="gl-svg" width="${width}" aria-hidden="true" focusable="false">${[
    ...lines,
    ...gaps,
    ...joins,
    ...nodes,
  ].join('')}</svg>`;
}

/** A milestone's merged skills (everything but what's still being learned). */
export const mergedSkills = <S extends GraphSkill>(c: { skills: readonly S[] }): S[] =>
  c.skills.filter((s) => !s.learning);

/** HEAD's skills still being learned: the branch tips above HEAD. */
export const tipSkills = <S extends GraphSkill>(
  commits: readonly { skills: readonly S[] }[],
): S[] => (commits[0]?.skills ?? []).filter((s) => s.learning);

export interface LogRow {
  svg: string;
  /** Families the row's skills belong to, space-separated (picks match against it). */
  fams: string;
}

export interface LogLayout {
  /** One per skill still being learned, above HEAD, in the data's order. */
  tips: LogRow[];
  /** Per milestone: its own row, and a row per merged skill. */
  commits: { row: LogRow; skills: LogRow[] }[];
  init: LogRow;
  width: number;
}

/** `families`: one lane each, in this order beside main. */
export function layoutLog(commits: readonly GraphCommit[], families: readonly string[]): LogLayout {
  if (commits.slice(1).some((c) => c.skills.some((s) => s.learning))) {
    throw new Error('git-log: only HEAD (the first commit) can have skills still being learned');
  }
  const N = commits.length;
  const width = graphWidth(families.length);
  const tips = tipSkills(commits);
  // Row indices: tips −T … −1, milestones 0 … N−1 (newest first), init N.
  const tipRow = (j: number) => j - tips.length;
  const uses = (f: string, i: number) => {
    const c = commits[i];
    return !!c && mergedSkills(c).some((s) => s.family === f);
  };
  const famsOf = (skills: readonly GraphSkill[]) =>
    families.filter((f) => skills.some((s) => s.family === f)).join(' ');

  const spans = new Map<string, { k: number; top: number; newest: number; bottom: number }>();
  families.forEach((f, idx) => {
    const at = commits.flatMap((_, i) => (uses(f, i) ? [i] : []));
    if (!at.length) return;
    const t = tips.flatMap((s, j) => (s.family === f ? [tipRow(j)] : []));
    const newest = Math.min(...at);
    spans.set(f, {
      k: idx + 1,
      top: t.length ? Math.min(...t) : newest,
      newest,
      bottom: Math.max(...at) + 1,
    });
  });

  const tipRows = tips.map((skill, j) => {
    const r = tipRow(j);
    const segs: Seg[] = [];
    for (const [f, sp] of spans) {
      if (r < sp.top || r > sp.bottom) continue;
      segs.push({
        k: sp.k,
        family: f,
        above: r > sp.top ? 'dash' : undefined,
        below: 'dash',
        node: f === skill.family ? 'ring' : undefined,
      });
    }
    return { svg: slice(segs, NODE_Y.skill, width), fams: skill.family };
  });

  const rows = commits.map((c, i) => {
    const segs: Seg[] = [
      {
        k: 0,
        family: 'main',
        above: i > 0 ? 'solid' : undefined,
        below: 'solid',
        node: i === 0 ? 'head' : 'ring',
      },
    ];
    for (const [f, sp] of spans) {
      if (i < sp.top || i > sp.bottom) continue;
      if (uses(f, i)) {
        // Above the newest merge, only unmerged work is left: dashed.
        const up = i === sp.newest && sp.top < sp.newest ? 'dash' : 'solid';
        segs.push({
          k: sp.k,
          family: f,
          join: 'merge',
          below: 'solid',
          above: i > sp.top ? up : undefined,
        });
      } else if (i === sp.bottom) segs.push({ k: sp.k, family: f, join: 'fork', above: 'solid' });
      else segs.push({ k: sp.k, family: f, above: 'solid', below: 'solid' });
    }
    const skills = mergedSkills(c).map((skill) => {
      const ss: Seg[] = [{ k: 0, family: 'main', above: 'solid', below: 'solid' }];
      for (const [f, sp] of spans) {
        if (sp.top > i || sp.bottom <= i) continue;
        ss.push({
          k: sp.k,
          family: f,
          above: 'solid',
          below: 'solid',
          node: f === skill.family ? 'dot' : undefined,
        });
      }
      return { svg: slice(ss, NODE_Y.skill, width), fams: skill.family };
    });
    return {
      row: { svg: slice(segs, NODE_Y.commit, width), fams: famsOf(mergedSkills(c)) },
      skills,
    };
  });

  const initSegs: Seg[] = [{ k: 0, family: 'main', above: 'solid', node: 'end' }];
  for (const [f, sp] of spans) {
    if (sp.bottom === N) initSegs.push({ k: sp.k, family: f, join: 'fork', above: 'solid' });
  }
  return {
    tips: tipRows,
    commits: rows,
    init: { svg: slice(initSegs, NODE_Y.skill, width), fams: '' },
    width,
  };
}

/** The shell command shown above the log. */
export const logCommand = (grep: string | null): string =>
  grep ? `git log --graph --all --grep=${grep}` : 'git log --graph --all';
