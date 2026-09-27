# The prompt /taste writes

The structure follows the two prompts in taste-skill's usage guide (brief, stepped stops,
written audits; see `docs/design/taste-skill.md`), with three changes for this site: the
opening sets the site's precedence instead of "my only source of design rules", the steps line
up with `/design-portfolio`'s two gates, and the audits add the site's own checks.

Fill every `<…>`. Delete the step block for the mode you didn't choose. Keep the wording of the
fixed lines; the executing agent is primed by them.

## Template

```markdown
# <Surface>: <one-line intent>

> Original request (<YYYY-MM-DD>): "<the user's words, verbatim>"

Load the `design-taste-frontend` skill<, plus `<companion>` for <reason>>. Before applying any
of them, read `docs/design/taste-skill.md` and `docs/design/stack-translation.md`. When anything
disagrees, this order wins: `CLAUDE.md` constraints, then `CLAUDE.md` goals, then
`docs/identity/`, then `docs/design/`, then the skills' defaults. Run this through
`/design-portfolio`; the brief below settles its interview except where it says otherwise.

## Brief

- Page kind: developer portfolio of a security researcher; <page and section>
- Product: Parker Jackim's portfolio. <What this surface is for, in one line>
- Surface: <route and section anchor>; files: <components, scripts, styles, content>
- Mode: <New surface on an existing site | Redesign, preserve | Redesign, overhaul (brand decision confirmed on <date>)>
- Audience: <e.g. recruiters and hiring managers in security and software who scan in seconds and rarely click>
- Goal served: <G#/Goal #>. A visitor who only scrolls should leave knowing <takeaway>.
- Vibe words: <2 to 4 concrete adjectives, from the decoder>
- References: <in-repo anchors, e.g. the hero's instrument feel (`Hero.astro`), the reticle lock-on (`reticle.css`)>; <any external reference and the one quality to take from it>
- What works today: <2 to 3 specifics to keep>
- What is broken today: <2 to 3 specifics, with checklist IDs or audit finding numbers>
- Content and media: <what exists, with paths>; <missing items: "owner to supply">
- Must not change: <URLs, anchors, legacyPaths, nav labels, numbered section headings, contact channels, anything else the user named>
- Avoid: <the 3 to 5 tells most likely on this surface>
- Out of scope: <…>

## Design read and dials (proposed)

Reading this as: <page kind> for <audience>, with a <vibe> language, leaning toward the site's
existing operator-console system (`tokens.css`, Astro components, vanilla TS).

- `DESIGN_VARIANCE: <n>`, because <one line>.
- `MOTION_INTENSITY: <n>`, because <one line>.
- `VISUAL_DENSITY: <n>`, because <one line>.

The one motion moment: <what moves, when, and its job>. Motion off (reduced motion or the site
toggle): <the end state shown instead>.

## Site overrides for this work

<Only the rows of `docs/design/taste-skill.md#applying-it-here` that touch this surface, one
line each, e.g.:>

- No React, Tailwind, Motion, or GSAP: Astro components, tokens, a module in `src/scripts/`,
  and `data-reveal` presets for entrances.
- Imagery is Parker's real work only, through `npm run media`. No generated or picsum images.
- <…>

## Assumptions

<Anything inferred rather than confirmed, so the reviewer can correct it. "None" if none.>

## Steps

<!-- Redesign mode -->

Step 1. Run the §11.B audit on <surface> in writing: tokens in use (accent, type, radii),
structure and paths into and out of it, patterns to preserve, patterns to retire, the inferred
dial reading of the current state, and the anchors and URLs that must not change. Then confirm
or correct the design read and dials above. This is `/design-portfolio`'s gate 1 (the brief).
Stop.

Step 2 (after my OK). Name the §11.D levers you'll use, in priority order, and prototype at
least two structurally different variants (`/design-portfolio`'s `references/prototype.md`).
This is gate 2. Stop.

Step 3 (after my OK). Build the chosen variant. Keep every item under "Must not change" as it
is unless I approve a change.

<!-- New surface mode -->

Step 1. Confirm or correct the design read and dials above in one line each, and list the
layout family you'll use for this surface and the families of the sections next to it. This is
`/design-portfolio`'s gate 1 (the brief). Stop.

Step 2 (after my OK). Prototype at least two structurally different variants
(`/design-portfolio`'s `references/prototype.md`). This is gate 2. Stop.

Step 3 (after my OK). Build the chosen variant, reusing the site's components and patterns
before adding any.

<!-- Both modes -->

Step 4. Run in writing:

- Em-dash audit: zero U+2014 or U+2013 in new or changed visible copy.
- Pre-Flight Check (§14): every box Pass, Fail, or N/A with a one-line reason. N/A names the
  site's analogue (for example `'use client'` → a module in `src/scripts/`).
- Section-Layout-Repetition audit: this surface's layout family against its neighbours.
- Signature audit: no new eyebrows, carets, numbered labels, backgrounds, or copied reticles
  (review-checklist S5).
- <Hero discipline audit: headline lines, subtext words, path to the work visible without
  scrolling. Only if the hero is touched.>
- Preservation audit: every URL, anchor, `legacyPaths` entry, nav label, and contact channel
  changed. Empty unless I approved.
- Brand fidelity audit: `--accent` is the only chromatic colour, Geist and Geist Mono only,
  radii 2 to 4px, depth by tone and hairline, monogram untouched.
- Fact audit: every new visible claim, number, and link traces to a source.
- Review checklist: every ID this touches (<list: G…, S…, C…, A…, X…>) passes or has a
  written reason.
- Verification: `npm run lint`, `npm run build:only`, `npm run test:e2e`, and a Chrome pass at
  390 and 1280 in both themes with motion on and off.

Any Fail blocks completion.
```

## Worked example (illustrative)

Request: "make the work section pop, it feels kinda flat". Context read: `#work` renders six
featured projects through `ProjectGrid` as two equal columns, the odd last card spanning both.
Decoder: "pop" is ambiguous, so one question on feel; the user picks "strongest work bigger and
earlier". Resulting brief lines:

```markdown
- Surface: `/` `#work`; files: `ProjectGrid.astro`, `ProjectCard.astro`, `reticle.css`,
  featured projects' `order` in `src/content/projects/*/index.md`
- Mode: Redesign, preserve
- Goal served: G3. A visitor who only scrolls should see which project is Parker's strongest
  before reading a word.
- Vibe words: ranked, decisive, image-led
- What works today: reticle lock-on and spotlight; real covers; whole-card links
- What is broken today: every card is the same size, so nothing leads (C1, G3)
- Must not change: `#work` and `#portfolio-section` anchors, "03 / Selected work" heading, the
  "All work →" link, card links and `legacyPaths`
- Avoid: uniform tiles, empty bento cells, a third card treatment, hover lift or shadow
```

Dials: `DESIGN_VARIANCE: 7` (a ranked asymmetric grid is the fix), `MOTION_INTENSITY: 5` (keep
the reticle and staggered reveal, add nothing), `VISUAL_DENSITY: 4` (the card content stays as
it is). Companions: `redesign-existing-projects` for the audit, `gpt-taste` for its no-empty-cell
rule only.
