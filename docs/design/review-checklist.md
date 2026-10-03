# Design review checklist

The rubric `/design-portfolio` uses to verify its own work and `/audit-portfolio` uses to grade
the site. Each check has an ID (cite it in findings), a source to read for the full rule, how to
verify it, and a **fix class**:

- **M (mechanical):** there is one objectively correct fix (a contrast value, a missing gate, a
  literal that should be a token).
- **J (judgement):** fixing it takes a design call, so the audit report must spell out the
  chosen solution concretely.

`/audit-portfolio` also gives each finding a **route**: **fix** (keeps the current layout,
hierarchy, and content), **design** (changes one of those), or **owner** (needs a fact, media,
dependency, or brand decision from Parker). An audit only reports. `/audit-portfolio fix`
implements fix and design findings as written and leaves owner findings for Parker.

Severity when reporting: **P0** breaks a hard constraint (CSP, a11y failure, broken link,
fabricated fact) · **P1** undermines a goal for most visitors · **P2** off-style or craft
issue a careful visitor would notice · **P3** polish.

## G. Goals (CLAUDE.md, in priority order)

| ID  | Check                                                                                                                | Verify                                                                 | Fix |
| --- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --- |
| G1  | A visitor who only scrolls learns what Parker built, his arc (10 → 15 → CSU → JHU APL), and that the work is strong. | Screenshots at 390 and 1280, read nothing but headings, images, labels | J   |
| G2  | Every visible project shows a real image/loop **and** a 2–3 short-sentence summary without a click.                  | Screenshots; `summary` in frontmatter (≤ 180 chars)                    | J   |
| G3  | Strongest work is biggest and earliest; few enough items that nothing competes.                                      | Screenshot squint test; `order` field                                  | J   |
| G4  | Layer-cake: short informative headings, fact first, short paragraphs, facts as labels/tags.                          | [scanning-and-reading.md](./scanning-and-reading.md)                   | J   |
| G5  | Essentials never hover-only or click-only; touch and keyboard get the same essentials.                               | Chrome: `(hover: none)` width, Tab through                             | M/J |
| G6  | Whole-card links: one real link, stretched, visible hover + focus, no duplicate link.                                | [cards.md](./cards.md); DOM                                            | M   |
| G7  | New interactive surfaces reach the hero's bar: alive and rewarding, not a static template.                           | Chrome, motion on                                                      | J   |
| G8  | Parker's face, name, and logo read as one identity, and his face appears early.                                      | Screenshots of header, hero/about, contact                             | J   |
| G9  | Every contact channel in `site.ts` is one obvious step away on every page (icon/label, `mailto:`/`tel:`, no forms).  | Chrome on home, `/work/`, a case study, 404                            | M/J |

## S. Style fidelity ([site-style.md](../identity/site-style.md))

| ID  | Check                                                                                                | Verify                                                                   | Fix |
| --- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --- |
| S1  | One accent, used for state/focus/signal only; no second hue, gradient fill, tinted section, or glow. | Screenshots both themes; grep `oklch(`/`#` literals outside `tokens.css` | M/J |
| S2  | Depth is tone + hairline: no `box-shadow` elevation, glass, or blur-as-decoration.                   | grep `box-shadow`, `backdrop-filter`                                     | M   |
| S3  | Radii only `--radius-xs`/`--radius-s`; no pills or large rounded cards.                              | grep `border-radius`                                                     | M   |
| S4  | Type roles match the profile: mono only for labels/data, display short, lede muted, body `--step-0`. | Screenshots; component CSS                                               | M/J |
| S5  | Signature elements reused through their components, not re-drawn, and not multiplied per section.    | grep for new eyebrows, carets, reticle copies                            | J   |
| S6  | Voice: plain first person, terse mono keys, destination-named actions, no hype, no new em-dashes.    | Read visible copy                                                        | M/J |
| S7  | A new section feels like the same instrument as the hero (same palette, labels, motion personality). | Side-by-side screenshots with the hero                                   | J   |

## C. Craft ([typography-and-layout.md](./typography-and-layout.md), [anti-slop.md](./anti-slop.md))

