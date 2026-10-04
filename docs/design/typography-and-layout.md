# Typography, layout, and craft checks

## TL;DR: rules

1. **Squint test.** Blur the page: the primary element, the secondary element, and the major
   groups should still read in order.
2. **Group by proximity first**, containers second. Rhythm comes from contrast between tight
   gaps (inside a group) and generous gaps (between groups). One spacing value everywhere
   flattens everything.
3. **Obvious type steps.** Heading, body, label, and meta roles are distinguishable without
   reading. The source asks for size steps of at least 1.25×; the site's adjacent `--step-*`
   tokens are closer (about 1.1–1.25×), so when size alone must separate two roles, skip a
   step, and let weight, colour, and mono-vs-sans carry the rest.
4. **Readable body text:** at least 1rem (`--step-0`), 45–75 characters per line (aim 65–75ch), line height about
   1.5–1.7, left-aligned (not justified).
5. **Short surface copy:** headlines of about 8 words or fewer, a sub-paragraph of about 25
   words or fewer, then one visual or one action.
6. **Lock the system:** one accent colour, one radius scale, one label per intent (not
   "View work" in one place and "Browse projects" in another).
7. **Finish the browser's surfaces:** text selection, focus rings, scrollbars, caret, and
   underline offset themed from the palette. It's the cheapest sign a page was designed.

## Evidence

### Craft floor ([impeccable, `craft-floor`, `typeset`, `layout`][imp])

- Contrast: body ≥ 4.5:1, large ≥ 3:1. Secondary text on coloured surfaces is tinted from that
  hue, never gray.
- Depth: shadows have an offset and a soft blur. A zero-offset coloured halo is decoration.
- Spacing: more space above a heading than below it, so the heading binds to its content.
- Type: body measure 65–75ch, display at most 6rem, tracking no tighter than −0.04em, balanced
  headings. Test the real copy at every breakpoint.
- Light text on dark surfaces needs slightly more line height, a touch more tracking, and one
  step more weight.
- Use tabular numerals for data. Load only the font weights you use, with metric-compatible
  fallbacks.
- Layout: one spacing scale with useful middle steps (here: `--space-3xs`…`--space-3xl`, plus
  `--space-section` between sections); `gap` for sibling rhythm; keep DOM
  order, focus order, and visual order in agreement at every breakpoint.
- "Variation is not a goal by itself. Repetition should support recognition; break it only
  when content or priority changes."
- Coverage: every requirement in the brief should be "present and findable within seconds."

### Layout discipline ([taste-skill][taste] §4.7–4.9)

- The hero fits the first viewport; headline ≤ 2 lines on desktop; supporting text ≤ 20 words.
- Don't repeat a layout family section after section (e.g. several identical image+text
  zigzags in a row); vary the composition when the content changes.
- A bento grid has **exactly** as many cells as there is content. No filler tiles.
- A long flat list with a hairline under every row is the laziest layout. When there are more
  than about 5 items, group them, show the top few with a link to the rest, or give each an
  image. Exception: views built for comparison or lookup (the `/work/` index) stay
  lists, per NN/g ([cards.md](./cards.md)), made scannable by grouping and filters instead.
- One copy register per page (don't mix terminal-mono telemetry, editorial prose, and
  marketing punch without reason).
- Portfolios are visual products: a text-only section where the work could be shown is
  unfinished.

## Applying it here

- Tokens live in `src/styles/tokens.css`; global rules in `global.css`; long-form project
  text in `prose.css`. Change values there, not with one-off literals.
- Project prose already has a measure; keep home-page copy blocks short enough to be
  scanned, not read (see [scanning-and-reading.md](./scanning-and-reading.md)).
- The mono face is the site's "instrument readout" voice (eyebrow, labels, readouts). Keep it
  to labels, data, and code. It shouldn't become the voice of body copy.
- Verify in the browser at desktop and mobile widths in both themes before calling UI work
  done (per `CLAUDE.md`), and check the squint test on the result, not the code.

[imp]: https://github.com/pbakaus/impeccable
[taste]: https://github.com/Leonxlnx/taste-skill
