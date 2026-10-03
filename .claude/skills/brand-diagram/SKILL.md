---
name: brand-diagram
description: Use when the user asks for a diagram, flow, architecture sketch, comparison table or explainer graphic for the Portfolio site, or runs /brand-diagram. Produces an on-brand dark "operator console" WebP that matches the TongueTickle flow-and-provider-registry diagram.
argument-hint: <description of the diagram> [project <slug>]
---

# /brand-diagram

Make a diagram image in the site's own look (graphite ground, hairline frames, one signal-orange
accent, Geist + mono telemetry labels) from `$ARGUMENTS`. The reference is
`src/content/projects/tonguetickle/flow-and-provider-registry.webp`; `example.html` in this
folder reproduces it. If `$ARGUMENTS` is empty, ask for the description and stop.

## Rules

- **Fact-only.** Every node, label and number must come from a source: the project's own repo,
  the legacy site (`git show d8782d1:<path>`), or something Parker stated. Read the source
  first. Omit what you can't cite; never invent steps, metrics or names.
- **Scan-first.** One idea per diagram, at most two stacked sections, 3-5 items each. Short
  labels (title 2-3 words, description under 70 characters). Lead with the most important item.
- **One accent.** Orange marks the one thing that matters (first/primary row, the flow arrows,
  the index numbers). Everything else is neutral. No second colour, gradients, shadows, glow or
  rounded corners.
- **Style lives in `kit.css`.** Use its classes; never add inline colours, fonts or one-off
  CSS. If the kit lacks something, extend `kit.css` so every diagram inherits it.
- Copy rules from `docs/identity/site-style.md`: terse mono keys, plain declaratives, no hype
  words, no em-dashes.

## Pick the layout

| The content is...                          | Use                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| A sequence (pipeline, request path)        | `.flow` with 3-5 `.step`s                                                |
| A ranked or ordered list, a fallback chain | `.rows`, first `.row.is-signal`, last `.is-quiet`                        |
| Parts of a thing, a feature set            | `.cards` (`style="--cols:3"` is a layout var, ok)                        |
| Relationships, layers, trust boundaries    | Inline `<svg class="diagram">` with the SVG classes                      |
| A timeline                                 | `.trace` with `.pt` points, the last `.is-now`                           |
| Project or image tiles                     | `.bento.b5` of `.tile`s (image + `.cap`)                                 |
| A banner or splash (name, photo, CTA)      | `.split`, `.display`, `.lede`, `.prompt`, `.reticle`, `.readout`, `.cta` |

Combine at most two (the reference is `.flow` over `.rows`). Section headings are
`<span class="mono sec"><span class="ix">01</span> / Label</span>`. Add a `.foot` strip: a
plain note on the left, the project name on the right.

## Steps

1. **Source the facts** for the description. Name the sources; they go in the project's
   `# Sources:` header later.
2. **Write the fragment** to `.cache/diagrams/<slug>.html`: only `<main class="canvas">…</main>`
   (copy the shape from `example.html`). The canvas defaults to 1200x720 CSS px; pass
   `--size 1200x320` for banners. Content that overflows (or a broken image) makes the render
   fail, so cut copy rather than shrinking type. `{{ROOT}}` in the fragment is the repo root, for
   embedding repo images (`<img src="{{ROOT}}/src/assets/…">`).
3. **Render:**

   ```bash
   node .claude/skills/brand-diagram/scripts/render.ts .cache/diagrams/<slug>.html
   ```

4. **Look at the PNG** (Read it). Check: nothing cramped or clipped, text readable at half
   size, one accent focal point, no label wrapping badly, spacing matches the reference. Fix
   the fragment and re-render until it passes.
5. **Encode into the project** only if a project is named (or obvious from the description).
   Never hand-encode or commit the PNG; use the media pipeline:

   ```bash
   npm run media -- .cache/diagrams/<slug>.png --project <project-slug>
   ```

   Then add the printed `media:` entry to the project's `index.md` with alt text that
   describes what the diagram shows (not "diagram"), a one-line caption, `wide: true`, and a
   `# media:` source line citing what the diagram was authored from. Run `npm run check:media`.

6. **No project named** (a README banner, a doc, a social image): render to the destination
   with `--out <path>.webp` (WebP is encoded from the 2x PNG), keep the fragment next to it,
   and report the path. README banners: `.github/readme/src/*.html` → `.github/readme/*.webp`.

## Common mistakes

| Mistake                                       | Fix                                                   |
| --------------------------------------------- | ----------------------------------------------------- |
| Orange on several things                      | One focal item; arrows and indices are the exceptions |
| Paragraph-length descriptions                 | Cut to a phrase; the case study holds the detail      |
| Three or more stacked sections                | Split into two diagrams                               |
| Invented steps to make the flow look fuller   | Fewer, true steps beat a fuller, guessed flow         |
| Adding inline `style=` colours                | Use kit classes or extend `kit.css`                   |
| Committing the PNG or editing `.webp` by hand | Always go through `npm run media`                     |
