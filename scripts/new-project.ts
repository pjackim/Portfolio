/**
 * Scaffold a new project entry.
 *
 *   npm run new -- <slug>
 *
 * Writes src/content/projects/<slug>/index.md with a commented frontmatter template covering
 * every schema field (spec-architecture §4) and `draft: true`, plus a project body
 * skeleton. Refuses to overwrite an existing index.md. Add media afterwards with
 * `npm run media -- <files...> --project <slug>`.
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ROOT = resolve(import.meta.dirname, '..');

function die(message: string): never {
  console.error(`✖ ${message}\nusage: npm run new -- <kebab-case-slug>`);
  process.exit(1);
}

const [slug, ...rest] = process.argv.slice(2);
if (!slug) die('missing <slug>');
if (rest.length > 0) die(`unexpected arguments: ${rest.join(' ')}`);
if (!SLUG.test(slug)) die(`"${slug}" is not a kebab-case slug (a-z, 0-9, single hyphens)`);

const dir = join(ROOT, 'src/content/projects', slug);
const file = join(dir, 'index.md');
if (existsSync(file)) die(`${file.slice(ROOT.length + 1)} already exists — refusing to overwrite`);

const year = new Date().getFullYear();
const template = `---
# ── Required ────────────────────────────────────────────────────────────────
title: 'TODO project title' # 2–60 chars
summary: 'TODO one or two sentences: card text and meta description.' # 20–180 chars
year: ${year} # integer 2010–2100
group: software # security | software | design
capabilities: [engineering-practice] # 1–4 ids from src/data/taxonomy.ts
stack: [TODO] # 1–8 short entries, e.g. [TypeScript, Astro]
cover: ./cover.webp # image in this folder (npm run media -- <file> --project ${slug})
coverAlt: 'TODO describe the cover image' # ≥ 8 chars

# ── Optional ────────────────────────────────────────────────────────────────
# role: 'TODO' # ≤ 80 chars — omit unless the source states it
# period: 'Fall ${year}' # ≤ 40 chars display string, e.g. "c. 2016"
# coverPosition: 'center top' # CSS object-position for the cover crop
featured: false # featured projects need ≥ 2 highlights
order: 100 # sort key among featured projects (unique)
showOnHome: false # archive projects only: list on the home page
draft: true # hidden from production builds until set to false
highlights: [] # ≤ 5 strings, ≤ 160 chars each
media: []
# media:
#   - kind: image
#     src: ./screenshot.webp
#     alt: 'What the image shows (≥ 8 chars)'
#     caption: 'Optional interpretation'
#     wide: false
#   - kind: video # needs ./demo.webm + ./demo.poster.webp siblings
#     src: ./demo.mp4
#     alt: 'What the clip shows'
#     autoplay: true # false → click-to-play, no loop
#   - kind: youtube # needs ./yt-<id>.webp (npm run media -- --youtube <id> --project ${slug})
#     id: 'XXXXXXXXXXX'
#     title: 'Video title'
#     start: 0
links: {}
# links:
#   repo: https://github.com/…
#   demo: https://…
#   video: https://…
legacyPaths: [] # e.g. ['html/Work/old_page.html'] — only for pages that existed on the old site
---

<!-- Featured projects use the four sections below; omit a section with no source.
     Archive entries can be one or two short paragraphs instead. -->

## Problem

TODO

## Approach

TODO

## What I built

TODO

## Outcome & lessons

TODO
`;

await mkdir(dir, { recursive: true });
await writeFile(file, template);
console.log(`✔ created ${file.slice(ROOT.length + 1)} (draft: true)`);
console.log(`  next: npm run media -- <files...> --project ${slug}`);
