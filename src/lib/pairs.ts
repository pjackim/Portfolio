/**
 * Paired paragraphs: body text tied to the media that shows it. In a project's Markdown a block is
 * wrapped in a plain HTML `div` (blank lines inside keep the Markdown rendering):
 *
 *     <div data-pair="teleport-map" data-side="left">
 *
 *     ### Map and spawner
 *     A top-down map of the level, where a click teleports or spawns.
 *
 *     </div>
 *
 * `data-pair` names a media entry (frontmatter `media[].pair`); `data-side` is the side the media
 * sits on, and when it's left out the pairs alternate, the first with its media on the right. The
 * layout splits the rendered body at these blocks and sets each one beside its figure (MediaPair).
 * Without the layout's help the wrapper is just a `div`, so the text still reads in order.
 */
import type { MediaItem } from './media';

export type PairSide = 'left' | 'right';

export type BodySegment =
  { kind: 'html'; html: string } | { kind: 'pair'; key: string; side: PairSide; html: string };

/** How Astro serialises the wrapper: attributes in source order, double-quoted. */
const PAIR_BLOCK = /<div data-pair="([^"]*)"(?: data-side="([^"]*)")?>([\s\S]*?)<\/div>/g;

/** Splits the rendered body into its plain HTML runs and its paired blocks, in document order. */
export function splitPairs(html: string): BodySegment[] {
  const segments: BodySegment[] = [];
  let from = 0;
  let paired = 0;
  for (const match of html.matchAll(PAIR_BLOCK)) {
    const [whole, key = '', declared, inner = ''] = match;
    if (declared !== undefined && declared !== 'left' && declared !== 'right') {
      throw new Error(`pairs: data-side="${declared}" on "${key}"; expected "left" or "right"`);
    }
    const before = html.slice(from, match.index);
    if (before.trim()) segments.push({ kind: 'html', html: before });
    const side = declared ?? (paired % 2 === 0 ? 'right' : 'left');
    segments.push({ kind: 'pair', key, side, html: inner.trim() });
    from = match.index + whole.length;
    paired += 1;
  }
  const rest = html.slice(from);
  if (rest.trim()) segments.push({ kind: 'html', html: rest });
  return segments;
}

/**
 * The media each paired block shows, by key. Throws at build time when a block names no media, two
 * blocks share a key, or a media entry's `pair` has no block — a silent miss would drop a figure.
 */
export function pairMedia(
  segments: readonly BodySegment[],
  media: readonly MediaItem[],
  projectId: string,
): Map<string, MediaItem> {
  const byKey = new Map<string, MediaItem>();
  for (const item of media) {
    if (!item.pair) continue;
    if (byKey.has(item.pair))
      throw new Error(`pairs: ${projectId} has two media with pair "${item.pair}"`);
    byKey.set(item.pair, item);
  }
  const used = new Set<string>();
  for (const segment of segments) {
    if (segment.kind !== 'pair') continue;
    if (!byKey.has(segment.key)) {
      throw new Error(`pairs: ${projectId} has a data-pair="${segment.key}" block with no media`);
    }
    if (used.has(segment.key)) {
      throw new Error(`pairs: ${projectId} uses data-pair="${segment.key}" twice`);
    }
    used.add(segment.key);
  }
  for (const key of byKey.keys()) {
    if (!used.has(key))
      throw new Error(`pairs: ${projectId} media pair "${key}" has no body block`);
  }
  return byKey;
}
