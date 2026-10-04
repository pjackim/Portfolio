# Motion and interaction

## TL;DR: rules

1. **Every animation has a job**: acknowledge an action, make a state change or spatial
   relationship legible, preserve continuity across navigation, direct attention at a
   meaningful moment, or express the site's identity. If removing it loses nothing but
   decoration, remove it.
2. **One authored focal moment per surface** (the hero's is the typed focus line and graph).
   Supporting motion (the shared scroll reveals) is quick and quiet. Don't invent a new showy
   entrance per section.
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

Decelerate on arrival (an exponential-style ease-out) and exit faster than you enter. The site
already encodes this: durations `--dur-fast` (140ms), `--dur-base` (220ms), `--dur-slow`
(320ms) and curves `--ease-out` / `--ease-standard` in `tokens.css`. Use those tokens. A
longer focal entrance (500–800ms) is a deliberate exception, not a new default. "Long
feedback feels like latency."

### Visitor mode ([impeccable][imp])

impeccable classifies portfolios as **"Experience"** mode: "the visitor is inside the work
itself … let the artifact lead from the first viewport; the interface recedes." Motion may
carry the voice there, but prefer **one rehearsed focal sequence over repeated section
reveals**. Sibling stagger is fine when a list appears as a list; cap the total delay.

### Implementation principles ([impeccable][imp], [taste-skill][taste] §5–6)

- Declarative first: CSS transitions and keyframes for states; script only for sequencing,
  interruption, or data-driven values. Native cross-document View Transitions for page-to-page
  continuity.
- Scroll-linked effects only when the scroll relationship itself means something. Trigger with
  IntersectionObserver or CSS `animation-timeline: view()`, **never a `scroll` event
  listener**, and always with a static fallback.
- Stagger only things that arrive as a list, and cap the total delay.
- `will-change` only during a known animation. Grain/noise, if ever, only on a fixed
  `pointer-events: none` layer, never on scrolling content.
- Bound expensive effects (blur, filters, canvas) to small regions, and measure on a real phone.

### Pattern vocabulary ([taste-skill][taste] §10)

Names worth knowing when discussing options, with how each fits here:

| Pattern                                                  | Fit                                                                                            |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Kinetic type, text scramble                              | In use (hero focus line, `scramble.ts`). Keep it to the hero and short labels.                 |
| Spotlight-border / reticle card                          | In use (`ProjectCard`, `reticle.css`). Hover-only enhancement; never carries information.      |
| Loop that plays in view                                  | In use (`LoopVideo.astro`). The best motion for the scan-first goal: it shows the work itself. |
| Animated SVG line drawing, clip-path/mask reveals        | Good fit: CSS-only, cheap, can explain a diagram in a case study.                              |
| Scroll-pinned hero, sticky-stack sections, scroll hijack | Poor fit: they slow a scanning visitor and need heavy JS. Avoid.                               |
| Parallax tilt, magnetic buttons, custom cursors          | Avoid: pointer-only, and cursors hurt accessibility.                                           |
| Marquee                                                  | Avoid: listed as an AI tell ([anti-slop.md](./anti-slop.md)), and hides half its content.      |

## Applying it here

- **One motion system.** The gate is `src/scripts/motion.ts` (it honours both
  `prefers-reduced-motion` and the user toggle `data-motion="off"` on `<html>`). Scroll
  entrances are declarative: add `data-reveal` (or `data-reveal="contents"`) and optionally
  `data-reveal-from="start|end|rise"`; stagger with `--i`. The presets live in `global.css`
  and `reveal.ts` only toggles state. Don't write a second observer or keyframe set for a new
  section.
- Other modules to reuse: `motion-toggle.ts`, `hero*.ts`, `scramble.ts`, `video.ts`. See
  [stack-translation.md](./stack-translation.md) for mapping outside motion advice to this
  stack.
- **Reveals are supporting motion.** They should stay quick and subtle, pick the preset that
  matches the layout (column side, rise for single columns), and never hide content if the
  script fails. The hero keeps the one authored focal moment.
- Hand-written modules only, inside the 30 KB/page script budget and the Lighthouse budgets
  (CLS ≤ 0.02; LCP is capped in `lighthouserc.json`). Delight never costs accessibility, and
  loops never auto-start under Save-Data or before a slow connection has upgraded the images.
- Best use of motion under the scan-first goal: **loops of the actual projects** that play when
  in view, plus crisp hover and focus feedback on cards. Motion that points at the work, not at
  itself.

[imp]: https://github.com/pbakaus/impeccable
[taste]: https://github.com/Leonxlnx/taste-skill
