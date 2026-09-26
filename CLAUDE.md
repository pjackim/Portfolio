# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Overview

Astro 7 static portfolio site, deployed to GitHub Pages at
`https://pjackim.github.io/Portfolio/`. One project collection (`src/content/projects/`), a
home page, a `/work/` index, and per-project case-study pages. No UI framework, no backend, no
CMS. Content is a mix of Markdown frontmatter/body and hand-authored copy in `src/data/`, all
sourced from the frozen legacy site (commit `d8782d1`) and the résumé PDF.

## Commands

- `npm ci` — install (Node ≥22.18 locally, 24 in CI; see `.nvmrc`)
- `npm run dev` — dev server at `http://localhost:4321/Portfolio/`
- `npm run build` — `astro check` + `astro build` → `dist/`; `npm run build:only` skips the
  type check
- `npm run lint` — `prettier --check .` + `astro check` + `check:media`; `npm run format` to
  autofix Prettier issues
- `npm run test:e2e` — Playwright (smoke, a11y, links, redirects, media specs) against a local
  preview of `dist/`; needs a build first
- `npm run test:lhci` — Lighthouse CI budgets (`lighthouserc.json`)
- `npm run new -- <slug>` — scaffold a project; `npm run media -- <files...> --project <slug>`
  — encode media into it; `npm run media:migrate` — one-time legacy media import; `npm run
check:media` — media lint (also part of `lint`)
- `npm run og` — regenerate `public/og-default.png`, favicon, and touch icon from
  `src/lib/monogram.ts`
- `npm run ci` — `lint` + `build:only` + `test:e2e`, the local approximation of the CI gate

## Architecture

- **Content collection** — `src/content.config.ts` defines the single `projects` collection: a
  `glob` loader over `src/content/projects/*/index.md` (folder name = id = slug = URL), Zod 4
  schema (imported from `astro/zod`, not `zod` directly). Query it only through
  `src/lib/projects.ts` (`getProjects`, `featured`, `archive`, `homeArchive`, `byGroup`,
  `prevNext`), which excludes drafts outside `astro dev` and throws at build time on duplicate
  `order` among featured projects, duplicate `legacyPaths`, or a featured count outside 3–8.
- **Layouts/components** — `src/layouts/BaseLayout.astro` is the document shell (head/SEO,
  theme bootstrap, fonts, skip link, header/footer, inline CSP hashing); `ProjectLayout.astro`
  is the case-study template built on it. `src/components/` holds page sections;
  `src/components/media/{MediaFigure,LoopVideo,YouTubeFacade}.astro` render the three media
  kinds.
- **`src/lib/` roles** — `url.ts` (`withBase`/`absoluteUrl`), `projects.ts` (collection
  queries), `media.ts` (resolves a video's `.webm`/`.poster.webp` siblings and YouTube posters
  via `import.meta.glob`), `legacy.ts` (`REMOVED_LEGACY` map for legacy pages with no project),
  `images.ts` (build-time image facts via sharp), `seo.ts` (OG images, JSON-LD), `csp.ts`
  (hashes hand-inlined scripts/styles for the CSP `<meta>`), `format.ts` (date/index display
  helpers), `page-style.ts` (per-instance CSS without inline `style=`, to keep the CSP free of
  `'unsafe-inline'`), `monogram.ts` (shared logo geometry; also imported by `scripts/og/`, so it
  stays import-free).
- **Data files** — `src/data/site.ts` (name, role, bio, experience — every line sourced with a
  comment back to the legacy file/line or the résumé) and `src/data/taxonomy.ts`
  (`CAPABILITIES`, `GROUPS`, and the six capability boxes on the home page).
- **Redirects** — `src/pages/html/Work/[legacy].html.ts` emits static meta-refresh stubs at the
  exact legacy URLs (`html/Work/<name>.html`) for every project's `legacyPaths`, plus
  `REMOVED_LEGACY` entries (e.g. `alvin` → `work/`). GitHub Pages can't send HTTP redirects, so
  these are real documents with a zero-delay `<meta http-equiv="refresh">`, a visible fallback
  link, and `noindex`.
- **Scripts** — `scripts/media/{build,check,migrate,lib}.ts` (the media pipeline; runs on
  Node's native TypeScript type-stripping, so erasable syntax only — no enums/namespaces/param
  properties) and `scripts/new-project.ts` (project scaffolding). `scripts/og/` renders the OG
  card and icons from the shared monogram geometry.
- **Client JS** — exactly four hand-written scripts: `src/scripts/{theme,video,youtube}.ts`
  (theme bootstrap/toggle, loop video controller, YouTube facade) plus Astro's built-in hover
  prefetch. No other client-side JS budget exists; keep total JS ≤30 KB/page.

## Conventions & gotchas

- **No raw `href="/…"` or `src="/…"` in `src/`.** Always go through `withBase()`
  (`src/lib/url.ts`). `base` is `/Portfolio` — case-sensitive; `/portfolio/` 404s.
- **Never paste legacy HTML.** Astro 7's Rust compiler rejects invalid/unclosed nesting (the
  legacy `credential_correlation.html` has broken nesting) — port legacy **text** only, into
  clean Astro/Markdown markup.
- **Media only via the pipeline.** Never hand-encode or commit a raw image/video export — run
  `npm run media -- <files> --project <slug>` (or `media:migrate` for the legacy batch).
  Filenames are kebab-case; only WebP images and MP4+WebM+poster videos are allowed under
  `src/content`; size budgets are enforced by `check:media` (spec-architecture.md §5).
- **Content is fact-only.** Everything in `src/data/site.ts`, `src/data/taxonomy.ts`, and every
  project's frontmatter/body must trace to the legacy site (`git show d8782d1:<path>`) or the
  résumé PDF. Never invent accomplishments, metrics, employers, dates, skills, or links; omit
  what isn't stated.
- **No UI framework, no `<ClientRouter/>`, no Markdown plugins.** View transitions are native
  cross-document CSS only; Markdown renders through Astro's default processor (Shiki syntax
  highlighting is disabled here — see `astro.config.ts` — because the CSP forbids the inline
  style attributes it would emit).
- **TypeScript is pinned `~6`** (not `^`) — `@astrojs/check` only supports 5–6; a bare `npm i
typescript` would pick up 7.x. Dependabot is configured to ignore major bumps of `typescript`
  and `@types/node` for the same reason.
- **The legacy site is fully recoverable** at commit `d8782d1` (`git show d8782d1:<path>`, or
  `git archive d8782d1 <path> | tar -x -C .cache/legacy`) if you need to check original copy,
  images, or markup.
- **`gh` defaults to the upstream fork.** This repo's `origin`/default remote resolves to
  `j4ck1m/Portfolio`, not `pjackim/Portfolio` — pass `--repo pjackim/Portfolio` on every `gh`
  command. Never push from here; every change lands as a commit for the human to push/PR.
- **Verify web changes live before calling them done.** Use the Chrome browser tools (or
  `npm run preview` + a manual check) to load the actual page and confirm the change renders
  as expected — a passing build/type-check is not sufficient proof for UI work.