| ID  | Check                                                                                                            | Verify                                        | Fix |
| --- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | --- |
| C1  | Squint test: primary → secondary → groups read in order at 390 and 1280.                                         | Screenshots, blurred mentally                 | J   |
| C2  | Proximity rhythm: tight inside groups, generous between; more space above a heading than below.                  | Screenshots; spacing tokens                   | M/J |
| C3  | Tokens, not literals: `--step-*`, `--space-*`, `--radius-*`, `--dur-*`/`--ease-*`, colour tokens.                | grep changed CSS for raw px/rem/ms/colour     | M   |
| C4  | Body ≥ 1rem, 45–75ch measure, line height 1.5–1.7, no justified text.                                            | Computed styles in Chrome                     | M   |
| C5  | No tell from the anti-slop table (gradient text, icon-tile rows, hero-metric template, kicker labels, marquee…). | [anti-slop.md](./anti-slop.md) table          | J   |
| C6  | No layout family repeated section after section; bento has exactly as many cells as content.                     | Screenshots; [bento-grid.md](./bento-grid.md) | J   |
| C7  | No horizontal overflow at any width from 320px; nothing clipped or overlapping.                                  | `capture.ts` overflow report; Chrome          | M   |
| C8  | Browser surfaces themed: focus ring, selection, underline offset from the palette.                               | Chrome                                        | M   |

## A. Motion and interaction ([motion.md](./motion.md))

| ID  | Check                                                                                                                                        | Verify                                                   | Fix |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --- |
| A1  | Every animation has a job; one authored focal moment per surface.                                                                            | Chrome, motion on                                        | J   |
| A2  | Content visible at rest; a failed/slow script never hides anything.                                                                          | Chrome with JS disabled, or reveal fallback CSS          | M   |
| A3  | All motion behind the gate: `motionAllowed()` in TS, `:root:not([data-motion='off'])` inside `prefers-reduced-motion: no-preference` in CSS. | grep; Chrome with toggle off and reduced motion          | M   |
| A4  | Durations/easing from tokens; no bounce/elastic; exits faster than entrances; cheap properties only.                                         | grep `transition`, `animation`, `cubic-bezier`           | M   |
| A5  | Scroll entrances use `data-reveal` presets, not a new observer or keyframe set; no `scroll` listeners.                                       | grep `IntersectionObserver`, `addEventListener('scroll'` | M   |
| A6  | Loops play only in view and stop offscreen/hidden; finite blinks/sequences.                                                                  | Chrome; `video.ts`                                       | M   |
| A7  | Hover, focus, and press feedback on every interactive element, keyboard focus mirroring hover.                                               | Chrome: hover + Tab                                      | M   |

## X. Constraints (CLAUDE.md)

| ID  | Check                                                                                                           | Verify                                                      | Fix            |
| --- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------- |
| X1  | WCAG 2.2 AA: axe clean both schemes; contrast 4.5:1 body / 3:1 large and UI; visible focus; logical order.      | `npx playwright test tests/a11y.spec.ts --project=chromium` | M              |
| X2  | CSP: no inline `style=`, no inline handlers, per-instance CSS via `page-style.ts`.                              | grep `style=`, `on[a-z]+=` in `src/`                        | M              |
| X3  | ≤ 30 KB JS/page, zero third-party requests, LCP ≤ 2000 ms, CLS ≤ 0.02.                                          | `capture.ts` request report; `npm run test:lhci`            | M              |
| X4  | Links through `withBase()`; no raw `href="/…"`/`src="/…"`.                                                      | grep; `tests/links.spec.ts`                                 | M              |
| X5  | Media only via the pipeline (WebP, MP4+WebM+poster); `npm run check:media` passes.                              | `npm run check:media`                                       | M              |
| X6  | Fact-only: every new claim, date, metric, contact detail traces to legacy, résumé, or a cited author statement. | Read sources/comments                                       | J (ask Parker) |
| X7  | No new dependency, framework, or third-party font/icon without the human's go-ahead.                            | `git diff package.json`                                     | J              |
| X8  | `npm run lint`, `npm run build:only`, and `npm run test:e2e` pass.                                              | Run them                                                    | M              |
