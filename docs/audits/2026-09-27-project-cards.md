# Audit: project cards (2026-09-27)

**Scope:** home §03 Selected work: `ProjectCard.astro`, `ProjectGrid.astro`,
`src/scripts/interactions.ts`, `src/styles/reticle.css`, featured frontmatter (summaries and
covers). Checks G2 G3 G5 G6 G7 S1–S5 C1–C7 A1–A7 X1–X2, plus X8 (repo-wide).
**Branch / commit audited:** `audit/2026-09-27-project-cards` @ `2f140eb`
**Evidence:** `.cache/captures/audit-2026-09-27-project-cards/` (gitignored). Regenerate with
`node .claude/skills/audit-portfolio/scripts/capture.ts --base http://localhost:<port>/Portfolio/ --pages "" --motion both --out <dir>`.
**Previous audit:** none

## Summary

The cards already meet the scan-first core: every featured project shows a real cover, a
fact-first 2–3 sentence summary, and tags, through a single stretched link with matching hover
and focus. They also read as the same instrument as the hero. The biggest gap is hierarchy: six
equal cells give the lead project no more weight than the sixth, and the #2 slot's cover is
mostly empty black. Outside the focus, `npm run lint` fails on vendored skill files, which
will break CI on the next push.

| Severity | Count |
| -------- | ----- |
| P0       | 1     |
| P1       | 2     |
| P2       | 1     |
| P3       | 2     |

## Checks run

| Check                                                     | Result                                                               |
| --------------------------------------------------------- | -------------------------------------------------------------------- |
| `npm run lint`                                            | **fail**: Prettier, 13 files under `.claude/skills/` (see F1)        |
| `tests/a11y.spec.ts`, `interactions`, `motion` (chromium) | pass (101 tests)                                                     |
| Capture flags (`manifest.json`, 16 views)                 | none: no overflow, 0 third-party requests, no console errors         |
| Chrome pass (1280, dark)                                  | hover lock-on and focus ring correct; 1 link per card; console clean |

## Findings

| ID  | Sev | Checks | Title                                                         | Where                                | Fix class | Status          |
| --- | --- | ------ | ------------------------------------------------------------- | ------------------------------------ | --------- | --------------- |
| F1  | P0  | X8     | `npm run lint` fails on vendored design skills                | `.claude/skills/*` (13 files)        | M         | fixed (35ac92f) |
| F2  | P1  | G3, C6 | Featured grid is a uniform 2×3; the lead project isn't bigger | `ProjectGrid.astro`                  | J         | skipped         |
| F3  | P1  | G2, G3 | Mordhau cover in slot #2 is mostly empty black                | `src/content/projects/mordhau/`      | J         | skipped         |
| F4  | P2  | A4     | Reticle timings are literals (160/50/90/700ms, ad-hoc curve)  | `ProjectCard.astro`                  | J         | fixed (135efad) |
| F5  | P3  | A7     | No press (`:active`) feedback on the card link                | `ProjectCard.astro`                  | J         | fixed (135efad) |
| F6  | P3  | C3, S4 | Card summary `font-size: 0.9375rem` is off the type scale     | `ProjectCard.astro` `.card__summary` | M         | fixed (50ba32e) |

### F1: `npm run lint` fails on vendored design skills

- **Evidence:** `npx prettier --check .` warns on 13 files: the installed taste-skill family
  (`brandkit`, `design-taste-frontend`, `full-output-enforcement`, `gpt-taste`,
  `high-end-visual-design`, `industrial-brutalist-ui`, `minimalist-ui`,
  `redesign-existing-projects`, `stitch-design-taste`), `prototype/{LOGIC,UI}.md`, and
  `codebase-memory/reference.md`. CI runs `npm run format:check` (`.github/workflows/ci.yml:37`),
  and these commits aren't on `origin/main` yet.
