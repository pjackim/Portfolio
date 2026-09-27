---
name: audit-portfolio
description: Audit Parker Jackim's portfolio site (this Astro repo) against its design goals, the review checklist, and its operator-console style, with real screenshots, Chrome checks, and tests. Writes a findings report to docs/audits/ and fixes findings in batches the user approves. Use whenever the user asks to audit, review, QA, sanity-check, or grade the portfolio or one part of it (a page, section, component, or topic such as motion, contact, accessibility, mobile), or asks whether something is on-brand or consistent with the site. Optional argument: a focus topic or feature.
argument-hint: "[optional focus topic or feature]"
---

# /audit-portfolio

Find where the site falls short of its goals and its own style, prove each finding with
evidence, write it up, then fix what the user approves, batch by batch.

`$ARGUMENTS` is an optional focus (e.g. "project cards", "mobile", "motion", "contact",
"case-study pages"). If it's empty, audit **every page type**: home (every section), `/work/`,
one or two representative case studies (the lowest-`order` featured one, plus a non-featured
one), and `404.html`.

The rubric is `docs/design-research/review-checklist.md`, the identity is
`docs/identity/site-style.md` (plus the rest of `docs/identity/`), and the goals and constraints
are in `CLAUDE.md`. Procedures shared with `/design-portfolio` are in
`references/verify-and-land.md`.

## Step 1: Scope

- Map the focus to concrete **pages, components, scripts, and styles** (read the relevant
  `docs/design-research/` files for the topic; use codebase-memory for `.ts` and Grep for
  `.astro`). State the scope in one line, e.g. "Project cards: home §03 + /work/, ProjectCard,
  ProjectGrid, interactions.ts, reticle.css; checks G2 G3 G6 S1–S5 C1–C7 A1–A7 X1–X2".
- Read the most recent report in `docs/audits/` (if any) so you can mark regressions and
  already-known items.

## Step 2: Isolate and serve

Follow `references/verify-and-land.md` §1–2: `ListAgents`, record the origin branch and path,
`wt switch --create audit/<YYYY-MM-DD>-<focus-slug>` (or `audit/<date>-site`), `npm run
build:only`, and preview on this worktree's port. The report and any fixes are committed on this
branch.

## Step 3: Gather evidence

1. **Capture** (§3a): the in-scope pages at the default widths and both schemes, plus
   `--motion both` when motion is in scope. Save to `.cache/captures/<branch-slug>/`. Look at
   the fold shots yourself.
2. **Commands** (§3c): `npm run lint`, `npx playwright test tests/a11y.spec.ts
--project=chromium` (with `E2E_PORT`), and the specs for the focus area. Run
   `npm run test:lhci` for a whole-site audit or a performance focus. Record the pass/fail
   output.
3. **Chrome pass** (§3b) over the scope: hover and Tab through every interactive element, check
   the Motion toggle and a phone width, and read the console. Note anything the screenshots
   can't show (focus order, hover-only info, stuck animations).

**Done when** captures exist for every in-scope page × width × scheme, the command results are
recorded, and every interactive element in scope has been hovered and focused.

## Step 4: Review lenses

Run the `audit-lenses` workflow with
`{ captureDir, repoPath: <worktree>, focus: $ARGUMENTS or "", pages: [...] }`. Six read-only
reviewers (goals, identity, style, craft, motion, constraints) grade the evidence and the
source, then a verifier drops false positives, merges duplicates, and ranks findings F1…Fn.

Merge in what you found yourself in step 3 (failing commands, Chrome-only issues) as findings
with the same fields. Before accepting any finding, open its evidence yourself if it's P0/P1,
or if it would be auto-fixed.

## Step 5: Write the report

Write `docs/audits/<YYYY-MM-DD>-<focus-slug>.md` from `references/report-template.md`. Screenshot
paths point into `.cache/captures/…` (gitignored; the report says how to regenerate them). Commit
it on the audit branch (`docs(audit): <focus> audit`).

Then show the user a short summary: counts by severity, the top findings, and the batches you
propose for step 6.

## Step 6: Fix in batches the user approves

Group the findings into batches of related fixes, e.g. "Tokens and literals (F3, F7, F9)",
"Focus states on filter chips (F2)", "Contrast in light theme (F5, F6)". Keep each batch small
enough to verify in one pass. For each batch, in severity order, ask with `AskUserQuestion`
("Fix batch 2: focus states (F2, F4)?"): **Fix it**, **Skip**, or **Send to /design-portfolio**.
You can put up to 4 batches in one call, one question each.

- **M (mechanical) findings:** fix them directly, following the same constraints as
  `/design-portfolio` step 4 (tokens, CSP, `withBase`, motion gates, reuse before adding).
- **J (judgement) findings:** only with the user's go-ahead in that batch. If the fix changes
  layout, hierarchy, or what's shown, recommend "Send to /design-portfolio" and list the finding
  as its input rather than improvising a redesign.
- After each approved batch: re-run the capture for the affected pages, the relevant specs, and
  a Chrome check of the fixed elements. Confirm each finding is resolved with evidence, then
  commit the batch (`fix(<area>): … (audit F2, F4)`). If a fix introduces a new problem, fix it
  or revert that batch before moving on.
- Update the report's **Status** column (fixed / skipped / sent to design / deferred) and commit.

## Step 7: Land

If anything was committed (the report counts), run the final verification (§3c: lint, build,
full `npm run test:e2e`), then stage the merge per `references/verify-and-land.md` §4 and report:
the report path, findings fixed vs. open, commits, and test results. Wait for approval before
committing the merge.

## Judging well

- **Evidence or it isn't a finding.** Every finding carries a screenshot with what it shows, or
  a quoted `file:line`.
- **Approved identity is not slop.** The existing-pattern table in `anti-slop.md` (hero eyebrow,
  typed caret, numbered headings, reticle and spotlight, Geist, existing em-dashes) is
  deliberate. Flag only new spread of those patterns.
- **Grade against this site's rules, not generic taste.** A finding cites a checklist ID, and
  the fix follows the repo's stack (translate any outside advice through
  `docs/design-research/stack-translation.md`).
- **Facts are never "fixed" by inventing.** A missing photo, phone number, date, or metric is a
  finding for the user to supply.
