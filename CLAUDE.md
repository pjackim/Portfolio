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

- `npm ci` — install (Node ≥22.18 locally, 24 in CI; see `.nvmrc`). npm is the package manager
  (`package-lock.json`); a stray `bun.lock` is not part of the project
- `npm run dev` — dev server at `http://localhost:4321/Portfolio/`
- `npm run build` — `astro check` + `astro build` → `dist/`; `npm run build:only` skips the
  type check
- `npm run lint` — `prettier --check .` + `astro check` + `check:media`; `npm run format` to
  autofix Prettier issues
- `npm run test:e2e` — Playwright specs in `tests/` (chromium, mobile-chrome, webkit projects)
  against `astro preview` of `dist/`; run `npm run build:only` first. Browsers: `npx playwright
install chromium webkit`. Single spec/project: `npx playwright test tests/smoke.spec.ts
--project=chromium` (add `-g "<title>"` to filter). `BASE_URL=<url> npx playwright test
--grep @prod` runs the post-deploy subset against a live site without a local server
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
- **Client JS** — hand-written modules in `src/scripts/` (theme, motion/motion-toggle,
  video, youtube, lightbox, work-filter, hero, case-index, etc.), each imported by the
  component that needs it, plus Astro's built-in hover prefetch. Motion is user-toggleable
  (`data-motion="off"` on `<html>`, persisted in `localStorage`) on top of
  `prefers-reduced-motion`. Script budget is 30 KB/page, enforced by `lighthouserc.json`.
- **Build info** — `src/lib/build-info.ts` derives the footer year from `SOURCE_DATE_EPOCH` or
  HEAD's commit date (not wall clock), so builds are byte-reproducible; don't introduce
  `new Date()` into rendered output.
- **CI** — `.github/workflows/ci.yml` (format, media, check, build, e2e, LHCI),
  `deploy.yml` (Pages deploy, then `@prod` Playwright against the live URL), `links.yml`
  (weekly link check).

## Conventions & gotchas

- **No raw `href="/…"` or `src="/…"` in `src/`.** Always go through `withBase()`
  (`src/lib/url.ts`). `base` is `/Portfolio` — case-sensitive; `/portfolio/` 404s.
- **Never paste legacy HTML.** Astro 7's Rust compiler rejects invalid/unclosed nesting (the
  legacy `credential_correlation.html` has broken nesting) — port legacy **text** only, into
  clean Astro/Markdown markup.
- **Media only via the pipeline.** Never hand-encode or commit a raw image/video export — run
  `npm run media -- <files> --project <slug>` (or `media:migrate` for the legacy batch).
  Filenames are kebab-case; only WebP images and MP4+WebM+poster videos are allowed under
  `src/content`; size budgets are enforced by `check:media` (`scripts/media/check.ts`).
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
- **Never push from here.** Every change lands as a commit for the human to push/PR. GitHub
  access otherwise goes through `gh` — see [GitHub: use the `gh` CLI](#github-use-the-gh-cli).
- **Verify web changes live before calling them done.** Use the Chrome browser tools (or
  `npm run preview` + a manual check) to load the actual page and confirm the change renders
  as expected — a passing build/type-check is not sufficient proof for UI work.

## GitHub: use the `gh` CLI

Default to `gh` for anything GitHub — issues, PRs, CI runs/logs, releases, Pages, repo
settings, raw API calls — rather than the GitHub MCP connector, web fetches of github.com, or
guessing from memory. When unsure of a command or flag, check `gh help <command>` (e.g. `gh
help run`, `gh pr view --help`, `gh help environment`) or the manual at
<https://cli.github.com/manual>.

- **Act as `pjackim`.** This machine has two `gh` accounts logged in (`pjackim`, `mort-sh`).
  Confirm with `gh auth status` that `pjackim` is active; if it isn't, scope the token per
  command (`GH_TOKEN=$(gh auth token --user pjackim) gh …`) instead of running `gh auth
switch`, which changes global state other sessions and terminals rely on.
- **Always target `pjackim/Portfolio`.** Git's `origin` is `pjackim/Portfolio`, but that repo
  is a fork of `j4ck1m/Portfolio`, and `gh` resolves its default repository to the parent
  (the `upstream` remote; `gh repo set-default --view` prints `j4ck1m/Portfolio`). Pass
  `--repo pjackim/Portfolio` (or `-R`) on every repo-scoped command, or `GH_REPO=pjackim/Portfolio`
  for a batch; for `gh api`, spell the path out (`repos/pjackim/Portfolio/...`).
- **Useful here:** `gh run list/view/watch --log-failed` for CI and deploy failures (`ci.yml`,
  `deploy.yml`, `links.yml`); `gh pr` / `gh issue` for tracking work; `gh api` for anything
  without a dedicated subcommand (e.g. `repos/pjackim/Portfolio/pages`).
- **Read freely, write with care.** Read-only commands (`list`, `view`, `status`, `api` GETs)
  need no confirmation. Anything visible to others — creating/commenting on/closing issues or
  PRs, re-running or cancelling workflows, editing repo settings — needs the human's go-ahead
  first, and pushing stays off-limits (see above).

## Code discovery: `codebase-memory-mcp`

The repo is indexed in `codebase-memory-mcp` (user-scoped server; project name
`C-Users-m0rt-projects-Portfolio`). Prefer its graph tools for finding and tracing code:
`search_graph` (by `name_pattern` or `query`), `trace_path` (callers/callees),
`get_code_snippet`, `query_graph` (Cypher), `get_architecture`. Reach for Grep/Glob for
string literals, config values, and non-code files.

- **Coverage is partial.** Only `.ts` (`src/lib/`, `src/scripts/`, `scripts/`, `tests/`),
  CSS, YAML and TOML are parsed into symbols. `.astro` files are File/Module nodes with no
  edges, and Markdown content isn't parsed — so `trace_path`/`in_degree` **undercount**
  callers of anything used from components or layouts (e.g. `withBase` shows 2 callers). For
  "who uses X", combine the graph with `Grep` over `src/**/*.astro`.
- **Keep it fresh.** The index doesn't auto-update. After pulling or switching branches, or
  before relying on call graphs, run `index_repository` with `repo_path` set to the repo
  root (`mode: "full"`); `detect_changes` shows what moved since a ref. A worktree needs its
  own index (its path becomes a separate project name).

<!-- BEGIN:worktrunk-worktree-policy -->

## Git worktrees: use `wt` (worktrunk), not `git worktree`

This project uses worktrunk (`wt`) for all worktree work: isolated branches, parallel agents, checking out a PR without disturbing the current checkout, and cleaning up merged branches.

**Never use raw `git worktree` commands or EnterWorktree/ExitWorktree.** Agent `isolation: "worktree"` is fine only because the worktrunk plugin routes it through `wt`.

- New isolated task: `wt switch --create <branch>` (or `/wt-switch-create <branch> -- <task>`)
- See state: `wt list`
- Finish: `wt merge` (not manual `git merge` → `git branch -d` → `git worktree remove`)
- Discard: `wt remove`
- Stale 🤖/💬 marker: `wt config state marker clear`

Project hooks live in `.config/wt.toml`.

<!-- END:worktrunk-worktree-policy -->
