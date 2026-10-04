# Cards

## TL;DR: rules

1. A card is **a short, linked representation of one thing**: image, title, short summary,
   a little meta. It's an entry point to detail, not the detail itself.
2. **The whole card is clickable**, but through **one real link** (the title), stretched over
   the card with a pseudo-element. Do **not** wrap the card in `<a>`, and do **not** also link
   the image to the same URL.
3. **Visible hover and focus states** on the whole card. Signal clickability with a border or
   background contrast and a hover or shadow change.
4. Secondary links inside a card sit **above** the stretched link (`z-index`) with dead space
   around them to prevent mis-taps.
5. Cards suit **browsing heterogeneous work**. They're weaker than lists for **comparing**
   similar items, so the `/work/` index can stay a list.

## Evidence

### What cards are for ([NN/g, "Cards: UI-Component Definition"][nng-cards])

- Definition: "a container for a few short, related pieces of information … a linked, short
  representation of a conceptual unit."
- Typical contents: image or rich media, title, short summary, timestamp/attribution, CTA,
  secondary elements (tags).
- Cards group content through the **common-region** principle (a shared border or background),
  which can override proximity.
- **Work well for:** browsing (not searching), heterogeneous content, entry points to detail,
  touch interfaces.
- **Work poorly for:** homogeneous content, side-by-side comparison, ranked/search results.
  Cards are **less scannable than a vertical list** and take more space.
- The **entire card should be clickable** (larger touch target). Use fixed widths with flexible
  heights.

### Accessible whole-card link ([Kitty Giraudel, "Accessible Cards"][kitty])

Link only the title and stretch its hit area over the card with a positioned pseudo-element:

- The card is `position: relative`; the title's `<a>` gets a `::before` (or `::after`) with
  `position: absolute; inset: 0`, so the whole card is clickable through one link.
- Hover and focus styles hang off that pseudo-element (and `:focus-visible` on the link), so
  the whole card reacts. **Keep a visible focus indicator.** Never remove the outline without
  an equally visible replacement (WCAG 2.2 AA, 2.4.7 and 2.4.11).
- Any secondary link inside the card is `position: relative` with a higher `z-index` than the
  stretched pseudo-element, with space around it to prevent mis-taps.
- The image is decorative (`alt=""`) because the title already names the link.

Why: screen readers list one clearly named link per card, the text stays selectable, and the
whole surface is still a target. **The canonical implementation in this repo is
`src/components/ProjectCard.astro`.** Copy its structure, not the article's demo code.

### Pitfalls ([UC Berkeley DAP, "Accessible card UI component patterns"][berkeley])

Three valid patterns: whole card clickable, heading link only, CTA only. Whole-card gives "a
large clickable area" for mobile, touch, and tremor users. Pitfalls:

- **Redundant links:** image and title both linking to the same place means screen readers hear
  it twice and keyboard users tab twice.
- **Unclear clickability:** insufficient contrast or no affordance between linked and unlinked
  text.
- **Generic CTAs** ("Read more") need ARIA labels and break voice control ("click Read more"
  is ambiguous).
- **Missing focus indicators.**
- "Do NOT wrap your cards with `<a>` links!"

## Applying it here

- `src/components/ProjectCard.astro` **already follows this**: the title link is stretched
  over the card, the cover is decorative (`alt=""`), and hover/focus show the reticle HUD.
  Keep that structure when changing cards; don't add a second link to the cover.
- The card should carry enough on its own (cover plus 2–3 sentence summary plus a few tags)
  that the visitor gets the point **without clicking**. The click is for depth.
- Hover-only extras (the reticle, a hover-played loop) are fine as delight, but nothing
  essential may be hover-only. Touch and keyboard users must see the same essentials at rest
  or on focus.
- The `/work/` index is a comparison/browse-by-list view, so a list is the right form there per
  NN/g.

[nng-cards]: https://www.nngroup.com/articles/cards-component/
[kitty]: https://kittygiraudel.com/2022/04/02/accessible-cards/
[berkeley]: https://dap.berkeley.edu/websites/accessibility-guidance-developers/card-ui-component
