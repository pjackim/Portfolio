/**
 * Resolves the files that project media reference by convention (spec-architecture §4):
 * a video `./<name>.mp4` has siblings `<name>.webm` + `<name>.poster.webp`, and a YouTube
 * entry's poster is `yt-<id>.webp`, all in the project's folder.
 */
import type { ImageMetadata } from 'astro';

const videoUrls = import.meta.glob<string>('/src/content/projects/*/*.{mp4,webm}', {
  query: '?url',
  import: 'default',
  eager: true,
});

const images = import.meta.glob<{ default: ImageMetadata }>('/src/content/projects/*/*.webp', {
  eager: true,
});

export interface VideoSources {
  mp4: string;
  webm: string;
  poster: ImageMetadata;
}

const projectDir = (projectId: string) => `/src/content/projects/${projectId}/`;

function lookup<T>(files: Record<string, T>, path: string): T {
  const file = files[path];
  if (file === undefined) throw new Error(`media: missing file ${path}`);
  return file;
}

/** URLs of a video's mp4/webm and its poster image. `src` is the frontmatter `./<name>.mp4`. */
export function videoSources(projectId: string, src: string): VideoSources {
  const base = projectDir(projectId) + src.replace(/^\.\//, '').replace(/\.mp4$/, '');
  return {
    mp4: lookup(videoUrls, `${base}.mp4`),
    webm: lookup(videoUrls, `${base}.webm`),
    poster: lookup(images, `${base}.poster.webp`).default,
  };
}

/** The local poster (`yt-<id>.webp`) shown by the YouTube facade before any request. */
export function youtubePoster(projectId: string, ytId: string): ImageMetadata {
  return lookup(images, `${projectDir(projectId)}yt-${ytId}.webp`).default;
}
