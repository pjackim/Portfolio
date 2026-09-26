/**
 * Geometry of the "pj" monogram with its accent cursor block (spec-design-content §3), shared
 * by `Monogram.astro` (header) and the favicon / OG-card generators in `scripts/og/`.
 *
 * A 22×18 unit grid with 2-unit strokes, so at 18px tall every stem lands on whole pixels.
 * Grid: j dot 0–2 · x-height 4–14 (baseline 14) · descender to 18 · cursor full height.
 * Imported by Node's native TypeScript too, so keep it free of imports and non-erasable syntax.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const MONOGRAM = {
  width: 22,
  height: 18,
  strokeWidth: 2,
  /** Stroked (no fill): the p bowl, the j stem and hook. */
  strokes: ['M1 5h5a4 4 0 0 1 0 8H1', 'M15 4v9a4 4 0 0 1-4 4H9'],
  /** Filled: the p stem, the j dot. */
  rects: [
    { x: 0, y: 4, width: 2, height: 14 },
    { x: 14, y: 0, width: 2, height: 2 },
  ],
  /** Filled with the accent colour. */
  cursor: { x: 19, y: 0, width: 3, height: 18 },
} as const satisfies {
  width: number;
  height: number;
  strokeWidth: number;
  strokes: readonly string[];
  rects: readonly Rect[];
  cursor: Rect;
};
