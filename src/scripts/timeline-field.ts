/**
 * Where the About constellation's drifting points sit (about-timeline.ts). Pure, so the spread
 * can be measured without a browser.
 *
 * Uniform random placement clumps: with ~20 points, a whole third of the height can end up with
 * two of them while one band carries half the faint links. So the height is stratified: one
 * point per vertical slice, jittered inside it. Across, the points gather toward the middle of
 * the band, between the two columns of text: each x is the mean of a few uniform draws, so it is
 * bell-shaped around the centre. Of a few such candidates the one with the most room wins, with
 * room capped at CLEAR_CAP so the pick never drifts outward chasing the emptiest spot. The same
 * seeded `rnd` gives the same field on every visit and resize.
 */

export interface Spot {
  x: number;
  y: number;
}

export interface FieldBounds {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/**
 * Share of the timeline's width the points live in. The stops' text ends or starts 30px outside
 * their nodes (AboutTimeline.astro) and the nodes sit at 35-38% (left) and 62-64% (right)
 * (src/lib/timeline.ts), so 38%-62% keeps every point at least 30px clear of the text before it
 * drifts (up to 12px, about-timeline.ts), at any width.
 */
export const FIELD_FROM = 0.38;
export const FIELD_TO = 0.62;

/** Candidates tried per point, uniform draws averaged per x (more = tighter to the centre). */
const CANDIDATES = 6;
const BELL = 3;
/** Distance (px) from the other points and the path beyond which more room doesn't matter. */
const CLEAR_CAP = 60;
/** How far into its slice a point's y may wander (share of the slice, each side). */
const SLICE_MARGIN = 0.15;

/** `count` points over `bounds`, one per vertical slice, kept clear of each other and `avoid`. */
export function scatterField(
  count: number,
  bounds: FieldBounds,
  avoid: readonly Spot[],
  rnd: () => number,
): Spot[] {
  const slice = (bounds.y1 - bounds.y0) / count;
  const placed: Spot[] = [];
  for (let k = 0; k < count; k++) {
    const y = bounds.y0 + (k + SLICE_MARGIN + rnd() * (1 - 2 * SLICE_MARGIN)) * slice;
    let best: Spot = { x: (bounds.x0 + bounds.x1) / 2, y };
    let room = -1;
    for (let c = 0; c < CANDIDATES; c++) {
      let u = 0;
      for (let b = 0; b < BELL; b++) u += rnd();
      const x = bounds.x0 + (u / BELL) * (bounds.x1 - bounds.x0);
      let nearest = CLEAR_CAP;
      for (const p of avoid) nearest = Math.min(nearest, Math.hypot(p.x - x, p.y - y));
      for (const p of placed) nearest = Math.min(nearest, Math.hypot(p.x - x, p.y - y));
      if (nearest > room) {
        room = nearest;
        best = { x, y };
      }
    }
    placed.push(best);
  }
  return placed;
}