- **Rule:** X8. CI gates must pass.
- **Fix:** add the vendored skill directories to `.prettierignore`. Reformatting them instead
  would drift them from `skills-lock.json` upstream.
- **Files:** `.prettierignore`

### F2: Featured grid is a uniform 2×3

- **Evidence:** `home__1280__{light,dark}__full.png`: all six cards are the same size. The only
  span variation in `ProjectGrid.astro:29` is the odd-last-card rule, which never fires with six
  featured projects. `order: 1` (Credential Correlation) gets no extra weight.
- **Rule:** G3; [bento-grid.md](../design-research/bento-grid.md) ("all-equal cells defeat the
  pattern"), which names this as the natural next step.
- **Fix:** derive cell size from `order` (lead cell larger), designed for every featured count
  from 3 to 8. This is a layout decision, so run `/design-portfolio`.
- **Files:** `ProjectGrid.astro`, `ProjectCard.astro`

### F3: Mordhau cover is mostly empty black

- **Evidence:** `home__1280__{light,dark}__full.png`, card 2: three slider rows fill the top
  fifth, and the rest of the frame is black. In dark mode it merges into the page. The project
  already has `gameplay-toggles.webp`.
- **Rule:** G2 (the image should show what was built at a glance) and G3.
- **Also:** `check:media` warns the cover is only 514px wide (< 1200).
- **Fix:** pick a cover that shows the effect (a crop or another frame through
  `npm run media`), or set a `coverPosition`. Parker's call on which image represents the work.
- **Files:** `src/content/projects/mordhau/index.md`, cover media

### F4: Reticle timings are literals

- **Evidence:** `ProjectCard.astro` motion block: `opacity 160ms`, `scale 160ms`, delays
  `50ms`/`90ms`, scan `animation-duration: 700ms` with
  `cubic-bezier(0.45, 0, 0.25, 1)`; `tokens.css` defines only 140/220/320ms and two curves.
- **Rule:** A4, C3.
- **Fix:** map the snap to `--dur-fast`, and add named tokens for the beat delay and the scan
  sweep (or the curve) so the reticle's timing is shared with the lightbox's lock-on. The exact
  values are a judgement call about the approved feel.
- **Files:** `ProjectCard.astro`, `tokens.css`, possibly `lightbox.css`

### F5: No press feedback

- **Evidence:** no `:active` rule in `src/components`, `src/styles`, or `src/scripts`. The
  largest target on the page never acknowledges a tap (touch gets no hover state either).
- **Rule:** A7.
- **Fix:** a short `:active` state on `.card` (e.g. border to `--line-ui` and the brackets at
  full opacity for `--dur-fast`), behind the motion gate for any movement.
- **Files:** `ProjectCard.astro`

### F6: Card summary off the type scale

- **Evidence:** `.card__summary { font-size: 0.9375rem; line-height: 1.6 }`. Body is `--step-0`
  (1–1.0625rem).
- **Rule:** C3, C4 (body ≥ 1rem).
- **Fix:** `font-size: var(--step-0)`. This raises the summary about 1px, so recheck the card
  height and the subgrid rows at 800–1280px afterwards.
- **Files:** `ProjectCard.astro`

## What's working (keep it)

- A real cover, a fact-first summary, and tags on every card; it lands without a click (G2).
- One stretched link per card; hover and keyboard focus mirror each other (reticle, scan,
  "Open project", accent title) (G5, G6). Verified in Chrome.
- The reticle HUD is built on the shared `.reticle` class and tokens, gated behind reduced
  motion and the toggle, with faint brackets at rest on touch.
- Radii only `--radius-xs`/`--radius-s`, no shadows or glass, no raw colours, mono only for
  meta. On-profile in both themes.
- Clean single column at 390, with no overflow at any width.

## Rejected on verification

- "Parker's face first appears at the bottom of the home page": real (the photo appears only in
  §05 Contact), but it's outside the card focus. Raise it in an identity/hero audit (G8).
