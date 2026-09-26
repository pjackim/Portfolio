/**
 * Build-time facts about local images that `ImageMetadata` doesn't carry, and the shared rules
 * that turn them into frame modes and responsive width candidates (home cards, case-study
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
  return { width, height, transparent: !isOpaque, digest };
}

/**
 * Width, height, transparency and digest of an imported local image. Reads the file through
 * Astro's private `fsPath` rather than the metadata fields, so the original file is not marked
 * as used outside the image pipeline (and copied into `dist/` unoptimized).
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
 * `srcset` widths for an image: the `steps` below the cap, then the cap itself — the source
 * width, or `max` for larger sources. Astro never upscales, so small sources stop at their
 * own width and still get their full-resolution file.
 */
export function candidateWidths(
  sourceWidth: number,
  max: number,
  steps: readonly number[] = [480, 800, 1200, 1600, 2000, 2400],
): number[] {
  const top = Math.min(sourceWidth, max);
  return [...steps.filter((w) => w < top), top];
}
