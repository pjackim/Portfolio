---
name: design-portfolio
description: Design and build a new feature, or redesign an existing one, on Parker Jackim's portfolio site (this Astro repo). Explore → grill until the brief is shared → prototype at least 2 variants for sign-off → build, verify in Chrome, and stage a merge. Use whenever the user asks to add, redesign, restyle, or rework any section, page, card, grid, animation, or interaction on the portfolio, or hands off a judgement finding from /audit-portfolio. Arguments: the feature to build or refactor (required).
argument-hint: <feature to build or existing feature to refactor>
---

# /design-portfolio

Turn a feature request into shipped, verified UI that serves the portfolio's goals and looks
like the rest of the site. The run has **two human gates**, the brief and the prototype
sign-off. After the second gate, you work autonomously until the result is verified and a merge
is staged.

`$ARGUMENTS` is the feature. If it's empty, ask for it and stop.

## The sources you design from

Read these in step 1. They win over any outside skill's defaults, in this order:

1. `CLAUDE.md`: constraints (CSP, 30 KB JS, WCAG 2.2 AA, fact-only, media pipeline, `withBase`)
   and the **Goals**, especially the scan-first ground rule.
2. `docs/identity/site-style.md`: the operator-console identity (palette roles, type roles,
   signature elements, motion personality, voice). "On-vibe" means this. Also read any other
   file in `docs/identity/`.
3. `docs/design-research/README.md`, then every file its table maps to this feature (almost
   always `scanning-and-reading.md` and `anti-slop.md`, plus cards/bento/motion/disclosure/type
   as relevant). If you use any outside or installed design skill, read `stack-translation.md`
   first.
4. `docs/design-research/review-checklist.md`: the rubric the finished work is graded on.

## Step 1: Explore (no questions yet)

- `ListAgents`: see who else is live and whether anyone works in this area.
- Read the sources above, then the code for the area: the page(s) and components involved, the
  scripts they import, `tokens.css` and `global.css` rules they use, related content/data
  (`src/content/projects/*/index.md` frontmatter, `src/data/site.ts`, `taxonomy.ts`), and the
  Playwright specs covering it. Use codebase-memory graph tools for `.ts`, and Grep for `.astro`.
- Look at the current state: build and preview on a free port, run the capture script on the
  affected pages (see `../audit-portfolio/references/verify-and-land.md` §2–3a), and read the
  fold and full screenshots at 390 and 1280.
- Grade the current state against the checklist IDs that apply. Those gaps are what the design
  must fix.

**Done when** you can state: which goal(s) the feature serves, what's on the surface today, what
content and media actually exist for it, which components and scripts it will touch or reuse,
and which checklist items currently fail.

## Step 2: Grill until the brief is shared

Interview the user **one question at a time**, each with your recommended answer and the reason
(the `grilling` style). Walk the design tree and resolve dependencies in order. **If the code or
docs can answer a question, look instead of asking.** Branches to cover (skip any the request
already settles):

1. **Outcome:** what should a visitor who only scrolls take away? Which goal does it serve, and
   what does it beat if goals conflict?
2. **Content and facts:** what exactly is shown, and does every fact, image, and link exist and
   trace to a source? Missing media or facts are the user's to supply; never invent them.
3. **Placement and hierarchy:** where it sits, what it pushes down, its size relative to
   neighbours, what's on the surface vs. one click deep.
4. **Interaction and motion:** the one thing that should feel satisfying; hover, focus, and
   touch behaviour; how it degrades with motion off.
5. **Identity:** which existing signature elements and components it reuses; anything new that
   would need adding to the style profile.
6. **Edges:** phone layout, keyboard path, empty or long content, 3–8 featured items (if it
   lists projects), both themes.
7. **Scope and risk:** what's explicitly out of scope; any new dependency (needs a yes); budget
   impact (JS, LCP, CLS).

End the interview by writing the **design brief** (template below) and asking the user to confirm
it. That confirmation is **gate 1**.

```markdown
## Design brief: <feature>

- Goal served / success signal: …
- Surface (seen without a click): … Depth (one click away): …
- Content & sources: … (each fact → source; missing → owner)
- Placement & hierarchy: …
- Interaction & motion: … (motion-off behaviour: …)
- Reuses: components/scripts/tokens … New identity decisions: …
- Constraints & risks: … Out of scope: …
- Checklist items this must pass: G…, S…, C…, A…, X…
```

## Step 3: Prototype at least 2 variants, then get sign-off

Isolate first (`verify-and-land.md` §1): `wt switch --create design/<slug>`. Everything from here
on happens in that worktree.

Build the variants by following `references/prototype.md`: structurally different variants
mounted on the real page behind a dev-only `?variant=` switcher, then screenshots, a trade-offs
table, your recommendation, and the live URLs.

**Gate 2** is an explicit sign-off on one variant or a stated mix. Until you have it, iterate on
the prototypes; don't start the real build.

## Step 4: Build (autonomous from here)

- Delete the prototype scaffolding, then build the signed-off design properly in the real
  component(s). Reuse before adding: `ProjectCard`, `SectionHeading`, the `data-reveal` presets,
  `motion.ts` (`motionAllowed`, `onMotionChange`), `reticle.css`, `Arrow`, `page-style.ts`, and
  `LoopVideo`. New client code goes in a module in `src/scripts/`, imported by the component.
- Hold the constraints as you write, not after: tokens only, no inline `style=`, `withBase()`
  for every URL, motion behind the CSS and TS gates, content visible at rest, real media through
  `npm run media`, and every copy line sourced (cite new author-stated facts in a comment).
- If the feature changes behaviour the Playwright suite covers, or adds new behaviour worth
  guarding (interaction, reduced-motion state, layout shift), update or add a spec in `tests/`.
- If the build settled a new identity decision, add it to `docs/identity/site-style.md` in the
  same branch.
- Commit in logical steps on the branch (repo commit style; the hook runs lint).

If you hit a real blocker that needs the user (a missing fact or asset, a dependency, a
constraint conflict the brief didn't foresee), ask. Otherwise keep going.

## Step 5: Verify until it meets the standard

Run the full verification in `../audit-portfolio/references/verify-and-land.md` §3: the capture
matrix, the interactive Chrome pass, the commands, and the rubric. Then get an independent
review: run the `audit-lenses` workflow scoped to this feature (args:
`{ focus: "<feature>", pages: [...], captureDir: "<dir>", repoPath: "<worktree>", brief: "<brief text>" }`)
so reviewers who didn't write the code grade it.

Fix every P0–P2 finding and re-verify. P3s: fix them if they're cheap, and otherwise list them.
Repeat until a verification pass comes back clean. **Done when** lint, build, and e2e pass,
Chrome checks pass at phone and desktop in both themes with motion on and off, and every
touched checklist ID passes or has a written reason.

## Step 6: Land

Follow `verify-and-land.md` §4: stage `git merge --no-ff --no-commit design/<slug>` in the
original checkout and report. The report includes the brief, the chosen variant and why,
before/after fold screenshot paths, commits, checklist results, and anything deferred. Then
wait. On approval, commit the merge and `wt remove` the worktree.
