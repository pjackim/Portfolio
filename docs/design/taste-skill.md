# taste-skill: how it works and how to prompt it here

What [taste-skill][repo] (MIT, Leon Lin) is, how its v2 skill reads a prompt, the two prompts
its author recommends, and how each of its rules lands on this site. `/taste` uses this page to
turn a rough request into a prompt that gets the most out of the skill. Sources: the
[usage guide][guide] (full view) and the [docs][docs], fetched 2026-09-27, plus the installed
`.claude/skills/design-taste-frontend/SKILL.md` (v2 experimental). Section numbers (§) refer to
that file, and the author warns they may change before v2.0.0.

## TL;DR: rules

1. **v2 reads the brief first.** Page kind, vibe words, audience, references, and brand assets
   decide the design. A prompt without them gets the model's defaults, which is the thing the
   skill exists to stop.
2. **It sets three dials** (`DESIGN_VARIANCE`, `MOTION_INTENSITY`, `VISUAL_DENSITY`, 1 to 10)
   from those cues, and every layout, motion, and density rule is gated by them. Give the
   values and the reason; don't let it fall back to the `8 / 6 / 4` baseline.
3. **The author's prompts are stepped, with stops.** Declare the design read, stop; audit (for
   redesigns), stop; build; then run named audits in writing, where any Fail blocks completion.
4. **Three locks never relax:** one accent, one corner-radius system, one page theme.
5. **This site outranks the skill.** Its React/Next/Tailwind/Motion/GSAP defaults, font picks,
   and picsum or generated images don't apply here. Take the principles through
   [stack-translation.md](./stack-translation.md), and keep the approved identity patterns
   listed in [anti-slop.md](./anti-slop.md#applying-it-here) even where §9 bans them.

## How v2 thinks (the parts of SKILL.md a prompt should feed)

| §   | Name                      | What it does                                                                                                                                                                | What a prompt must give it                                            |
| --- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 0   | Brief inference           | Reads page kind, vibe words, references, audience, existing brand, quiet constraints. States a one-line **design read** before any code. Asks one question only if it must. | All six signals, so it doesn't guess.                                 |
| 1   | The three dials           | Sets variance/motion/density from the read (presets: developer portfolio `6/5/4`, editorial `6/4/3`, redesign-preserve `match / +1 / match`).                               | Values with a one-line reason each.                                   |
| 2   | Brief to design system    | Maps a brief to an official system (Material, Carbon, Primer…) or labels an aesthetic honestly.                                                                             | "Existing bespoke system: tokens.css", so it reaches for nothing.     |
| 4   | Bias correction and locks | Type, colour, layout diversification, shape lock, interactive states, hero and layout discipline, image strategy, content density, theme lock.                              | The site's accent, radii, type roles, and theme model.                |
| 5   | Context-aware motion      | "Motion claimed, motion shown" above 4; motion must be motivated; one marquee max; canonical sticky-stack/pan skeletons.                                                    | The one motion moment and its job.                                    |
| 6   | Perf and a11y             | Transform/opacity only, reduced motion mandatory above 3, dual theme, Core Web Vitals.                                                                                      | The site's own gates and budgets (they're stricter).                  |
| 9   | AI tells                  | The ban list (below).                                                                                                                                                       | Which listed patterns are approved identity here.                     |
| 11  | Redesign protocol         | Detect mode, audit before touching (§11.B), preservation rules (§11.C), levers in order (§11.D), what never changes silently (§11.F).                                       | Mode, what works, what's broken, what must not change.                |
| 13  | Out of scope              | Dashboards, data tables, wizards, editors, native mobile.                                                                                                                   | Nothing; a portfolio is squarely in scope.                            |
| 14  | Pre-Flight Check          | About 60 boxes, each marked Pass or Fail. "No box, no ship."                                                                                                                | Permission to mark stack-specific boxes N/A with the site's analogue. |

### The dials

| Dial               | 1 to 3                                 | 4 to 7                                                     | 8 to 10                                       |
| ------------------ | -------------------------------------- | ---------------------------------------------------------- | --------------------------------------------- |
| `DESIGN_VARIANCE`  | Symmetric grid, equal padding, centred | Offsets, varied aspect ratios, left headers over data      | Masonry, fractional grids, big empty zones    |
| `MOTION_INTENSITY` | Hover and active states only           | CSS transitions, staggered load-ins, transform and opacity | Scroll-driven choreography, parallax, pinning |
| `VISUAL_DENSITY`   | Gallery: huge section gaps             | App spacing                                                | Cockpit: tight, 1px dividers, mono numbers    |

Inference cues from §1.A: "minimalist / editorial / calm" → `5-6 / 3-4 / 2-3`; "portfolio
(default)" → `7-9 / 6-8 / 3-5`; "redesign, preserve" → match the existing reading, motion +1.
Above `MOTION_INTENSITY 4` the page must actually move; below it, drop the dial and ship still.

## The two prompts from the usage guide

Both open with "I have loaded tasteskill v2 (experimental) as my only source of design rules."
On this site that line is wrong: the skill is one source among several, and ranks last. `/taste`
keeps the structure below and swaps the opening for the site's precedence order.

