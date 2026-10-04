# Bento grids (varied-size layouts)

> **Source strength: moderate.** Practitioner guidance, not user research. The underlying
> idea (size and position signal importance) is well supported. The source's numbers are
> generic web defaults; this site's tokens and breakpoints replace them (see
> [stack-translation.md](./stack-translation.md)).

## TL;DR: principles

1. **Size is the volume knob.** The most important item gets the biggest cell in the prime
   spot (first in source order, top-left visually). Varying size is the point; **all-equal
   cells defeat the pattern**.
2. **Exactly as many cells as content.** No filler tiles, no empty cells.
3. **Keep it sparse.** Past roughly 12–15 visible cells the organising benefit is lost.
4. **One base unit.** Cells span whole multiples of a column (and row) on a shared grid with
   one gap and one radius used everywhere.
5. **Inside a cell: visual → headline → supporting detail.**
6. **Collapse deliberately.** Fewer columns as width drops, and a single column on phones,
   with the most important item still first and still visibly the lead.
7. **For non-sequential browsing** (portfolio showcases). Not for anything with a required
   reading order or side-by-side comparison.

## Evidence

From [Landdding, "Bento Grid Design"][landdding] (the more detailed [SaaSFrame
guide][saasframe] blocked automated fetching; its search summary agrees on the 12–15 cell
ceiling and on equal sizes being the main mistake), with the cell-count rule from
[taste-skill][taste]:

- Wide screens: a 4–6 column base grid with 1-, 2-, or 4-column spans; mid widths about 3
  columns; phones a single column.
- Largest cell in the prime spot; multi-column spans signal importance; a subtle tint can
  group related cells.
- Common mistakes: equal sizes, inconsistent spacing, losing the hierarchy on mobile,
  overcrowding, and filler cells.

## Applying it here

- **Where:** only the featured showcase (`src/components/ProjectGrid.astro`). Per NN/g
  ([cards.md](./cards.md)), varied layouts are worse for comparison, so the `/work/` index stays
  a list.
- **Today:** `ProjectGrid` is one column, then two equal columns from `(width >= 50rem)`
  (cards subgrid their rows, the odd last card goes horizontal, and entrances slide in from
  each column's side). Moving it to a varied-size layout is the natural next step toward
  "strongest work first and biggest".
- **Priority source:** derive cell size from the existing `order` field (lowest `order` =
  largest cell) rather than adding a layout field. Featured count is 3–8
  (`src/lib/projects.ts`), so design the layout for every count from 3 to 8 with no filler
  cells.
- **Tokens, not literals:** gap from `--space-*`, radius from `--radius-*` (the site is
  near-square at 2–4px; don't import the source's 12–24px rounded tiles), and rem breakpoints
  in the component's own `<style>`.
- **Order:** DOM order = importance order, so screen-reader and phone users get the same
  priority. Avoid `grid-auto-flow: dense` or `order:` that moves cards away from DOM order
  (WCAG 1.3.2 / 2.4.3).
- **Spans** are classes (e.g. `:nth-child` rules or a modifier class), never inline `style=`
  (CSP). If a span depends on data, use `src/lib/page-style.ts`.
- **Entrances:** keep the existing reveal wiring (`--reveal-x/y`, `--i`); a lead cell can rise
  while the others slide in, but the grid keeps one motion idea (see [motion.md](./motion.md)).

[landdding]: https://landdding.com/blog/blog-bento-grid-design-guide
[saasframe]: https://www.saasframe.io/blog/designing-bento-grids-that-actually-work-a-2026-practical-guide
[taste]: https://github.com/Leonxlnx/taste-skill
