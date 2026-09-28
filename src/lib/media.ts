/**
 * Resolves the files that project media reference by convention (spec-architecture §4):
 * a video `./<name>.mp4` has siblings `<name>.webm` + `<name>.poster.webp`, and a YouTube
 * entry's poster is `yt-<id>.webp`, all in the project's folder.
 */
import type { ImageMetadata } from 'astro';
import { imageFacts } from './images';
import type { Project } from './projects';

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

export type MediaItem = Project['data']['media'][number];
export type YouTubeItem = Extract<MediaItem, { kind: 'youtube' }>;

/**
 * The YouTube entry whose poster is the project's cover (Ruling R21), if any — the case study
 * then shows that video's facade as its hero and leaves the entry out of the figure gallery,
 * so the same frame never appears twice. Covers are `cover.webp` copies of the poster, so
 * the match is by file content, not name.
 */
export async function coverYouTube(project: Project): Promise<YouTubeItem | undefined> {
  const cover = await imageFacts(project.data.cover);
  for (const item of project.data.media) {
    if (item.kind !== 'youtube') continue;
    const poster = await imageFacts(youtubePoster(project.id, item.id));
    if (poster.digest === cover.digest) return item;
  }
  return undefined;
}
