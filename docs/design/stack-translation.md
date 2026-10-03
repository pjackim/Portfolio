# Translating outside design guidance to this stack

Most design skills, articles, and component libraries assume React, Tailwind, and an
animation library. This site has none of those. **Take the principle, not the
implementation.** Use this page to turn any outside advice into something that builds here.

## The stack, in one line

Astro 7 static output · `.astro` components · plain CSS with design tokens · hand-written
vanilla TypeScript modules in `src/scripts/` · no UI framework, no CSS framework, no animation
library · a strict CSP (no inline `style=`, no `'unsafe-inline'`) · ≤ 30 KB JS per page ·
**zero third-party requests** at runtime (enforced by Lighthouse CI) · npm.

## Translation table

| Outside advice says…                                                | Do this here instead                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| React/Next/Vue component, `'use client'`, hooks, props-driven state | An `.astro` component (markup + scoped `<style>`); behaviour in a module under `src/scripts/` imported by that component. State lives in the DOM (`data-*` attributes).                                                                                                                                                        |
| Tailwind classes (`text-4xl`, `gap-4`, `max-w-[65ch]`, `z-50`)      | Tokens from `src/styles/tokens.css`: type `--step--1`…`--step-5`, spacing `--space-3xs`…`--space-3xl` and `--space-section`, colours `--text`, `--text-muted`, radii `--radius-*`, motion `--dur-*` / `--ease-*`.                                                                                                              |
| Tailwind breakpoints (`md:`, `lg:`) or px breakpoints (768/1024)    | rem breakpoints chosen per component in its own `<style>` (most common: `(width < 30rem)`, `(width >= 48rem)`, `(width >= 64rem)`); `(hover: hover)` / `(hover: none)` for pointer-only effects.                                                                                                                               |
| Framer Motion / Motion `whileInView`, `staggerChildren`             | The declarative reveal system: `data-reveal` (or `data-reveal="contents"`) + `data-reveal-from="start\|end\|rise"`, stagger via `--i`; presets in `global.css`, driven by `reveal.ts`.                                                                                                                                         |
| GSAP / ScrollTrigger pinning, scrubbing, scroll hijack              | Usually skip: scroll hijack fights the scanning visitor. When scroll really carries meaning, use CSS scroll-driven animation (`animation-timeline: view()`) or IntersectionObserver, with a static fallback.                                                                                                                   |
| Three.js / WebGL / shader backgrounds                               | Out (budget, CSP, reduced motion). Get depth from CSS (gradients, masks, blend modes) or a small canvas in a hand-written module, as the hero graph does (`hero-graph.ts`).                                                                                                                                                    |
| "Check `useReducedMotion()`"                                        | Use `motionAllowed()` / `onMotionChange()` from `src/scripts/motion.ts` (honours both `prefers-reduced-motion` and the site toggle `data-motion="off"`). In CSS, key on `:root:not([data-motion='off'])` inside `@media (prefers-reduced-motion: no-preference)` (in a scoped component `<style>`, wrap it in `:global(...)`). |
| Inline `style={{…}}` / per-item CSS variables in markup             | Classes, or `src/lib/page-style.ts` for per-instance CSS (the CSP forbids inline `style=`).                                                                                                                                                                                                                                    |
| `next/image priority`, `<img>` with a CDN URL                       | `astro:assets` `<Picture>` / `<Image>` with `loading="eager"` + `fetchpriority="high"` above the fold; source files only through the media pipeline (`npm run media`).                                                                                                                                                         |
| Placeholder photos (picsum, Unsplash URLs), image-generation tools  | Never on this site: all imagery must be Parker's real work or his photo (fact-only rule), encoded by the media pipeline. If an image is missing, ask for it.                                                                                                                                                                   |
| Google Fonts / CDN fonts / "pick Satoshi, Cabinet Grotesk…"         | Fonts are self-hosted through Astro's Fonts API (`astro.config.ts`: Geist, Geist Mono). A font change is a brand decision for Parker, not a styling tweak.                                                                                                                                                                     |
| Icon libraries via CDN (Lucide, Phosphor)                           | No CDN. The site's marks are small authored components (`Arrow.astro`, `Logo.astro`). Adding an icon package needs approval and goes through `npm i`.                                                                                                                                                                          |
| shadcn/ui, React Bits, "install component X"                        | Can't install. Re-implement the idea in vanilla TS/CSS within the constraints; check the source's licence before porting code closely.                                                                                                                                                                                         |
| Grain/noise overlay, custom cursor, magnetic buttons                | Only if it serves the identity, stays inside the budget, and degrades cleanly; grain only on a fixed `pointer-events: none` layer. Custom cursors: no (accessibility).                                                                                                                                                         |
| "Run a Python script to randomise the layout"                       | No. Layout follows content priority (see [bento-grid.md](./bento-grid.md)), not chance.                                                                                                                                                                                                                                        |
| Invented copy, metrics, testimonials, logos, "realistic" fake data  | Never. Content is fact-only (`CLAUDE.md`). Omit what isn't sourced.                                                                                                                                                                                                                                                            |
| Generate a `DESIGN.md` / `PRODUCT.md`, add hooks or config          | Not without the human's go-ahead. Goals live in `CLAUDE.md`, tokens in `tokens.css`, and research here.                                                                                                                                                                                                                        |

## Installed design skills

The taste-skill family is installed locally in `.claude/skills/` (folder names differ from the
upstream names; [taste-skill.md](./taste-skill.md#skill-files) maps them). They are useful for
**principles**. Their code defaults all need the table above. To drive them with a proper brief,
see [taste-skill.md](./taste-skill.md) or run `/taste`.

| Skill                             | Take                                                                                   | Ignore                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `design-taste-frontend`           | Brief inference, anti-default discipline, layout rules, AI-tell list, pre-flight check | React/Tailwind v4/Motion/GSAP stack defaults, font picks, picsum   |
| `redesign-existing-projects`      | Audit before touching; preserve what works; targeted evolution over rewrite            | Framework-specific steps, picsum, grain as a default               |
| `high-end-visual-design`          | Spacing generosity, restrained shadows, card discipline                                | Framer Motion, Tailwind snippets, icon-library picks               |
| `minimalist-ui`                   | Typographic contrast, flat grouping, restraint                                         | Its fonts and warm palette (the site has its own), picsum          |
| `industrial-brutalist-ui`         | Swiss grids, extreme type-scale contrast (close to the hero's instrument feel)         | Scanline/phosphor/grain effects as defaults                        |
| `gpt-taste`                       | Wide editorial type, no filler cells in bento grids                                    | GSAP ScrollTrigger, Python randomisation, AIDA marketing structure |
| `stitch-design-taste`, `brandkit` | Rarely relevant (Google Stitch design files; image generation)                         | Don't generate `DESIGN.md` or brand boards unasked                 |
| `full-output-enforcement`         | Don't leave placeholders                                                               | —                                                                  |

**Precedence when anything disagrees:** the repo's constraints (`CLAUDE.md`) → the goals →
this folder → a skill's defaults. A skill that says "always" is still below the repo's rules.
