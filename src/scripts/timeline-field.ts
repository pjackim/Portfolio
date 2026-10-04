/**
 * Where the About constellation's drifting points sit (about-timeline.ts). Pure, so the spread
 * can be measured without a browser.
 *
 * Uniform random placement clumps: with ~20 points, a whole third of the height can end up with
 * two of them while one band carries half the faint links. So placement is stratified instead:
 * one point per vertical slice (jittered inside it), and each point's x is the best of a few
 * candidates, the one farthest from everything already placed and from the path. The same
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

/** How many x positions each point tries, and how far into its slice the y may wander. */
const CANDIDATES = 14;
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
    let best: Spot = { x: bounds.x0, y };
    let clearance = -1;
    for (let c = 0; c < CANDIDATES; c++) {
      const x = bounds.x0 + rnd() * (bounds.x1 - bounds.x0);
      let nearest = Infinity;
      for (const p of avoid) nearest = Math.min(nearest, Math.hypot(p.x - x, p.y - y));
      for (const p of placed) nearest = Math.min(nearest, Math.hypot(p.x - x, p.y - y));
      if (nearest > clearance) {
        clearance = nearest;
        best = { x, y };
      }
    }
    placed.push(best);
  }
  return placed;
}
