/**
 * Build-time facts about local images that `ImageMetadata` doesn't carry. Runs sharp on the
 * source file at build (and in dev); results are cached per file for the whole build.
 */
import type { ImageMetadata } from 'astro';
import sharp from 'sharp';

export interface ImageFacts {
  width: number;
  height: number;
  /** Some pixels are (partly) transparent — e.g. a render on an alpha background. */
  transparent: boolean;
}

const cache = new Map<string, Promise<ImageFacts>>();

async function inspect(path: string): Promise<ImageFacts> {
  const [{ width, height }, { isOpaque }] = await Promise.all([
    sharp(path).metadata(),
    sharp(path).stats(),
  ]);
  if (!width || !height) throw new Error(`images: cannot read dimensions of ${path}`);
  return { width, height, transparent: !isOpaque };
}

/**
 * Width, height and transparency of an imported local image. Reads the file through Astro's
 * private `fsPath` rather than the metadata fields, so the original file is not marked as
 * used outside the image pipeline (and copied into `dist/` unoptimized).
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
