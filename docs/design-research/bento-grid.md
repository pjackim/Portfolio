# Bento grids (varied-size layouts)

> **Source strength: moderate.** Practitioner guidance, not user research. The underlying
> idea (size and position signal importance) is well supported, but treat the specific
> numbers as starting points, not rules.

## TL;DR: rules

1. **Size is the volume knob.** The most important item gets the biggest cell in the prime
   spot (top-left, first in source order). Varying sizes is the point; **all-equal cells
   defeat the pattern**.
2. **Keep it sparse:** past roughly **12–15** visible cells the organising benefit is lost.
3. **One base unit.** A 4–6 column grid with cells spanning 1, 2, or 4 columns (and 1–2 rows);
   uniform gaps (≈12–24 px) and radii.
4. **Inside a cell: visual → headline → supporting detail.**
5. **Collapse deliberately.** ~3 columns on tablet, 1 (or 2) on phones, keeping the most
   important item first and visibly larger or earlier.
6. Use it for **non-sequential browsing** (portfolios, feature showcases). Avoid it for
   anything with a required reading order.

## Evidence

From [Landdding, "Bento Grid Design"][landdding] (the more detailed
[SaaSFrame guide][saasframe] blocked automated fetching; its search summary agrees on the
12–15 cell ceiling and on equal sizes being a mistake):

- Desktop (≥1024 px): 4–6 equal columns with varied spans; tablet (768–1024 px): 3 columns;
  mobile (<768 px): single column (or 2 if designed for it).
- Gaps 12–24 px, corner radius 12–24 px, applied consistently.
- Largest card top-left; multi-column spans signal importance; subtle background tints can
  group related cards.
- Common mistakes: equal sizes, inconsistent spacing, losing hierarchy on mobile, over 15
  cards.

```css
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.grid > .feature {
  grid-column: span 2;
  grid-row: span 2;
}
```

## Applying it here

- `src/components/ProjectGrid.astro` is currently a 1-column → 2-column grid of equal cards
  (subgridded rows, odd last card goes horizontal). A varied-size layout for the featured
  projects is the natural next step toward "strongest work first and biggest". Drive it from
  the existing `order` field (lowest `order` = largest cell) rather than a new layout field.
- Featured count is 3–8 (enforced in `src/lib/projects.ts`), well under the 12–15 ceiling.
- Keep **source order = importance order** so screen-reader and phone users get the same
  priority as the visual layout; never reorder with CSS alone. Avoid `grid-auto-flow: dense`
  if it would visually reorder cards away from DOM order (WCAG 1.3.2 / 2.4.3).
- Per NN/g ([cards.md](./cards.md)), varied layouts are less scannable for comparison, so
  keep the bento treatment to the featured showcase and leave `/work/` and the archive as
  lists.
- The CSP forbids inline `style=`, so per-card spans must be classes or come from
  `src/lib/page-style.ts`, not inline styles.

[landdding]: https://landdding.com/blog/blog-bento-grid-design-guide
[saasframe]: https://www.saasframe.io/blog/designing-bento-grids-that-actually-work-a-2026-practical-guide