### New build (greenfield)

```text
Brief:
- Page kind: <landing / portfolio / marketing>
- Product: <name and one-line description>
- Audience: <who reads this, concrete adjectives>
- Vibe words: <2 to 4 concrete adjectives, e.g. "minimalist, editorial, restrained">
- References: <real URLs or product names that anchor the aesthetic>
- Avoid: <explicit slop patterns the brief should NOT default to>

Step 1. Declare your design read in one sentence and the three dial values with one-line
reasoning each. Stop.

Step 2 (after my OK). Ship a single Next.js page with at least 8 sections. Pick the sections
that actually fit the product. At least 4 different layout families across the page. Use real
images (gen-tool first, then Picsum-seed). Lock one theme for the whole page.

Step 3. Run in writing:
- Em-dash audit (zero em-dashes U+2014 or en-dashes U+2013 anywhere)
- Pre-Flight Check (Section 14, every box marked Pass or Fail with one-line justification)
- Section-Layout-Repetition audit (list each section's layout family)
- Hero discipline audit (headline lines, subtext words, CTA visibility)

Any Fail blocks completion.
```

### Redesign

```text
Brief:
- Site: <URL or repo path>
- Mode: <preserve brand / overhaul / unsure>
- Audience: <who reads this>
- What works today: <2 to 3 specifics you want kept>
- What is broken today: <2 to 3 specifics you want fixed>
- SEO constraint: <which routes, headings, or anchors must not change>

Step 1. Run the Section 11 audit (Section 11.B in the skill):
- Brand tokens currently in use (primary, accent, type stack, radii)
- Information architecture (page tree, nav, conversion paths)
- Patterns to preserve (signature interactions, recognisable hero, copy voice)
- Patterns to retire (slop tells, broken layouts, dead links)
- Inferred dial reading of the current site (DESIGN_VARIANCE, MOTION_INTENSITY, VISUAL_DENSITY)
- SEO baseline (ranking pages, titles, anchors)
Post the audit in writing. Stop.

Step 2 (after my OK). Declare the mode (Preserve, Overhaul, or Greenfield-with-content-preserved)
and which modernisation levers from Section 11.D you will apply, in priority order. Stop.

Step 3 (after my OK). Implement the changes. Keep URL structure, primary nav labels, form field
names, brand logo, and legal copy unchanged unless I explicitly approve a change.

Step 4. Run in writing:
- Em-dash audit
- Pre-Flight Check (Section 14)
- Preservation audit: list every URL, nav label, form field, and anchor changed. Should be empty
  unless I approved.
- Brand fidelity audit: confirm the existing brand accent color, type stack, and logo treatment
  survived the redesign.

Any Fail blocks completion.
```

§11.D levers, in the order the skill applies them (stop when the brief is met): typography
refresh → spacing and rhythm → colour recalibration → motion layer → hero and key-section
recomposition → full block replacement.

### The guide's quick reminders

- Zero em-dashes anywhere. Hyphen only.
- Hero headline max 2 lines. Subtext max 20 words. CTA visible without scroll.
- Navigation max 80px tall, one line at desktop.
- Bento grid: N items equals N cells. No empty cells.
- One theme for the whole page (no light/dark flips mid-page).
- Real images, no div-based fake screenshots, no hand-rolled SVG illustrations.
- No section-numbering eyebrows, no version labels in hero, no scroll cues, no locale strips, no
  decorative status dots.
- If `MOTION_INTENSITY` is greater than 4, the page actually animates. Otherwise drop the dial.

## The rules it enforces (from the docs)

- **Locks (§4):** Colour Consistency (one accent, whole page), Shape Consistency (one radius
  system, documented exceptions only), Page Theme (light, dark, or auto, chosen once).
- **Hero discipline:** headline ≤ 2 lines at desktop; subtext ≤ 20 words and ≤ 4 lines; primary
  CTA visible without scrolling; nav one line, ≤ 80px. §4.7 adds: top padding ≤ `pt-24`, at most
  4 text elements, no trust strip or tagline under the CTAs.
- **Layout discipline (§4.7):** each layout family at most once per page (8 sections → ≥ 4
  families); at most 2 image+text zigzags in a row; eyebrows at most 1 per 3 sections; no
  "big headline left, small paragraph right" split header; bento cells vary in background.
- **Content (§4.9):** section = short headline (≤ 8 words) + ≤ 25-word paragraph + one visual
  or CTA; lists over 5 items get a different component; no fake-precise numbers; re-read every
  visible string before shipping.
- **Ban list (§9, abridged in the docs):** em- and en-dashes in copy; section-numbering
  eyebrows; hero version labels; decorative photo-credit captions; decoration text strips at the
  hero bottom; pills on images; version footers; locale/time/weather strips; scroll cues;
  decorative status dots; `border-t` + `border-b` on every row; div-built fake product UI;
  three-equal-card rows; AI-purple and mesh gradients; hand-rolled decorative SVG;
  `window.addEventListener('scroll')`.
