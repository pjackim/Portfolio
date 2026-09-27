# Portfolio

Live: **<https://pjackim.github.io/Portfolio/>**

Parker Jackim's personal portfolio — a home page, a `/work/` index, and one case-study page
per project. Static site, no backend.

## Goals

**Design for a fast, lazy scanner.** Assume visitors give the site a few seconds, read very
little prose, and don't click. What matters has to be visible at a glance: a real picture of
each project with a 2–3 sentence summary, short informative headings, key facts pulled out as
highlights and tags, and the full case study one click away for anyone who wants depth. The research behind this is in
[`docs/design-research/`](docs/design-research/README.md).

In priority order (when they pull against each other, the higher one wins):

1. **Showcase Parker's work and who he is**
   - His projects, his history, and the depth of his abilities, shown through real work
     (images, loops, outcomes) rather than claimed.
   - Strongest work first and biggest. Case studies open with a scannable summary before the
     narrative.
   - All content stays fact-only (see [Frontmatter reference](#frontmatter-reference)).
2. **A modern, professional, satisfying, interactive experience**
   - The hero sets the bar: polished and credible, but alive and rewarding to explore.
   - Motion points at the work (in-view loops, card hover/focus feedback, scroll reveals) and
     never costs accessibility (WCAG 2.2 AA, reduced motion) or performance (the Lighthouse
     budgets below).
3. **Easy to recognise and contact**
   - A consistent identity: profile photo, monogram, and name.
   - Every contact channel Parker publishes (email, GitHub, LinkedIn, résumé, …) is one
     zero-friction step away from any page. Contact details live in `src/data/site.ts`.

## Stack

Astro 7 (static output), TypeScript, plain CSS (design tokens, no framework), hand-written
vanilla client modules in `src/scripts/` (hero, motion, theme, video, YouTube facade,
lightbox, work filter, …; ≤30 KB JS per page), Playwright for e2e + accessibility tests,
Lighthouse CI for performance/SEO budgets. No React/Vue/Svelte, no MDX, no ESLint.

## Quickstart

```sh
nvm use          # Node 24 (.nvmrc)
npm ci
npm run dev      # http://localhost:4321/Portfolio/
```

Other scripts: `npm run build` (type-check + build to `dist/`), `npm run preview`, `npm run
lint` (format + type-check + media lint), `npm run test:e2e` (Playwright), `npm run test:lhci`
(Lighthouse CI), `npm run clean` (delete build/cache/test output; `-- --all` also removes
`node_modules`).

VS Code: `.vscode/tasks.json` wraps these as tasks (**Tasks: Run Task**) — dev server on the LAN
with hot reload, `Ctrl+Shift+B` to build, the default test task runs the full CI sequence
(format → media → types → build → e2e → Lighthouse), plus clean/reinstall, Playwright UI, and
content scaffolding.

## Add a project

1. `npm run new -- <slug>` — scaffolds `src/content/projects/<slug>/index.md` with a commented
   frontmatter template and `draft: true`.
2. `npm run media -- <files...> --project <slug> [--lossless] [--loop|--click] [--speed N]` —
   encodes images/video into that folder and prints a ready-to-paste `media:` YAML block. For a
   YouTube embed instead: `npm run media -- --youtube <id> --project <slug>` (fetches the
   poster).
3. Fill in the frontmatter (see the field reference below) and the Markdown body, then set
   `draft: false`.
4. `npm run lint && npm run build` locally, then open a PR against `master`.

Drafts are still schema-validated at build — `draft: true` only hides a project outside
`astro dev`, it doesn't skip validation. A draft needs a valid `cover` and every media file its
frontmatter references, or the build fails; run step 2 to add that project's media before the
next `npm run build`.

Case studies conventionally use `## Problem`, `## Approach`, `## What I built`,
`## Outcome & lessons` as body headings — omit any section the source material doesn't support.

## Frontmatter reference

Schema source of truth: `src/content.config.ts`. All content must come from facts already in
the repo (legacy site at commit `d8782d1`, the résumé PDF) or Parker himself — never invent accomplishments,
metrics, employers, dates, or links.

| Field                             | Type                                                                   | Notes                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `title`                           | string, 2–60                                                           |                                                                                        |
| `summary`                         | string, 20–180                                                         | Card text and meta description                                                         |
| `role`                            | string, ≤80, optional                                                  | Omit when the repo doesn't state it                                                    |
| `year`                            | int, 2010–2100                                                         |                                                                                        |
| `period`                          | string, ≤40, optional                                                  | Display string shown instead of `year`, e.g. `"Fall 2021"`, `"c. 2016"`                |
| `group`                           | `security` \| `software` \| `design`                                   | Which `/work/` section                                                                 |
| `featured`                        | boolean, default `false`                                               | Shown on the home page                                                                 |
| `order`                           | int, default `100`                                                     | Sort key among featured projects; must be unique                                       |
| `showOnHome`                      | boolean, default `false`                                               | Archive projects only — also list on the home page                                     |
| `draft`                           | boolean, default `false`                                               | Hidden outside `astro dev` until `false`                                               |
| `capabilities`                    | 1–4 of the enum in `src/data/taxonomy.ts`                              |                                                                                        |
| `stack`                           | 1–8 strings                                                            |                                                                                        |
| `highlights`                      | ≤5 strings, ≤160 each                                                  | Featured projects need ≥2                                                              |
| `cover`                           | image path                                                             | `image()` — resolved by Astro's asset pipeline                                         |
| `coverAlt`                        | string, ≥8                                                             |                                                                                        |
| `coverPosition`                   | string, optional                                                       | CSS `object-position` for the cover crop                                               |
| `media[].kind: image`             | `src`, `alt` (≥8), `caption?`, `wide` (default `false`)                |                                                                                        |
| `media[].kind: video`             | `src: ./name.mp4`, `alt` (≥8), `caption?`, `autoplay` (default `true`) | Needs sibling `.webm` + `.poster.webp`; `autoplay:false` → click-to-play with controls |
| `media[].kind: youtube`           | `id` (11 chars), `title` (≥4), `caption?`, `start?`                    | Needs sibling `yt-<id>.webp` poster                                                    |
| `links.repo` / `.demo` / `.video` | URL, all optional                                                      |                                                                                        |
| `legacyPaths`                     | array of `html/Work/<name>.html`                                       | Drives the redirect stubs for that project                                             |

## Media rules

- Images → WebP; videos → MP4 (H.264) + WebM (VP9) + a `.poster.webp`. No GIF/PNG/JPEG under
  `src/content`.
- Filenames are kebab-case: `^[a-z0-9]+(-[a-z0-9]+)*(\.poster)?\.(webp|mp4|webm)$`. YouTube
  posters are `yt-<id>.webp` (the id keeps its case).
- Budgets: autoplaying loops (≤45s) ≤2.5 MB (mp4) / ≤1.5 MB (webm); click-to-play ≤8 MB / ≤5 MB;
  no tracked file >8 MB; ≤15 MB per project folder; ≤60 MB total under `src/content`.
- Everything is produced by `npm run media` (or `npm run media:migrate` for the one-time legacy
  import) — never hand-encode or commit a raw export. `npm run check:media` (part of `npm run
lint`, and run in CI) enforces naming, sibling files, budgets, and rejects EXIF/XMP/IPTC
  metadata in WebP.

## Quality gates

- **`npm run lint`** — `prettier --check .`, `astro check` (types), `check:media` (media
  naming/budgets/references).
- **`npm run test:e2e`** (Playwright, against a local preview of `dist/`) — smoke (every page
  loads, one `h1`, metadata, no console/CSP errors), accessibility (axe, WCAG 2.2 AA, light +
  dark, reduced motion), links (every internal link/asset resolves under `/Portfolio/`, hash
  targets exist), redirects (legacy `html/Work/*.html` → new URLs, résumé PDF), media (loop
  autoplay/pause/reduced-motion behaviour, YouTube facade loads nothing until clicked).
- **`npm run test:lhci`** (Lighthouse CI, `lighthouserc.json`) — performance ≥0.95,
  accessibility/SEO =1, best-practices ≥0.95, zero third-party requests, JS/font size caps, CLS
  ≤0.02, LCP ≤2000ms, plus page-weight budgets for the home page and case studies.

All three run in `.github/workflows/ci.yml` on every PR to `master` (Lighthouse only on PRs);
`npm run ci` runs the non-Lighthouse subset locally.

## Deploy

Push or merge to `master` → **Actions** → `Deploy` builds, publishes to Pages, and smoke-tests
the live URL (`.github/workflows/deploy.yml`). The repo's Pages source must be set to **GitHub
Actions** (Settings → Pages), not "Deploy from a branch".

Rollback: `git revert -m 1 <merge-commit>` on `master` redeploys the legacy site only if the
Pages-passthrough workflow (PR A) was merged to `master` first — the revert then restores that
commit's `deploy.yml` and the Pages source stays "GitHub Actions". Otherwise, revert and then
switch the repo's Pages source back to "Deploy from a branch: master /".

`gh` in this repo defaults to the upstream `j4ck1m/Portfolio`, not this fork — pass
`--repo pjackim/Portfolio` on every `gh` command, e.g. `gh run list --repo pjackim/Portfolio`.

## Project structure

```
astro.config.ts  playwright.config.ts  lighthouserc.json  .nvmrc
src/
  content.config.ts        # the `projects` collection schema
  content/projects/<slug>/ # index.md + cover.webp + media
  data/{site.ts,taxonomy.ts}       # site copy, capability/group taxonomy
  lib/{url,projects,media,seo,csp,legacy,...}.ts
  layouts/{BaseLayout,ProjectLayout}.astro
  components/                     # + components/media/*
  pages/{index,404,work/index,work/[slug]}.astro
  assets/profile/                 # profile photo (contact section)
  scripts/*.ts                    # hand-written client JS (hero, motion, theme, media, …)
  styles/{tokens,global,prose,lightbox,reticle}.css
scripts/
  media/{build,check,migrate,lib}.ts   # media pipeline (npm run media / check:media / media:migrate)
  og/{render-default,render-icons,lib}.ts
  new-project.ts
tests/{smoke,a11y,links,redirects,media}.spec.ts
docs/design-research/   # distilled UX research behind the Goals (scanning, cards, disclosure, grids)
.github/workflows/{ci,deploy,links}.yml
```
