/**
 * Content model (spec-architecture §4). One collection: `projects`, one folder per project:
 * `src/content/projects/<slug>/index.md` + its media. Folder name = id = slug = URL.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CAPABILITIES, GROUPS } from './data/taxonomy';

const KEBAB_MP4 = /^\.\/[a-z0-9]+(-[a-z0-9]+)*\.mp4$/;
const YOUTUBE_ID = /^[\w-]{11}$/;
/** A paired paragraph's key: the body's `<div data-pair="…">` and the media's `pair`. */
const PAIR_KEY = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const pair = z
  .string()
  .regex(PAIR_KEY)
  .optional()
  .describe('Shown beside the body paragraph marked `<div data-pair="key">`, not under Figures.');
const LEGACY_PATH = /^html\/Work\/[a-z_]+\.html$/;

const projects = defineCollection({
  loader: glob({
    base: './src/content/projects',
    pattern: '*/index.md',
    generateId: ({ entry }) => entry.split('/')[0]!,
  }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().min(2).max(60),
        /** Card text and meta description. */
        summary: z.string().min(20).max(180),
        /** The BLUF, shown first on the project page: what it is, in 1 to 4 plain sentences. */
        tldr: z.string().min(40).max(420),
        /** Omit when the repo doesn't state it. */
        role: z.string().max(80).optional(),
        year: z.number().int().min(2010).max(2100),
        /** Display string, e.g. "Fall 2021", "c. 2016". Shown instead of `year` when set. */
        period: z.string().max(40).optional(),
        group: z.enum(GROUPS),
        featured: z.boolean().default(false),
        /** Sort key among featured projects (unique). */
        order: z.number().int().default(100),
        /** Archive projects only: list on the home page. */
        showOnHome: z.boolean().default(false),
        draft: z.boolean().default(false),
        capabilities: z.array(z.enum(CAPABILITIES)).min(1).max(4),
        stack: z.array(z.string()).min(1).max(8),
        highlights: z.array(z.string().max(160)).max(5).default([]),
        cover: image(),
        coverAlt: z.string().min(8),
        /** CSS object-position for the cover crop. */
        coverPosition: z.string().optional(),
        media: z
          .array(
            z.discriminatedUnion('kind', [
              z.object({
                kind: z.literal('image'),
                src: image(),
                alt: z.string().min(8),
                caption: z.string().optional(),
                wide: z.boolean().default(false),
                pair,
              }),
              z.object({
                kind: z.literal('video'),
                /** Siblings `<name>.webm` + `<name>.poster.webp` by convention. */
                src: z.string().regex(KEBAB_MP4),
                alt: z.string().min(8),
                caption: z.string().optional(),
                /** false → click-to-play (the Play chip, no loop), preload none. */
                autoplay: z.boolean().default(true),
                pair,
              }),
              z.object({
                kind: z.literal('youtube'),
                /** Poster `./yt-<id>.webp` by convention. */
                id: z.string().regex(YOUTUBE_ID),
                title: z.string().min(4),
                caption: z.string().optional(),
                start: z.number().int().min(0).optional(),
                pair,
              }),
            ]),
          )
          .default([]),
        links: z
          .object({
            repo: z.url().optional(),
            demo: z.url().optional(),
            video: z.url().optional(),
            /** Kinds that exist but aren't public — shown as a disabled "private" label. */
            private: z.array(z.enum(['repo', 'demo', 'video'])).default([]),
          })
          .default({ private: [] }),
        legacyPaths: z.array(z.string().regex(LEGACY_PATH)).default([]),
      })
      .refine(
        (d) => !d.featured || d.highlights.length >= 2,
        'featured projects need ≥2 highlights',
      ),
});

export const collections = { projects };
