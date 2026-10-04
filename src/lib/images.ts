/**
 * Build-time facts about local images that `ImageMetadata` doesn't carry, and the shared rules
 * that turn them into frame modes and responsive width candidates (home cards, project
 * hero, figures). Runs sharp on the source file at build (and in dev); results are cached per
 * file for the whole build.
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { ImageMetadata } from 'astro';
import sharp from 'sharp';

export interface ImageFacts {
  width: number;
  height: number;
  /** Some pixels are (partly) transparent — e.g. a render on an alpha background. */
  transparent: boolean;
  /** SHA-1 of the file bytes: two imports with the same digest are the same picture. */
  digest: string;
  /** Size of the source file in bytes. */
  bytes: number;
}

const cache = new Map<string, Promise<ImageFacts>>();

async function inspect(path: string): Promise<ImageFacts> {
  const [{ width, height }, { isOpaque }, bytes] = await Promise.all([
    sharp(path).metadata(),
    sharp(path).stats(),
    readFile(path),
  ]);
  if (!width || !height) throw new Error(`images: cannot read dimensions of ${path}`);
  const digest = createHash('sha1').update(bytes).digest('hex');
  return { width, height, transparent: !isOpaque, digest, bytes: bytes.length };
}

/**
 * Width, height, transparency, digest and byte size of an imported local image. Reads the file
 * through Astro's private `fsPath` rather than the metadata fields, so the original file is not
 * marked as used outside the image pipeline (and copied into `dist/` unoptimized).
 */
export function imageFacts(image: ImageMetadata): Promise<ImageFacts> {
  const path = (image as ImageMetadata & { fsPath?: string }).fsPath;
  if (!path) throw new Error(`images: no source file for ${image.src} (not a local import?)`);
  let facts = cache.get(path);
  if (!facts) {
    facts = inspect(path);
    cache.set(path, facts);
  }
  return facts;
}

/**
 * How a frame shows an image:
 * - `cover`: fills the frame (cropped by a fixed-ratio frame, else shown whole);
 * - `panel`: narrower than `panelBelow` px, or portrait — shown whole on a `--surface-2`
 *   panel, never upscaled past its own size;
 * - `alpha`: has transparency — sits on a fixed light panel in both schemes, so dark artwork
 *   on a transparent background stays visible in dark mode.
 */
export type FrameMode = 'cover' | 'panel' | 'alpha';

export function frameMode(facts: ImageFacts, panelBelow: number): FrameMode {
  if (facts.transparent) return 'alpha';
  if (facts.width < panelBelow || facts.height > facts.width) return 'panel';
  return 'cover';
}

/**
 * The default `srcset` steps. 3200 is the widest slot (the 1584px container at 2×, 3168px), so a
 * master up to that width is delivered at its own size to the displays that can show it.
 */
export const DEFAULT_STEPS = [480, 800, 1200, 1600, 2000, 2400, 3200] as const;

/**
 * `srcset` widths for an image: the `steps` below the cap, then the cap itself — the source
 * width, or `max` for larger sources. Astro never upscales, so small sources stop at their
 * own width and still get their full-resolution file.
 */
export function candidateWidths(
  sourceWidth: number,
  max: number,
  steps: readonly number[] = DEFAULT_STEPS,
): number[] {
  const top = Math.min(sourceWidth, max);
  return [...steps.filter((w) => w < top), top];
}

/**
 * Attributes of an image the adaptive loader manages (src/lib/net-bootstrap.ts,
 * src/scripts/net.ts): full quality by default, a lighter candidate first only on a slow
 * connection.
 * - `auto`: any adaptive image: light first in slow mode, then upgraded;
 * - `priority`: the LCP image: the head script makes it eager as soon as it is parsed (after
 *   scaling its `sizes` in slow mode), so it starts loading at once;
 * - `lite`: light in slow and save modes and never upgraded (the /work/ hover thumbnails).
 * Every one ships `loading="lazy"`: no engine fetches a lazy image before the head script has
 * run, so it can still pick the candidate; without JS lazy loading is off by spec and the image
 * loads eagerly at full quality.
 */
export function adaptive(kind: 'auto' | 'priority' | 'lite' = 'auto') {
  return {
    'data-net-img': kind === 'auto' ? '' : kind,
    loading: 'lazy' as const,
    decoding: 'async' as const,
    fetchpriority: kind === 'priority' ? ('high' as const) : undefined,
  };
}

/**
 * Throws unless every entry of a `sizes` list ends in a plain px / rem / vw length: all the
 * loader can scale (net-bootstrap.ts), so it checks the lists at build time instead of failing
 * on a phone.
 */
export function scalableSizes(sizes: string): string {
  for (const entry of sizes.split(',')) {
    if (!/(?:^|\s)[\d.]+(?:px|rem|vw)\s*$/.test(entry)) {
      throw new Error(`images: sizes entry "${entry.trim()}" is not a plain px/rem/vw length`);
    }
  }
  return sizes;
}
