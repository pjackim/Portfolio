/**
 * The About constellation's background points (src/scripts/timeline-field.ts), a pure function:
 * one per vertical slice, so no band of the height runs dry or crowds; inside the bounds, gathered
 * toward the middle of the band; and the same field for the same seed (a stable shape on every
 * visit and resize). Needs no browser.
 */
import { expect, test } from '@playwright/test';
import { timelineHeight, timelineX, timelineY } from '../src/lib/timeline.ts';
import { FIELD_FROM, FIELD_TO, scatterField, type Spot } from '../src/scripts/timeline-field.ts';

const STOPS = 6;
const WIDTH = 1152;
const HEIGHT = timelineHeight(STOPS);
const BOUNDS = { x0: WIDTH * FIELD_FROM, x1: WIDTH * FIELD_TO, y0: 10, y1: HEIGHT - 70 };
const COUNT = 23;
const BANDS = 6;

/** A seeded generator, the one about-timeline.ts uses. */
const seeded = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

const nodes: Spot[] = Array.from({ length: STOPS }, (_, i) => ({
  x: (timelineX(i) / 100) * WIDTH,
  y: timelineY(i),
}));

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);

test('every vertical slice holds exactly one point, inside the bounds', () => {
  const slice = (BOUNDS.y1 - BOUNDS.y0) / COUNT;
  for (const seed of SEEDS) {
    const field = scatterField(COUNT, BOUNDS, nodes, seeded(seed));
    expect(field).toHaveLength(COUNT);
    field.forEach((p, k) => {
      expect(Math.floor((p.y - BOUNDS.y0) / slice)).toBe(k);
      expect(p.x).toBeGreaterThanOrEqual(BOUNDS.x0);
      expect(p.x).toBeLessThanOrEqual(BOUNDS.x1);
    });
  }
});

test('no sixth of the height is left sparse or crowded', () => {
  for (const seed of SEEDS) {
    const bands = Array<number>(BANDS).fill(0);
    for (const p of scatterField(COUNT, BOUNDS, nodes, seeded(seed))) {
      bands[
        Math.min(BANDS - 1, Math.floor(((p.y - BOUNDS.y0) / (BOUNDS.y1 - BOUNDS.y0)) * BANDS))
      ]!++;
    }
    expect(Math.min(...bands), `seed ${seed}: ${bands}`).toBeGreaterThanOrEqual(2);
    expect(Math.max(...bands), `seed ${seed}: ${bands}`).toBeLessThanOrEqual(5);
  }
});

test('the points gather toward the middle of the band, tighter than a uniform spread', () => {
  const half = (BOUNDS.x1 - BOUNDS.x0) / 2;
  const centre = (BOUNDS.x0 + BOUNDS.x1) / 2;
  const spreads = SEEDS.map((seed) => {
    const offsets = scatterField(COUNT, BOUNDS, nodes, seeded(seed)).map(
      (p) => (p.x - centre) / half,
    );
    return Math.sqrt(offsets.reduce((sum, v) => sum + v * v, 0) / offsets.length);
  });
  const mean = spreads.reduce((sum, v) => sum + v, 0) / spreads.length;
  // A uniform spread across the band is 0.58 of the half-width (1/√3).
  expect(mean).toBeLessThan(0.52);
  expect(mean).toBeGreaterThan(0.3);
});

test('the same seed gives the same field', () => {
  expect(scatterField(COUNT, BOUNDS, nodes, seeded(11))).toEqual(
    scatterField(COUNT, BOUNDS, nodes, seeded(11)),
  );
});

test('no point comes within 16px of a text column, drift included', () => {
  const DRIFT = 12; // about-timeline.ts: a point wanders up to 12px either way
  for (const width of [880, 1000, 1152]) {
    const bounds = { x0: width * FIELD_FROM, x1: width * FIELD_TO, y0: 10, y1: HEIGHT - 70 };
    const stopNodes = nodes.map((n) => ({ x: (n.x / WIDTH) * width, y: n.y }));
    // Left stops' text ends 30px before their node, right stops' starts 30px after it.
    const leftEdge = Math.max(...stopNodes.filter((_, i) => i % 2 === 0).map((n) => n.x - 30));
    const rightEdge = Math.min(...stopNodes.filter((_, i) => i % 2 === 1).map((n) => n.x + 30));
    for (const seed of SEEDS) {
      for (const p of scatterField(COUNT, bounds, stopNodes, seeded(seed))) {
        expect(p.x - DRIFT - leftEdge, `seed ${seed} width ${width}`).toBeGreaterThanOrEqual(16);
        expect(rightEdge - (p.x + DRIFT), `seed ${seed} width ${width}`).toBeGreaterThanOrEqual(16);
      }
    }
  }
});
