---
name: audit-portfolio
description: Audit Parker Jackim's portfolio site (this Astro repo) against its design goals, the review checklist, and its operator-console style, using live Chrome testing, screenshots, the test suite, and parallel reviewer subagents, and write a report to docs/audits/ with a screenshot and a proposed solution for every issue. Changes no code by default. `/audit-portfolio fix` implements the solutions from the latest report without prompting. Use whenever the user asks to audit, review, QA, sanity-check, or grade the portfolio or one part of it (a page, section, component, or topic such as motion, contact, accessibility, mobile), asks whether something is on-brand or consistent with the site, or asks to apply or fix an audit's findings.
argument-hint: '[focus topic or feature] | fix [report path or focus]'
---

# /audit-portfolio

Two modes, chosen by the first word of `$ARGUMENTS`:

- **Audit (default):** `/audit-portfolio [focus]` tests the site live, documents every issue with
  a screenshot and a concrete proposed solution in `docs/audits/`, and **changes no code**.
- **Fix:** `/audit-portfolio fix [report path or focus]` implements the solution for every open
  issue in a report, **without prompting**, then stages a merge for review.

The rubric is `docs/design/review-checklist.md`, the identity is `docs/identity/site-style.md`
(plus the rest of `docs/identity/`), and the goals and constraints are in `CLAUDE.md`. Procedures
shared with `/design-portfolio` (worktree, servers, verification, staged merge) are in
`references/verify-and-land.md`. The report format is `references/report-template.md`.

---

## Audit mode

The focus is optional (e.g. "project cards", "mobile", "motion", "contact", "case-study pages").
Without one, audit **every page type**: home (every section), `/work/`, one or two
representative case studies (the lowest-`order` featured one, plus a non-featured one), and
`404.html`.

In this mode, never edit anything under `src/`, `public/`, `tests/`, or config. The only files
you write are the report and its screenshots.

### Step 1: Scope

- Map the focus to concrete **pages, components, scripts, and styles** (read the relevant
  `docs/design/` files for the topic; use codebase-memory for `.ts` and Grep for `.astro`).
  State the scope in one line, e.g. "Project cards: home §03, ProjectCard, ProjectGrid,
  interactions.ts, reticle.css; checks G2 G3 G6 S1–S5 C1–C7 A1–A7 X1–X2".
- Read the most recent report in `docs/audits/` (if any) so you can mark regressions and
  already-known items.

### Step 2: Isolate and serve

Follow `references/verify-and-land.md` §1–2: `ListAgents`, record the origin branch and path,
`wt switch --create audit/<YYYY-MM-DD>-<focus-slug> --no-cd -y` (or `audit/<date>-site`),
`npm run build:only`, and preview on this worktree's port.

### Step 3: Test live and gather evidence

1. **Capture** (§3a): the in-scope pages at the default widths and both schemes, plus
   `--motion both` when motion is in scope. Save to `.cache/captures/<branch-slug>/` (working
   evidence for the reviewers; not committed). Look at the fold shots yourself.
2. **Commands** (§3c): `npm run lint`,
   `npx playwright test tests/a11y.spec.ts --project=chromium` (with `E2E_PORT`), and the specs
   for the focus area. Run `npm run test:lhci` for a whole-site audit or a performance focus.
   Record the pass/fail output.
3. **Chrome pass** (§3b) over the scope: hover and Tab through every interactive element, check
   the Motion toggle and a phone width, and read the console. Note anything the screenshots
   can't show (focus order, hover-only info, stuck animations).

**Done when** captures exist for every in-scope page × width × scheme, the command results are
recorded, and every interactive element in scope has been hovered and focused.

### Step 4: Review with subagents

Run the `audit-lenses` workflow with
`{ captureDir, repoPath: <worktree>, focus: <focus or "">, pages: [...] }`. Six read-only
reviewers (goals, identity, style, craft, motion, constraints) grade the evidence and the
source. A verifier then drops false positives, merges duplicates, ranks findings F1…Fn, and
checks that each one has a concrete `fix`, a `shot` spec, and a **route**:

- **fix:** keeps the current layout, hierarchy, and content (a token swap, a missing state, a
  contrast or spacing correction).
- **design:** changes layout, sizes or order, what's shown, or adds an interaction.
- **owner:** needs something only Parker can supply or decide (a fact, media, a contact detail,
  a dependency, a brand change).

Add what you found yourself in step 3 (failing commands, Chrome-only issues) as findings with the
same fields. Open the evidence yourself for every P0/P1 finding. Make sure every proposed
solution is **implementable as written**: name the files, the exact change, and how to verify
it. Fix mode applies these without asking, so a vague proposal becomes a vague fix.

