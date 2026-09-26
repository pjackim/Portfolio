# Portfolio

Live: **<https://pjackim.github.io/Portfolio/>**

Parker Jackim's personal portfolio — a home page, a `/work/` index, and one case-study page
per project. Static site, no backend.

## Stack

Astro 7 (static output), TypeScript, plain CSS (design tokens, no framework), vanilla
`<script>`s for theme toggle / video / YouTube facade, Playwright for e2e + accessibility
tests, Lighthouse CI for performance/SEO budgets. No React/Vue/Svelte, no MDX, no ESLint.

## Quickstart

```sh
nvm use          # Node 24 (.nvmrc)
npm ci
npm run dev      # http://localhost:4321/Portfolio/
```

Other scripts: `npm run build` (type-check + build to `dist/`), `npm run preview`, `npm run
lint` (format + type-check + media lint), `npm run test:e2e` (Playwright), `npm run test:lhci`
(Lighthouse CI).

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

Case studies conventionally use `## Problem`, `## Approach`, `## What I built`,
`## Outcome & lessons` as body headings — omit any section the source material doesn't support.

## Frontmatter reference

Schema source of truth: `src/content.config.ts`. All content must come from facts already in
the repo (legacy site at commit `d8782d1`, the résumé PDF) — never invent accomplishments,
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
  scripts/{theme,video,youtube}.ts # the only hand-written client JS
  styles/{tokens,global,prose}.css
scripts/
  media/{build,check,migrate,lib}.ts   # media pipeline (npm run media / check:media / media:migrate)
  og/{render-default,render-icons,lib}.ts
  new-project.ts
tests/{smoke,a11y,links,redirects,media}.spec.ts
.github/workflows/{ci,deploy,links}.yml
```