- **Customisation:** SKILL.md is meant to be edited; a project style guide pasted at the top
  becomes the dominant source of truth. Here that job is done by the prompt instead, so the
  installed file stays byte-identical to upstream (it's in `.prettierignore` for that reason).

## Skill files

The upstream repo names differ from the installed folder names. Only the ones marked installed
are available to `/taste`; the rest need `npx skills add` and the human's go-ahead.

| Upstream (`skills/…`)      | Installed as                 | Reach for it here when…                                                         |
| -------------------------- | ---------------------------- | ------------------------------------------------------------------------------- |
| `taste-skill` (v2)         | `design-taste-frontend`      | Always. It's the core skill.                                                    |
| `redesign-skill`           | `redesign-existing-projects` | The request changes something that already exists (most requests here).         |
| `brutalist-skill`          | `industrial-brutalist-ui`    | The work leans on the instrument side: telemetry labels, readouts, Swiss grids. |
| `minimalist-skill`         | `minimalist-ui`              | Reading surfaces: project prose, the `/work/` index, typographic hierarchy.     |
| `soft-skill`               | `high-end-visual-design`     | Spacing generosity and card restraint. Skip its shadows, pills, and glass.      |
| `gpt-tasteskill`           | `gpt-taste`                  | A bento or grid: its gapless-cell rule. Skip GSAP and Python randomisation.     |
| `output-skill`             | `full-output-enforcement`    | Large multi-file builds where truncation is a risk.                             |
| `stitch-skill`             | `stitch-design-taste`        | Never unasked (writes a `DESIGN.md`).                                           |
| `brandkit`                 | `brandkit`                   | Never unasked (image generation, brand boards).                                 |
| `taste-skill-v1`           | not installed                | Not needed; v2 supersedes it.                                                   |
| `image-to-code-skill`      | not installed                | Not usable: generated imagery breaks the fact-only rule.                        |
| `imagegen-frontend-web`    | not installed                | Same.                                                                           |
| `imagegen-frontend-mobile` | not installed                | Same.                                                                           |

## Applying it here

Most of the skill agrees with the site: one accent, one radius system, real artefacts, plain
copy, motion with a job, reduced motion, no scroll listeners, audit before redesign. The
differences, and which side wins:

| taste-skill says                                            | Here                                                                                                                                                                                                  |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js / React, Tailwind v4, Motion, GSAP skeletons        | Astro components, tokens, vanilla TS in `src/scripts/`, `data-reveal` presets. See [stack-translation.md](./stack-translation.md).                                                                    |
| Images: generation tool first, then picsum                  | Only Parker's real work through `npm run media`. If media is missing, it's the owner's to supply.                                                                                                     |
| Pick Geist, Satoshi, Cabinet Grotesk…; Phosphor icons       | Geist and Geist Mono are fixed; the arrows are authored components and the logo is the supplied brand mark. Font or icon changes are brand decisions.                                                 |
| Dual theme by default                                       | Already true: every colour is a `light-dark()` token and the toggle switches the whole page.                                                                                                          |
| "Organic, messy" realistic numbers; invented brand names    | Never. Fact-only: every number, name, and claim traces to a source.                                                                                                                                   |
| No section-numbering eyebrows (`001 · Capabilities`)        | The home page's `01 / LABEL ── Action →` headings are approved identity: keep them, don't number new UI. See [anti-slop.md](./anti-slop.md#applying-it-here).                                         |
| No eyebrows (1 per 3 sections), no blinking-caret heroes    | The hero's mono eyebrow and typed focus line are approved; no eyebrows or carets anywhere else.                                                                                                       |
| No decorative status dots, locale strips, version footers   | The status strip and readouts carry real facts, so they stay. Don't add decorative ones.                                                                                                              |
| No hairline grid lines as decoration                        | The hero's masked grid is the site's one atmospheric background. Nowhere else.                                                                                                                        |
| Hero CTA visible without scroll; no duplicate CTA intent    | Applies. The hero's "CTA" is the path to the work and to contact.                                                                                                                                     |
| Magnetic buttons, glass, spring physics above motion 5      | Off-identity ("instrument, not theatre"): lock-on, decrypt, settle, draw. See [site-style.md](../identity/site-style.md#motion-personality) and [brand.md](../identity/brand.md).                     |
| Cards only when elevation carries hierarchy; tinted shadows | Depth is tone plus hairline, never shadow. Project cards are whole-card links (see [cards.md](./cards.md)).                                                                                           |
| Pre-Flight Check (§14)                                      | Run it, but mark stack-only boxes (`'use client'`, `min-h-[100dvh]`, Tailwind `dark:`) N/A and name the site's analogue. Then grade against [review-checklist.md](./review-checklist.md), which wins. |

**Dials for this site.** The site reads as a developer portfolio (`6 / 5 / 4`) with an
operator-console identity: motion is real but finite (≥ 5 so it actually moves; rarely above 6,
since scroll choreography and pinning are off-identity), density is instrument-like but calm (4 to
5), and variance comes from content priority in the bento, not from chaos (5 to 7). Treat these as
the baseline for the reading of the existing site in any redesign.

[repo]: https://github.com/Leonxlnx/taste-skill
[guide]: https://www.tasteskill.dev/guide?view=full
[docs]: https://www.tasteskill.dev/docs
