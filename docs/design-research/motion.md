# Motion and interaction

## TL;DR: rules

1. **Every animation has a job**: acknowledge an action, make a state change or spatial
   relationship legible, preserve continuity across navigation, direct attention at a
   meaningful moment, or express the site's identity. If removing it loses nothing but
   decoration, remove it.
2. **One authored focal moment per surface** (the hero's is the typed focus line and graph).
   Supporting motion is quiet. Don't give every section the same fade-up.
3. **Content is visible at rest.** Animate _from_ an already-visible default so a failed or
   slow script never hides the page.
4. **Timing expresses distance and consequence** (table below). Exits are faster than
   entrances. Decelerate with exponential ease-out, never bounce or elastic.
5. **Cheap properties.** Transform and opacity by default; bounded blur, clip-path, or mask
   where it stays smooth. Never animate `width`/`height`/`top`/`left`/`margin`.
6. **Reduced motion means gentler, not dead.** Remove spatial movement; keep the opacity and
   colour changes that confirm state. Loops stop when offscreen or hidden.

## Evidence

### Timing ([impeccable, `animate` reference][imp])

| Duration   | Use                                         |
| ---------- | ------------------------------------------- |
| 100–150 ms | Immediate feedback (press, toggle)          |
| 150–300 ms | Routine state change (hover, focus, expand) |
| 300–500 ms | Layout change, overlay, view transition     |
| 500–800 ms | One deliberately authored focal entrance    |

Easing for confident arrivals: `cubic-bezier(0.16, 1, 0.3, 1)` (expo-style ease-out). "Long
feedback feels like latency."

### Visitor mode ([impeccable][imp])

impeccable classifies portfolios as **"Experience"** mode: "the visitor is inside the work
itself … let the artifact lead from the first viewport; the interface recedes." Motion may
carry the voice there, but prefer **one rehearsed focal sequence over repeated section
reveals**. Sibling stagger is fine when a list appears as a list; cap the total delay.

### Implementation ([impeccable][imp], [taste-skill][taste] §5–6)

- CSS transitions/keyframes for declarative states; the Web Animations API for sequencing and
  interruption; View Transitions for cross-page continuity; scroll-driven animation only when
  the scroll relationship itself means something, with a fallback.
- **No `scroll` event listeners** for effects. Use IntersectionObserver or CSS
  `animation-timeline: view()`.
- `will-change` only during a known animation. Grain/noise only on a fixed
  `pointer-events: none` layer, never on scrolling content.
- Stagger via CSS: `animation-delay: calc(var(--index) * 100ms)`. Here, set `--index` through
  classes or `src/lib/page-style.ts`, not inline `style=` (CSP).
- Core Web Vitals targets: LCP < 2.5 s, INP < 200 ms, CLS < 0.1. This repo's Lighthouse
  budgets are stricter (LCP ≤ 2000 ms, CLS ≤ 0.02).

### Pattern vocabulary ([taste-skill][taste] §10)

Named patterns worth knowing when discussing options (not endorsements): kinetic-type hero,
scroll-pinned hero, sticky-stack sections, bento grid, spotlight-border card, parallax tilt
card, text scramble, accordion image slider, animated SVG line drawing, lens-blur depth. The
site already uses text scramble (`src/scripts/scramble.ts`) and a spotlight/reticle card.

## Applying it here

- Existing modules: `src/scripts/motion.ts` (the motion gate), `motion-toggle.ts`, `reveal.ts`,
  `hero*.ts`, `scramble.ts`, `video.ts`. Reuse them; don't add a second motion system.
- Always respect **both** `prefers-reduced-motion` and the user toggle (`data-motion="off"`
  on `<html>`).
- No animation library: vanilla JS under the 30 KB/page budget. GSAP, Motion, and Three.js
  are out unless Parker explicitly changes that constraint.
- Best use of motion under the scan-first goal: **loops of the actual projects** that play when
  in view (`LoopVideo.astro`), plus crisp hover/focus feedback on cards. Motion that points at
  the work, not at itself.

[imp]: https://github.com/pbakaus/impeccable
[taste]: https://github.com/Leonxlnx/taste-skill
