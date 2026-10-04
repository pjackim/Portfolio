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
   in `guidelines/screenshots/pages/` (home, work, project; 1440px light/dark, 390px light).

Pages stack like this: `header.site-header` → `main` holding `section.home-section.container` blocks,
each opening with a `SectionHeading` (`01 / ABOUT ────`) → `footer.site-footer`. Featured projects use
`article.case.container` (`CaseHeader`, `ProjectMeta`, `CaseHero`, `CaseIndex`, `KeyPoints`, `Prose`,
`MediaFigure`, `PrevNext`).

## Global classes (safe to use in your own layout glue)

`.container` (centered `--container` column with `--gutter`), `.mono-label` (Geist Mono, uppercase,
0.06em tracking, muted), `.button` + `.button--primary` / `.button--secondary` (+ `.button__meta`),
`.visually-hidden`. For anything new, style it with tokens in your own CSS.

## Tokens (`tokens/tokens.css`)

- Colour: `--bg`, `--surface`, `--surface-2`, `--line` (decorative hairline), `--line-ui` (≥3:1 UI
  edge), `--text`, `--text-muted`, `--text-subtle`, `--accent`, `--accent-hover`, `--on-accent`,
  `--danger` (error screens only).
- Type: `--font-sans` (Geist), `--font-mono` (Geist Mono); fluid steps `--step--1` … `--step-5`.
- Space: `--space-3xs` … `--space-3xl`, `--space-section`. Layout: `--container`, `--measure`
  (66ch), `--gutter`, `--header-h`.
- Shape: `--radius-xs` (2px), `--radius-s` (4px), `--hairline`, `--rule-ui`.
- Motion: `--dur-fast` / `--dur-base` / `--dur-slow`, `--ease-out`, `--ease-standard`.

## What every design must do (`guidelines/project-goals.md`)

Design for a **fast, lazy scanner**: a visitor who gives the page a few seconds, reads about 20%
of the words, and doesn't click. Anything important must be _seen_. In priority order:

1. **Show Parker's work and who he is.** Lead with the strongest project, biggest and earliest.
   Every visible project shows a real image or loop, a short title, and a summary of 2–3 short
   sentences (≤ 180 characters) saying what it is and why it's impressive. Featured projects open with
   a scannable summary (what, role, outcome, media) before the narrative.
2. **Modern, satisfying, interactive, never generic.** The hero is the quality bar. Motion rewards
   attention and points at the work (in-view project loops, card hover/focus, scroll reveals).
3. **Easy to recognise and contact.** His photo, logo, and name read as one identity, and the
   face shows up early. Contact is one step from any page: icon plus label, `mailto:` links, no forms.

**Fact-only content.** Use only copy, projects, dates, links, and images that already appear in the
component markup and screenshots. Never invent metrics, employers, skills, testimonials, or
contact details. For placeholder slots, write `[TBD]` rather than a made-up claim.

## Layout and disclosure rules (`guidelines/design/`)

- **Two levels only** (`progressive-disclosure.md`): level 1 is the surface (home, `/work/`: hero,
  cards, about, contact) and must hold everything a scanner needs. Level 2 is the project. No
  third level (no modals or expanders that lead further). A lightbox only enlarges media already on
  the page.
- **Cards** (`cards.md`): one card is one project. The whole card is clickable through **one** real
  link (the title, stretched over the card, as in `ProjectCard`). Never wrap the card in `<a>` or also
  link the cover. Nothing essential is hover-only.
- **Showcase grid** (`bento-grid.md`): size signals importance. The lead project gets the largest cell,
  first in DOM order and top-left. Use as many cells as projects (3–8), no filler, one gap token,
  `--radius-s` at most, one column on phones with the lead still first. No `dense` flow or CSS
  `order`. Keep `/work/` and the archive as lists (`ArchiveList`), since lists are better for comparing.
- **Scanning** (`scanning-and-reading.md`): headings carry the page. Put the point in the first two
  words of a heading and the first sentence of a block. Keep paragraphs short. Pull facts into tags,
  `.mono-label` keys, and `KeyPoints`. Link text names the destination (`All work`, a project title),
  never "read more" or "click here".
- **Type and spacing** (`typography-and-layout.md`): the page must pass a squint test. Keep gaps tight
  inside a group and generous between groups (`--space-xs`/`--space-s` vs `--space-xl`/`--space-section`).
  To separate roles by size, skip a `--step-*`. Body text ≥ `--step-0`, measure ≤ `--measure`, left
  aligned. Headlines ≈ 8 words or fewer, sub-copy ≈ 25 words or fewer, then one visual or action. Use one
  label per intent.

## Motion rules (`guidelines/design/motion.md`, `guidelines/brand.md`)

- Every animation has a job. **One authored moment per surface**: the hero owns the typed prompt,
  graph, and decrypt. New sections get only quiet supporting motion.
- Content is visible at rest. Animate from the final state, with transform and opacity only, using
  `--dur-*` and `--ease-out`. No bounce, no parallax, no infinite loops. Exits are faster than
  entrances. With `data-motion="off"` or reduced motion, everything shows its final state.
- Signature patterns (lock-on reticle, decrypt, cursor block, typed prompt, readout reels, rule draw)
  stay where they live. **Reuse the component; don't redraw the effect** in a new section. A pattern
  owns the accent while it plays.

## Anti-slop checklist (`guidelines/design/anti-slop.md`)

No second accent, gradient fills, glassmorphism, shadows, or rounded pills. No fake terminals,
dashboards, or clip-art built from divs. No invented numbers or "stat" tiles. No buzzwords,
aphorisms, or poetic labels. No eyebrow kicker above new headings (the hero's eyebrow is the
exception). Numbered `SectionHeading`s belong to home-page sections only; don't number other new
UI. Every visual choice must be a decision made for this site, not the first default.

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
