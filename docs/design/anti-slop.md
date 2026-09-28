# Avoiding the generic "AI-generated" look

## TL;DR: rules

1. **Models converge on safe defaults**, and visitors recognise the result instantly as "AI
   slop". Every visual choice should be a decision made for this site, not the first thing
   that came to mind.
2. **Commit to one aesthetic.** Use one accent colour locked across the whole page, one
   corner-radius scale, one theme at a time (the site's light/dark toggle switches the whole page; no single section
   flips theme), and tokens (CSS
   variables) for all of it.
3. **One authored motion moment** beats scattered micro-effects (see [motion.md](./motion.md)).
4. **Real artifacts, never fakes.** Use real screenshots and loops of the work. No div-built
   fake terminals or dashboards, no clip-art SVG scenes, no invented numbers.
5. **Plain, specific copy.** No buzzwords, no cute aphorisms, no poetic section labels. Name
   things plainly.
6. **The brief wins.** A deliberate, owned choice beats a rule on this list. When the site's
   established identity uses a listed pattern on purpose, keep it, and don't spread it further.

## Evidence

### Why it happens ([Anthropic, "Improving frontend design through Skills"][anthropic])

"Distributional convergence": safe choices dominate training data, so unguided output drifts
to Inter/Roboto, purple gradients on white, minimal motion, and predictable layouts. The fix
is explicit guidance on four axes:

- **Typography:** distinctive faces, high-contrast pairings, strong weight contrast, and
  decisive size jumps rather than timid steps.
- **Colour and theme:** a cohesive aesthetic in CSS variables; **dominant colours with sharp
  accents** beat timid, evenly distributed palettes.
- **Motion:** CSS-first. "One well-orchestrated page load with staggered reveals … creates
  more delight than scattered micro-interactions."
- **Backgrounds:** atmosphere and depth rather than flat fills, but only depth that belongs
  to the site's world. Stock decoration (glow halos, hairline grids, stripes) is itself a tell
  (next section).

How that lands here: the faces are fixed (Geist + Geist Mono, self-hosted); get contrast from
weight, the `--step-*` scale, and mono-vs-sans roles, not by adding fonts. The accent and
neutrals are the tokens in `tokens.css`. The hero's field and graph are the site's one
atmospheric background; other sections stay calm so the work carries them.

### Named tells ([impeccable][impeccable] detector rules, [taste-skill][taste] §9)

Two agent-skill projects keep catalogues of these patterns. They agree on most items:

| Area       | Avoid                                                                                                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colour     | Purple/violet gradients, cyan-on-dark, neon glows; coloured zero-offset "glow" shadows; decorative radial halos behind heroes; reflexive cream/beige backgrounds; pure `#000`      |
| Type       | Gradient text (`background-clip: text`); flat hierarchy (adjacent sizes < 1.25× apart); oversized full-sentence h1s; destructive negative tracking; italic-serif display by reflex |
| Structure  | A thick coloured `border-left` on cards; cards nested in cards; rows of identical icon-tile + heading + text cards; the hero-metric template (big number plus small label)         |
| Labels     | Kicker/eyebrow labels above headings; section numbers (01 / 02 / 03) that carry no information; `01 / 4` pagination on tiles; pills overlaid on images                             |
| Decoration | Hairline grid backgrounds; repeating-stripe gradients; pulsing status dots; blinking-caret "typing" in a hero; marquees; scaling or rotating images on hover; glass as decoration  |
| Motion     | Bounce/elastic easing; identical fade-up on every section; content hidden at rest until JS reveals it; animating `width`/`height`/`margin`                                         |
| Copy       | "Streamline / empower / supercharge / cutting-edge"; "X. No Y." aphorisms; em-dash saturation; generic "Step 1 / Step 2" labels; duplicate CTAs with the same intent               |

Quality floors from the same detectors: WCAG AA contrast (4.5:1 body, 3:1 large); never gray
text on a coloured surface (tint it from the surface hue); body ≥ 14px (16px ideal) and UI text
≥ 11px; line height ≥ 1.3 (1.5–1.7 for body); lines ≤ ~80 characters; no skipped heading
levels; more space above a heading than below it.

## Applying it here

**The brief wins, and Parker has approved the hero.** Some of the site's established
identity matches patterns on these lists. They are deliberate and part of the approved look.
**Don't remove them unasked, and don't copy them into new sections by reflex:**

| Existing pattern                           | Where                                         | Guidance                                                                                                                                               |
| ------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mono eyebrow above the h1 (`site.eyebrow`) | `Hero.astro`                                  | Keep. Don't add eyebrows above other headings.                                                                                                         |
| Typed focus line with a blinking caret     | `Hero.astro`, `src/scripts/focus-line.ts`     | Keep: finite, ends within 5 s, reduced-motion safe. It's the hero's one authored moment, so don't repeat it elsewhere.                                 |
| Numbered section headings (01–05)          | `SectionHeading.astro` on the home page       | Established; flag it if a redesign is on the table. Don't number new UI.                                                                               |
| Pointer spotlight and reticle on cards     | `ProjectCard.astro`, `src/styles/reticle.css` | Part of the targeting-HUD identity. Keep it subtle, and never let it carry information.                                                                |
| Geist / Geist Mono                         | `astro.config.ts`                             | impeccable lists Geist as overused; taste-skill recommends it. Changing it is a brand decision for Parker.                                             |
| Em-dashes in copy                          | ~120 across `src/`                            | Don't add new ones to visible site copy (pages, frontmatter, `site.ts`); prefer periods, commas, colons. Code comments and these docs aren't affected. |

For new work: plain headings with no kicker, one accent, real project imagery, no invented
metrics (also the repo's fact-only rule), and nothing in the copy table above.

[anthropic]: https://claude.com/blog/improving-frontend-design-through-skills
[impeccable]: https://github.com/pbakaus/impeccable
[taste]: https://github.com/Leonxlnx/taste-skill
