# Site style profile: "operator console"

The site's look and feel, written down so new work matches it and audits can judge it. This is
distilled from the code as it stands (`tokens.css`, `global.css`, `Hero.astro`,
`SectionHeading.astro`, `ProjectCard.astro`, `reticle.css`, `src/data/site.ts`). **The code is
the source of truth**: if this page and the code disagree, trust the code and fix this page.

## The idea in one paragraph

A security researcher's portfolio that behaves like **a live instrument**: a calm, cool-neutral
console where one orange "signal" colour marks what matters, labels read like telemetry, and
interactions feel like _acquiring a target_ (brackets lock on, signals decrypt, counters settle).
The instrument frames the work; it never competes with it. Everything is quiet at rest and
crisp when touched.

## Signature elements (approved identity)

| Element                     | Where                                              | What makes it "ours"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signal orange accent        | `--accent` (after the 2021 site's `#f26b1d`)       | The only chromatic colour. Used for state and focus, never as a fill for large areas.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Targeting reticle           | `reticle.css`, `ProjectCard.astro`, `lightbox.css` | Accent corner brackets snap on a beat apart, one scanline sweep, an "Open project" readout, a faint (8%) accent spotlight under the pointer, a 1.02 cover zoom. Hover/focus delight only; touch gets faint brackets at rest. The About constellation reuses the lock-on: brackets close on its last node, and on the field point nearest the pointer (motion on, fine pointer only).                                                                                                                            |
| Mono telemetry labels       | `.mono-label`, section indices, readouts, status   | Geist Mono, uppercase, `0.06em` tracking, 500 weight, muted colour.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Section heading on hairline | `SectionHeading.astro`                             | `01 / LABEL ──────── Action →`; the rule draws out, the index counts up once.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Decrypt / flicker           | `scramble.ts`, section-heading label               | Short, finite glyph scramble on an `aria-hidden` twin; real text never changes.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Terminal prompt + caret     | hero focus line (`focus-line.ts`)                  | `FOCUS ›` key, hanging indent, 3/8 accent block caret. Hero only.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Attack-path graph over grid | `hero-graph.ts`, `.hero__inner::before`            | Masked 64px hairline grid + canvas graph. The site's **only** atmospheric background.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Readouts and status strip   | `Readouts.astro`, `StatusStrip.astro`              | Zero-padded numbers (`pad2`), terse keys (`Now`, `Edu`).                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Experience git graph        | `GitLog.astro`, `src/lib/git-log.ts`               | A real git tree, never floating lines: every lane forks from a commit and merges into one (rounded corners), a lane a connector crosses breaks around it, and unmerged work runs dashed above HEAD. One lane per skill family in its `--family-*` colour; a milestone's skills nest under it on a hairline tree that echoes the graph: the spine is neutral (main), each skill sits further in the further its lane is from main, and the tick into it (and the curve into the last) takes its family's colour. |
| Directional arrows          | `Arrow.astro`                                      | `down` = on-page jump, `up-right` = leaves the page/site, `right` = go deeper. Nudge on hover.                                                                                                                                                                                                                                                                                                                                                                                                                  |

Each of these is specified step by step, with its timings, in [brand.md](brand.md). These
belong to the hero and the core components. **Reuse the component, don't re-draw the
effect**, and don't add a new signature per section (see [anti-slop.md](../design/anti-slop.md)).

## Palette roles

- **Neutrals** are cool greys at hue 255 with almost no chroma (`--bg`, `--surface`,
  `--surface-2`, `--text`, `--text-muted`, `--text-subtle`). Light and dark are both
  first-class; every colour is a `light-dark()` token.
- **Depth is tone plus hairline, never elevation.** Surfaces step `--bg` → `--surface` →
  `--surface-2`; edges are `--hairline` (decorative) or `--rule-ui` (≥ 3:1, for UI boundaries).
  No drop shadows, no glass, no glow halos (the card's faint pointer spotlight is the one
  sanctioned accent light).
- **One accent.** `--accent` / `--accent-hover` for focus, active state, the caret, reticle, the
  signal square, link-underline hover. `--danger` exists for the 404 code only.
- **The logo tile** is the one surface that doesn't follow the theme: the brand mark's paper is
  near-white, so it always sits on the dark theme's `--bg` (`Logo.astro`, the icons, the OG
  card). See [brand.md](brand.md#logo).
- Off-vibe: gradients as fills, a second accent, tinted section backgrounds, coloured shadows,
  pure black/white.

## Type roles

| Role          | Face / token                                  | Notes                                                 |
| ------------- | --------------------------------------------- | ----------------------------------------------------- |
| Display (h1)  | Geist, `--step-5`, 600, lh 1.05, −0.02em      | Names and page titles, short. Never a full sentence.  |
| Section title | Geist, set by `SectionHeading`                | Paired with a mono index; plain noun labels.          |
| Lede / intro  | Geist, `--step-1`, `--text-muted`, ≤ 60ch     | One short paragraph under a title.                    |
| Body          | Geist, `--step-0`, measure `--measure` (66ch) | Project prose via `prose.css`.                        |
| Labels / data | Geist Mono, `.mono-label` treatment           | Keys, indices, tags, meta, readouts. Never body copy. |

Contrast comes from **weight, size steps, and sans-vs-mono**, not from more fonts or colour.

## Shape and layout

- Radii: `--radius-xs` (2px) and `--radius-s` (4px). **Nothing else is rounded**: no pills, no
  12–24px cards.
- Container `--container` (72rem, wider on large displays), gutter `--gutter`, sections
  separated by `--space-section`. Generous space between groups, tight inside them.
- Home is a vertical stack of numbered sections on hairlines; each section leads with its
  content, not with decoration.
- Tap targets ≥ 2.75rem block size for links in lists and rows.

## Motion personality

**Instrument, not theatre.** Motion confirms, locks on, or settles. It is:

- **Short and finite.** `--dur-fast` / `--dur-base` / `--dur-slow` with `--ease-out`. Anything
  that loops (caret blink) has a fixed count; the whole hero intro ends within about 5 s.
- **Staged, not simultaneous.** Pairs land "a beat apart" (reticle corners), indices count up,
  rules draw out from the label.
- **Accessible by construction.** Animated glyphs are `aria-hidden` twins; the real text is in
  the DOM from first paint and never mutates; everything snaps to its final state when motion
  is off (`data-motion="off"` or reduced motion).
- **Never in the way of LCP.** Hero effects start after `load` + idle; nothing hides content at
  rest.
- **Quality first.** Media ships at the best quality its original allows. Only a detected slow
  connection or Save-Data gets lighter content first, upgraded in the background.
  Accessibility, layout stability (CLS), the CSP and the 30 KB script budget still bind.

Off-vibe motion: bounce/elastic easing, long fades, parallax on content, anything that loops
forever, hover effects that visibly scale (beyond the card's 1.02 settle) or rotate images,
scroll hijacking.

## Voice

- **First person, plain, factual.** Short declarative sentences; specifics over adjectives
  ("wrote an AES-256 encryption tool at 15", not "passionate innovator").
- Mono keys are **terse nouns**: `Now`, `Edu`, `Focus ›`, `Projects`, `Featured projects`.
- Action labels say where they go: "Selected work", "All work", "Full index", "Résumé · PDF".
- No hype words, no aphorisms, no em-dashes in new visible copy (see
  [anti-slop.md](../design/anti-slop.md)). Every claim traces to a source (fact-only rule, `CLAUDE.md`).

## On-vibe / off-vibe quick test

| On-vibe                                                   | Off-vibe                                                   |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| Real screenshot or loop of the work, framed by a hairline | Stock illustration, div-built fake UI, placeholder imagery |
| Pixel-sharp at 2×, no visible compression                 | Soft, banded or smeared images; a lossy re-encode          |
| Mono key + value pairs for facts                          | Big-number "stat" tiles with invented or vague metrics     |
| Accent used on one thing per view                         | Accent used as decoration on many things                   |
| Hover: reticle lock-on, underline to accent, arrow nudge  | Hover: lift + shadow, scale, glow, colour-flooded card     |
| Calm sections that let the work carry them                | A new background effect or gradient per section            |
| Square-ish 2–4px corners, tone steps, hairlines           | Rounded pills, soft shadows, glassmorphism                 |

When a new feature needs something this profile doesn't cover, extend the profile in the same
change so the next agent inherits the decision.
