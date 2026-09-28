/**
 * Geometry of the About timeline's wide layout (AboutTimeline.astro, Portfolio.dc.html): stops
 * zig-zag down a constellation, alternating sides of the centre. Each stop's node sits at a
 * fixed vertical step and a slightly jittered horizontal position, so the path through them
 * reads hand-placed rather than ruled. The component writes these as per-entry CSS variables;
 * the canvas (src/scripts/about-timeline.ts) reads the laid-out node markers back, so the
 * numbers live only here.
 */

/** Node y of the first stop, the step between stops, and the room left under the last (px). */
export const TIMELINE_TOP = 36;
export const TIMELINE_STEP = 96;
export const TIMELINE_FOOT = 170;

/** Node x of stop `i`, as a percentage of the timeline's width: left of centre, then right. */
export const timelineX = (i: number): number => (i % 2 ? 62 + ((i * 37) % 5) : 38 - ((i * 29) % 5));

/** Node y of stop `i`, in px from the timeline's top. */
export const timelineY = (i: number): number => TIMELINE_TOP + i * TIMELINE_STEP;

/** Height of a wide timeline with `count` stops, in px. */
export const timelineHeight = (count: number): number => timelineY(count - 1) + TIMELINE_FOOT;
