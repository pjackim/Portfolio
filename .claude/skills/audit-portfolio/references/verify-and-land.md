# Verify and land (shared by /design-portfolio and /audit-portfolio)

Three procedures both skills reuse: **isolate** the work in a worktree, **verify** it the same
way every time, and **land** it as a staged, uncommitted merge the human approves.

## 1. Isolate

1. `ListAgents`: note any live session working in the same files, and tell it what you're about
   to touch if it overlaps (per `CLAUDE.md`).
2. Record where you started: `ORIGIN_BRANCH=$(git branch --show-current)` and
   `ORIGIN_PATH=$(git rev-parse --show-toplevel)`. You need both to land.
3. Create the worktree with worktrunk, never raw `git worktree`:
   `wt switch --create <prefix>/<slug> --no-cd -y` (non-interactive; `design/<slug>` or `audit/<YYYY-MM-DD>-<focus>`). The
   `pre-start` hook runs `npm ci`. All later commands run in that worktree (its path is under
   `.claude/worktrees/`; `wt list` shows it).
4. Pick a port unique to this worktree, so parallel sessions don't collide:
   `PORT=$((4400 + $(printf %s "<branch>" | cksum | cut -d' ' -f1) % 500))`.

## 2. Servers

- **Dev (prototypes, fast iteration):** `npx astro dev --port <port>` in the background.
- **Preview (verification, audits):** `npm run build:only`, then
  `npx astro preview --port <port> --ignore-lock` in the background. `--ignore-lock` matters:
  Astro 7's preview refuses to start while another preview holds `.astro/preview.json` and
  auto-backgrounds itself when run by an agent.
- Base URL is `http://localhost:<port>/Portfolio/`, case-sensitive.
- Stop your servers when you're done (they're your background tasks).

## 3. Verify

Run all of it; "the build passed" is not verification for UI work (`CLAUDE.md`).

**a. Evidence capture (deterministic screenshots and mechanical signals)**

```sh
node .claude/skills/audit-portfolio/scripts/capture.ts \
  --base http://localhost:<port>/Portfolio/ \
  --pages "<comma list, '' = home>" --out .cache/captures/<run-id>
```

Defaults: widths 390, 768, 1280, 1920; light and dark; reduced motion (settled final states).
Add `--motion both` when motion is in scope. Read `manifest.json` for overflow, third-party
requests, JS bytes (budget 30 KB/page), inline style attributes in the served HTML, console
errors, and images without alt. Then **look at the PNGs** (Read shows them): `__fold` is what
a scanner sees first, and `__full` is the whole page. `.cache/` is gitignored.

**b. Interactive pass with Chrome (claude-in-chrome)**

Load the core tools in one `ToolSearch`, then `tabs_context_mcp` and a new tab. If several
browsers are connected, ask which one (the one on this machine can reach `localhost`). After
every rebuild, reload with a cache-busting query (`?v=<n>`): Chrome otherwise keeps serving
the previous HTML and you verify stale code. Check what
screenshots can't show:

- Hover every interactive element in scope; Tab through it (focus visible, order logical, focus
  mirrors hover); activate with Enter/Space.
- Motion on: the feature's motion does its job, ends, and doesn't fight the hero's focal moment.
  Then the site's Motion toggle off, then emulate reduced motion (`javascript_tool` can't change
  the media query, so use the toggle for the site gate and rely on capture's reduced-motion
  shots for the OS gate). Everything must snap to its final state.
- Resize to a phone width (`resize_window`) and check touch-only rules (`hover: none`).
- `read_console_messages` with a pattern for errors.
- Don't trigger `alert`/`confirm` dialogs.

**c. Commands**

- `npm run lint`: Prettier, `astro check`, media lint.
- `npm run build:only`, then `npx playwright test --project=chromium` on the specs covering the
  area (`tests/a11y.spec.ts` always; `motion`, `interactions`, `layout-shift`, `links`,
  `media`, and `smoke` as relevant), then the full `npm run test:e2e` before landing. Set
  `E2E_PORT=<port>`.
- `npm run test:lhci` when the change affects page weight, images, fonts, or LCP/CLS.

**d. Rubric**

Grade the result against `docs/design/review-checklist.md`: every check that the
change touches, by ID. A check that fails is either fixed or explicitly reported with a reason.

## 4. Land (staged merge, human commits it)

Commit on the worktree branch as you go: small, conventional commits in the repo's style
(`git log --oneline -10`). The `pre-commit` hook runs `npm run lint`, so never pass
`--no-verify`, and fix what it reports. Never push.

When the work is verified:

1. Make sure the branch has everything: `git -C <worktree> status` is clean.
2. Check the origin checkout: `git -C "$ORIGIN_PATH" status --porcelain`. If it has uncommitted
   changes that overlap files your branch touches, **stop** and tell the user; don't stash or
   discard someone else's work. Unrelated dirty files are fine.
3. Stage the merge without committing:
   `git -C "$ORIGIN_PATH" merge --no-ff --no-commit <branch>`.
   On conflict: `git -C "$ORIGIN_PATH" merge --abort`, report the conflicting files, and ask.
4. Report: branch, commits (`git log --oneline $ORIGIN_BRANCH..<branch>`), what the staged merge
   contains (`git -C "$ORIGIN_PATH" diff --cached --stat`), the verification results, and
   **wait for approval**.
5. On approval: `git -C "$ORIGIN_PATH" commit --no-edit`, then `wt remove <branch>` to clean up
   the worktree. On rejection: `git -C "$ORIGIN_PATH" merge --abort` and leave the branch for
   the user.

A staged merge sits in the shared checkout and other sessions will see it. Mention that in the
report, and `SendMessage` any live session working in that checkout.
