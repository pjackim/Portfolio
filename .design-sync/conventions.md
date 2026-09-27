# Parker Jackim Portfolio: "operator console"

This design system is the compiled CSS of a static Astro site (pjackim.github.io/Portfolio). It
has **no React or JS components**: `window.PortfolioDS` is empty on purpose. You build with
**plain HTML markup + the site's real CSS**, and it renders nearly identically to the live site.

## Setup

Link one stylesheet. It carries the fonts, tokens, and every compiled component style:

```html
<link rel="stylesheet" href="styles.css" />
```

- `body` is already styled (`--bg` background, `--text` colour, Geist, `--step-0`, line-height 1.6).
- Theme follows the OS by default. Pin it with `<html data-scheme="light">` or `data-scheme="dark"`.
  Every colour token is `light-dark()`, so both schemes work with no extra CSS.
- `<html data-motion="off">` snaps all entrance animation to its final state (use it for static mocks).

## How to reproduce a component exactly

1. Open `components/<group>/<Name>/<Name>.prompt.md` and copy its **Markup** block verbatim.
2. Keep every `class` **and every `data-astro-cid-*` attribute**. Component CSS is scoped by
   those attributes; drop them and the element renders unstyled.
3. Change only text, `href`, and image `src`. Keep the element structure.
4. Compare with `guidelines/screenshots/components/<Name>-light.png` / `-dark.png` and the full pages
   in `guidelines/screenshots/pages/` (home, work, case study; 1440px light/dark, 390px light).

Pages stack like this: `header.site-header` → `main` holding `section.home-section.container` blocks,
each opening with a `SectionHeading` (`01 / ABOUT ────`) → `footer.site-footer`. Case studies use
`article.case.container` (`CaseHeader`, `ProjectMeta`, `CaseHero`, `CaseIndex`, `KeyPoints`, `Prose`,
`MediaFigure`, `PrevNext`).

## Global classes (safe to use in your own layout glue)

`.container` (centered `--container` column with `--gutter`), `.mono-label` (Geist Mono, uppercase,
0.06em tracking, muted), `.button` + `.button--primary` / `.button--secondary` (+ `.button__meta`),
`.visually-hidden`. For anything new, style it with tokens in your own CSS.

## Tokens (`tokens/tokens.css`)

- Colour: `--bg`, `--surface`, `--surface-2`, `--line` (decorative hairline), `--line-ui` (≥3:1 UI
  edge), `--text`, `--text-muted`, `--text-subtle`, `--accent`, `--accent-hover`, `--on-accent`,
  `--danger` (404 only).
- Type: `--font-sans` (Geist), `--font-mono` (Geist Mono); fluid steps `--step--1` … `--step-5`.
- Space: `--space-3xs` … `--space-3xl`, `--space-section`. Layout: `--container`, `--measure`
  (66ch), `--gutter`, `--header-h`.
- Shape: `--radius-xs` (2px), `--radius-s` (4px), `--hairline`, `--rule-ui`.
- Motion: `--dur-fast` / `--dur-base` / `--dur-slow`, `--ease-out`, `--ease-standard`.

## Style rules (full profile: `guidelines/site-style.md`; signature patterns: `guidelines/brand.md`)

- **One accent.** `--accent` orange marks state, focus, and the one thing that matters per view.
  Never use it as a large fill. No second accent, no gradients, no tinted section backgrounds.
- **Depth is tone plus hairline.** Step `--bg` → `--surface` → `--surface-2`, edge with `--hairline`.
  No drop shadows, glass, or glow. Nothing is rounded beyond 4px (no pills).
- **Sans for reading, mono for data.** Geist for titles and body; `.mono-label` for keys, indices,
  tags, dates, and readouts. Titles are short nouns; mono keys are terse (`Now`, `Edu`, `Focus ›`).
- **Real work first.** Every project shows a real screenshot or loop, a short title, and a summary
  of about two sentences. No stock art, no fake UI.
- Copy is first person, plain, factual. No hype words and no em-dashes in new copy.

## Example: a new home section

```html
<section class="home-section container" aria-labelledby="notes-title" data-astro-cid-lcdefpme="">
  <!-- SectionHeading markup from components/layout/SectionHeading/SectionHeading.prompt.md,
       with the index, label, and h2 id changed -->
  <div class="section-heading" data-section-heading="" data-astro-cid-ypavld2q="">
    <div class="section-heading__label" data-astro-cid-ypavld2q="">
      <span class="section-heading__index" aria-hidden="true" data-astro-cid-ypavld2q=""
        ><span data-count="" data-astro-cid-ypavld2q="">06</span>
        <span class="section-heading__slash" data-astro-cid-ypavld2q="">/</span></span
      >
      <h2 class="section-heading__title" id="notes-title" data-astro-cid-ypavld2q="">Notes</h2>
    </div>
    <span class="section-heading__rule" aria-hidden="true" data-astro-cid-ypavld2q=""></span>
  </div>
  <p style="color:var(--text-muted);max-width:60ch">One short lede paragraph.</p>
  <a class="button button--primary" href="#">Selected work</a>
</section>
```
