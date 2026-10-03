# Decoding the request and interviewing

## Vague-word decoder

Users describe a feeling; taste-skill needs concrete vibe words, dial nudges, and the right
companion skill. Map each word through this table, then check it against the surface. Nudges
are relative to the site baseline in `docs/design/taste-skill.md#applying-it-here`
(variance 5 to 7, motion 5, density 4 to 5). "Ask?" marks words that are genuinely ambiguous: they
need a question unless the context already settles them.

| User says…                                       | Usually means here                                                                                           | Vibe words for the brief           | Dials                 | Add skill                    | Ask? |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ---------------------------------- | --------------------- | ---------------------------- | ---- |
| pop, stand out, more impact, grab attention      | Stronger hierarchy: the best work bigger and earlier (G3), sharper size contrast. **Not** more colour.       | decisive, high-contrast, confident | variance +1           | `redesign-existing-projects` | Yes  |
| modern, fresh, dated, old-looking                | §11.D levers 1 to 2: type scale and spacing rhythm. Rarely a new layout.                                     | current, precise, unfussy          | none                  | `redesign-existing-projects` | No   |
| premium, expensive, polished, high-end           | Restraint: more space between groups, fewer competing items, crisper edges, no decoration.                   | restrained, precise, quiet         | density −1            | `high-end-visual-design`     | No   |
| clean, minimal, simpler, less busy, cluttered    | Fewer things on the surface; detail moves behind the click (progressive disclosure).                         | restrained, editorial, calm        | density −1, motion −1 | `minimalist-ui`              | No   |
| cool, fun, alive, interactive, satisfying, juicy | Goal 2: one authored interaction built from the brand patterns (lock-on, decrypt, settle, draw).             | alive, responsive, tactile         | motion +1 (max 6)     | none                         | Yes  |
| techy, hacker, cyber, terminal, security-y       | The instrument side: telemetry keys, readouts, Swiss grid. Not fake terminals, CRT scanlines, or green text. | instrumental, telemetric, exact    | density +1            | `industrial-brutalist-ui`    | No   |
| boring, generic, template-y, AI-looking          | An anti-slop pass on that surface: find the tells and fix them.                                              | distinct, specific, owned          | none                  | `redesign-existing-projects` | No   |
| readable, scannable, too much text               | Layer-cake: short headings, facts as labels, shorter paragraphs.                                             | scannable, layered, direct         | density −1            | `minimalist-ui`              | No   |
| bento, grid, tiles, mosaic                       | A varied-size grid ranked by strength, N items in N cells.                                                   | ranked, asymmetric, varied         | variance +1           | `gpt-taste` (cell rule only) | No   |
| like <site or product>                           | One specific quality of that reference (layout, motion, type, or density), not a copy.                       | from the answer                    | from the answer       | depends                      | Yes  |
| bigger, more visible, more prominent             | Size and position in the hierarchy, usually of images of the work.                                           | prominent, image-led               | none                  | none                         | No   |
| professional, serious, credible                  | Fewer effects, plainer copy, facts forward. Watch for overcorrecting into a static template.                 | credible, plain, factual           | motion −1             | none                         | No   |

If a word isn't here, find its nearest row, or ask what the user would point at on screen to
show it.

## Question bank

Walk these in order and skip any the request, code, or docs already answer. Each question lists
the default to recommend when nothing in context argues otherwise. Adapt the wording to the
request; don't read these out verbatim.

1. **Outcome.** "After scrolling past this, what should a visitor know or feel that they don't
   now?" Recommend the goal it most plausibly serves (G1 story, G2 work visible without a click,
   G3 strongest work biggest, Goal 2 interaction, Goal 3 contact), phrased as a visitor takeaway.
2. **Surface.** "Which part exactly?" when the request could mean several (for example "the
   cards" could be `ProjectCard` on home, `ArchiveRow` in earlier work, or the `/work/` grid).
   Recommend the one the request's wording and the latest audit point at.
3. **Mode.** "Keep the current look and sharpen it, or rethink this section's structure?"
   Recommend **preserve** unless the user said "redo", "rethink", or "from scratch". A change to
   the identity itself (accent, fonts, logo, the reticle) is a brand decision: confirm it
   explicitly.
4. **Content and media.** "Does <project/section> have <the media or fact the idea needs>?"
   Only ask after checking `src/content/`. Recommend using what exists; missing items are
   "owner to supply", never placeholders.
5. **Feel.** For ambiguous vibe words ("pop", "cool", "like X"), offer the concrete readings as
   options with an ASCII `preview` when they differ structurally. For "pop", for example:
   bigger and earlier strongest work (Recommended), a sharper hover and focus moment, or a
   different layout for the section. Colour is locked, so it's never an option.
6. **Motion.** "What's the one thing that should feel satisfying to poke?" Recommend reusing a
   brand pattern (lock-on reticle for targets, decrypt flicker for labels, readout settle for
   numbers, rule draw for section openings) over inventing a new effect. Always state the
   motion-off end state.
7. **Scope.** "Anything this must not touch?" Recommend protecting URLs, anchors (`#work`,
   `#contact`, the `legacy-anchor` spans), `legacyPaths`, nav labels, the numbered section
   headings, and every contact channel.

## When to stop

Stop when all of these hold:

- Every brief field has a value from the request, code, docs, or an answer.
- You can say in one sentence what the result looks like at 390px and at 1280px.
- No remaining guess would change the structure, the content, or the motion moment.

Anything left is a minor assumption: state it under **Assumptions** in the prompt so the user can
correct it when you show the prompt, instead of spending a question on it.
