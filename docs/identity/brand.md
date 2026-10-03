# Brand patterns

The named, reusable patterns that make Parker Jackim's work recognisable: the moves someone
should be able to spot and say "that's his". Use this page to reuse a pattern by name, rebuild it
somewhere new (another site, a slide, a video), or decide whether a new idea deserves a place.

The site's general look (palette, type, layout, voice) lives in [site-style.md](site-style.md).
This page covers only the signatures. **The code is the source of truth**: every value below is
copied from the file named in its _Source_ line, and if they disagree, fix this page.

## The idea

**Acquiring a signal.** Everything reads as a quiet instrument picking out a target: a single
orange signal moves, locks on, decodes, or settles, then goes still. The patterns share one
story arc (search → lock → resolve) and one small kit of parts, so they feel related wherever
they appear.

## Shared parts

Every pattern is built only from these. A new pattern that needs a part not on this list is
probably off-brand.

| Part            | Spec                                                                     |
| --------------- | ------------------------------------------------------------------------ |
| Signal orange   | `--accent`, the only chromatic colour. Marks the one thing that matters. |
| Cursor block    | A solid accent rectangle standing for "live input here".                 |
| Corner brackets | Four L-shaped accent corners around a target, never a full box.          |
| Mono telemetry  | Geist Mono, uppercase, `0.06em` tracking, 500 weight, muted colour.      |
| Hairline        | A 1px low-contrast line: grid, graph edge, section rule, card frame.     |
| Glyph set       | `A–Z 0–9 / _ < > # %`: the only characters noise is drawn from.          |

## Logo

The mark is a paper-fold "P" in near-white with an orange "J" in its counter. It is the one asset
here that is not built from the shared parts: it is a supplied illustration, used as given.

- **Master:** `src/assets/brand/logo.png`, a transparent 1254×1254 PNG. `npm run og` crops it to
  its shape (`logo-mark.webp`, which the header and footer serve) and renders the favicon, touch
  icons and OG card from it. Never redraw or recolour it.