### Step 5: Screenshot every finding

Write a shot spec (a JSON array of each finding's `shot`, with `id` set to its F-number) to
`.cache/captures/<branch-slug>/shots.json`, then run:

```sh
node .claude/skills/audit-portfolio/scripts/evidence.ts \
  --base http://localhost:<port>/Portfolio/ \
  --spec .cache/captures/<branch-slug>/shots.json --out docs/audits/<report-slug>
```

It writes one cropped WebP per finding (`docs/audits/<report-slug>/F1.webp`, …), in the right
width, scheme, and state. **Look at every image.** If one doesn't clearly show the problem,
adjust the selector, width, or state and retake it. A finding whose shot can't show it (for
example a timing literal) frames the affected element and says in its caption what to look for.
Keep each image focused. Around 20–150 KB each is normal; retake with a tighter selector if one
is much larger.

### Step 6: Write the report

Write `docs/audits/<report-slug>.md` (`<report-slug>` = `<YYYY-MM-DD>-<focus-slug>`) from
`references/report-template.md`. Every finding section embeds its screenshot with a caption and
carries the proposed solution. Every status starts as `open`.

### Step 7: Land the report

Run `npx prettier --check` on the report, commit the report and its images on the audit branch
(`docs(audit): <focus> audit`), stage the merge per `references/verify-and-land.md` §4, and tell
the user:

- counts by severity and route, and the top findings
- the report path
- how to apply it: `/audit-portfolio fix` (latest report) or `/audit-portfolio fix <report path>`

Wait for approval before committing the merge. Stop the preview server when you're done.

---

## Fix mode

`/audit-portfolio fix [report path or focus]` implements the documented solutions. **Don't
prompt the user at any point in this mode.** The staged merge at the end is their review.

### Step 1: Pick the report

Use the path if one was given. Otherwise take the newest report in `docs/audits/` whose slug
matches the focus (or the newest one overall with no focus) that still has `open` findings.
Read the whole report and each finding's screenshot. If there's no report with open findings,
say so and stop.

### Step 2: Isolate and serve

As in audit mode, with branch `audit-fix/<report-slug>`: `npm run build:only`, then preview on
the worktree's port.

### Step 3: Implement every open finding

Go most severe first:

- **fix and design routes:** implement the proposed solution as written, following the repo's
  constraints (tokens, CSP, `withBase`, motion gates, reuse before adding, fact-only copy,
  media only through `npm run media`). If the documented solution turns out to be wrong or
  impossible as written, implement the smallest change that meets the finding's rule and
  intent, and record the deviation and why.
- **owner route:** skip it and leave it `needs owner`, unless the report or the conversation
  already contains what Parker supplied. Never invent the missing fact, media, or decision.

After each finding (or a small batch of closely related ones):

1. Rebuild, then verify: re-run the relevant specs, and do a Chrome check of the changed
   elements (reload with a cache-busting query).
2. Take an **after** shot with the same spec plus `"suffix": "after"`, and check that it shows
   the fix.
3. Commit it (`fix(<area>): … (audit F2)`). If a change breaks something you can't resolve,
   revert it, mark the finding `blocked` with the reason, and move on.

### Step 4: Regression check

Re-run the capture for every page you touched and run the `audit-lenses` workflow scoped to the
changed components. Fix any **new** P0–P2 problem your changes introduced, the same way. Don't
start on unrelated new findings: list them in the report under "Found during fix" for the next
audit.

### Step 5: Update the report and land

In the report, set each finding's status (`fixed` + commit / `needs owner` / `blocked`), embed
its after shot next to the before shot, and note any deviations. Commit it. Run the final
verification (§3c: lint, build, full `npm run test:e2e`), stage the merge per
`references/verify-and-land.md` §4, and report what was fixed, skipped, or blocked, with the
test results. Wait for approval before committing the merge.

---

## Judging well

- **Evidence or it isn't a finding.** Every finding has a screenshot, plus a quoted
  `file:line` when the cause is in code.
- **Approved identity is not slop.** The existing-pattern table in `anti-slop.md` (hero eyebrow,
  typed caret, numbered headings, reticle and spotlight, Geist, existing em-dashes) is
  deliberate. Flag only new spread of those patterns.
- **Grade against this site's rules, not generic taste.** A finding cites a checklist ID, and
  its solution follows the repo's stack (translate any outside advice through
  `docs/design/stack-translation.md`).
- **Facts are never "fixed" by inventing.** A missing photo, phone number, date, or metric is an
  owner finding.