- **Ground:** always graphite (the dark theme's `--bg`), in both themes. The paper is close to
  white and vanishes on a light ground, so `Logo.astro` draws the mark on a fixed tile (4px
  radius, `--radius-s`) and the icons do the same. The OG card's own ground is already graphite.
- **Size:** a 2.25rem tile in the header, 2rem in the footer, the mark filling 72% of it. The
  home link carries the accessible name; the mark itself is decorative.
- **Still.** The mark doesn't animate. The blinking accent block belongs to the typed prompt,
  not the header.
- **Source:** `src/components/Logo.astro`, `scripts/og/`.

## Pattern index

| Pattern                             | One line                                                        | Lives in                |
| ----------------------------------- | --------------------------------------------------------------- | ----------------------- |
| [Signal trace](#signal-trace)       | An orange pulse hops a path through the graph and locks a node. | Hero backdrop           |
| [Decrypt](#decrypt)                 | Text resolves out of cycling glyphs, or briefly glitches.       | Hero eyebrow, headings  |
| [Lock-on reticle](#lock-on-reticle) | Corner brackets snap onto a target in two beats.                | Project cards, lightbox |
| [Cursor block](#cursor-block)       | The accent block as a mark: the caret and the signal square.    | Hero, 404               |
| [Typed prompt](#typed-prompt)       | `KEY ›` then text typed out behind a block caret.               | Hero focus line         |
| [Readout reels](#readout-reels)     | Each digit drum turns one revolution and settles on its value.  | Hero readouts           |
| [Rule draw](#rule-draw)             | A mono index counts up and a hairline draws out from a label.   | Section headings        |

Each pattern below uses the same five fields: **Signals**, **Anatomy**, **Values**, **Rules**,
**Source**.

## Signal trace

Also called the attack-path trace.

- **Signals:** an exploit chain landing. Entry, hops, target acquired. It is the brand story
  played as a 2-second loop.
- **Anatomy:**
  1. On a field of drifting hosts joined by hairlines, pick an entry host, favouring the part of
     the field that is most visible.
  2. Random-walk 3–6 hops along existing edges, never revisiting a host.
  3. A pulse runs the chain: a bright head with a soft halo and a tail that brightens toward
     the head. The covered path stays as a faint accent line.
  4. Each host flashes as the pulse reaches it.
  5. On arrival the whole chain glows, and corner brackets close in on the target.
  6. Chain, target and brackets fade out together. The field is calm until the next trace.
- **Values:** first trace at 1.4 s, then every 3.5–6 s; at most 2 at once; pulse 600 px/s;
  tail 110 px; host flash 650 ms; glow and fade 800 ms (quadratic); brackets close from about
  13 px to 7 px half-size over 200 ms, ease-out.
- **Companion (pointer as node):** the pointer links to hosts within 180 px in accent, and
  they lean up to 16% of the distance toward it. Same graph, same colour, driven by the visitor.
- **Rules:** accent only on the trace, never on the resting graph. The graph is the site's one
  atmospheric background; don't add a second one. With motion off, show one still frame with no
  pulses.
- **Source:** `src/scripts/hero-graph.ts`.

## Decrypt

Also called the scramble. Two modes of one function.

- **Signals:** a message being decoded. The text was always there; you are watching it resolve.
- **Anatomy, full decrypt:**
  1. Every letter and digit is replaced with a random glyph; spaces and punctuation hold.
  2. The line stays fully scrambled for the first 20% of the run.
  3. A sweep locks characters left to right onto their real values while the rest keep
     re-rolling.
- **Anatomy, signal flicker** (the lighter mode for repeated labels):
  1. About a third of the letters, picked at random, each get a short window within the run.
  2. Inside its window a glyph re-rolls, then settles. The rest never change.
- **Values:** re-roll every 40 ms (about 25 Hz reads as decoding; 60 Hz reads as noise); full
  decrypt 650 ms on the hero eyebrow; flicker 400 ms at 35% density on section headings; any
  run capped at 700 ms.
- **Rules:** monospace only, one glyph for one character, so the line never changes width. Run
  it on an `aria-hidden` copy; the real text is in the DOM from first paint and never changes.
  Use the full decrypt once per page (the hero); everything further down uses the flicker.
- **Source:** `src/scripts/scramble.ts`, `src/scripts/interactions.ts`.

## Lock-on reticle

- **Signals:** target acquired. It is the brand's hover and focus state.
- **Anatomy:**
  1. Four accent corner brackets wait slightly outside the frame, then snap in.
  2. One diagonal pair lands first, the other pair a beat later.
  3. A single scanline sweeps the target once.
  4. A mono readout ("Open project") fades in after the brackets.
  5. With a fine pointer, a faint accent spotlight follows the pointer across the card, and the
     cover settles in by 1.02.
- **Values:** snap 160 ms, beat 50 ms, readout delay 90 ms, scan 700 ms on
  `cubic-bezier(0.45, 0, 0.25, 1)`; arms 14 px, stroke 1.5 px (tunable per use through
  `--reticle-arm`, `--reticle-stroke`, `--reticle-inset`).
- **Rules:** brackets, never a full outline. Keyboard focus gets the same lock-on as hover.
  Touch shows quiet brackets at rest, with no scan and no spotlight. Put the `reticle` class on
  the element; don't redraw the corners.
- **Source:** `src/styles/reticle.css`, `src/components/ProjectCard.astro`,
  `src/styles/lightbox.css`.

## Cursor block

- **Signals:** a live terminal. The same solid accent block recurs wherever input would be.
- **Anatomy:** a solid accent rectangle, always upright, placed where input would be.
  1. **Caret:** the typed prompt's accent block (below).
  2. **Signal square:** a 0.5 rem accent square leading the hero eyebrow. The 404 line uses the
     same square in `--danger`, the one place the block changes colour.
- **Values:** caret 0.5 em wide, full line height; signal square 0.5 rem.
- **Rules:** the block is always the accent colour (the 404 error square excepted) and always
  square-cornered. It blinks only as the caret, and only a fixed number of times.
- **Source:** `src/components/Hero.astro`, `src/pages/404.astro`.

## Typed prompt

- **Signals:** a live shell reporting what Parker is focused on.
- **Anatomy:**
  1. A mono key and chevron (`FOCUS ›`) with the value in a hanging indent.
  2. While waiting to start, the caret blinks.
  3. The first area types out behind a solid caret, then holds while the caret blinks.
  4. Further areas are appended with `·`, never deleted and retyped.
  5. It lands on the full line, the caret blinks briefly, then stops.
- **Values:** 40 ms per character, 1.1 s hold between areas, 300 ms caret tail; blink is 1 s
  `steps(1, end)`, at most 5 runs; the whole sequence ends within 5 s (WCAG 2.2.2).
- **Rules:** hero only. The settled line reserves its height from the start, so typing never
  shifts layout. The real text sits in a visually hidden copy.
- **Source:** `src/scripts/focus-line.ts`, `src/components/Hero.astro`.

## Readout reels

- **Signals:** an instrument reading settling, not a marketing counter.
- **Anatomy:**
  1. Each digit is a clipped drum parked on its final value, so the static state is correct.
  2. Once the row is mostly on screen, every drum turns one full revolution from its own digit
     back onto it, left to right.
  3. In transit, digits fade toward the window edges like a physical drum.
- **Values:** 620 ms per reel on `cubic-bezier(0.16, 0.84, 0.3, 1)`, 45 ms stagger, starts at
  75% visibility; zero-padded numbers (`pad2`) on tabular digits.
- **Rules:** a reel never shows a wrong value at rest and never counts up from zero. Terse mono
  keys only (`Now`, `Edu`). Numbers must be real facts; no invented stats.
- **Source:** `src/scripts/readouts.ts`, `src/components/Readouts.astro`.

## Rule draw

- **Signals:** a new section coming online, in the pattern `01 / LABEL ──────── Action →`.
- **Anatomy:**
  1. The mono index counts up from `00` to its own number.
  2. The label arrives with the decrypt's signal flicker.
  3. The hairline rule draws out from the label toward the action link.
- **Values:** count-up 420 ms, eased, on tabular digits; rule draw 700 ms, `--ease-out`.
- **Rules:** only headings that were below the fold play it; a rule the reader has already seen
  never redraws. Print always shows the rule. Use `SectionHeading`; don't rebuild it per
  section.
- **Source:** `src/components/SectionHeading.astro`, `src/scripts/interactions.ts`.

## Rules for every pattern

1. **Accent on one thing at a time.** A pattern owns the accent while it plays; nothing else in
   view competes.
2. **Finite.** Every run ends. Nothing loops forever except the trace's quiet, spaced idle.
3. **Real content never moves.** Animated glyphs are `aria-hidden` copies; layout is reserved
   before motion starts; nothing blocks the first paint.
4. **Motion off means final state.** Honour `prefers-reduced-motion` and the site's motion
   toggle, and snap to the end state if motion is switched off mid-run.
5. **Reuse, don't redraw.** Use the named component or script, and keep each pattern where it
   lives. A signature copied into every section stops being a signature.

## Adding a pattern

A new pattern joins this page only if it passes all four tests:

1. It is built only from the [shared parts](#shared-parts).
2. It plays the brand story (search, lock, resolve) rather than decorating.
3. It is recognisable in a still frame or a one-second glance.
4. It satisfies every rule above and ships with its values in code.

Add it with the same five fields and a row in the [pattern index](#pattern-index), in the same
change that adds the code.
