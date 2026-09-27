# Progressive disclosure

## TL;DR: rules

1. **Surface only the few most important things**; defer the rest to a secondary layer.
2. **Two levels max.** Beyond two, "users often get lost". If you need three, simplify.
3. **The way to the secondary layer must be obvious**: a visible control or link with a label
   that says what's behind it (strong "information scent").
4. **One path per destination.** Several routes to the same detail confuse more than they
   help.
5. **Don't hide what people want most of the time.** Getting the split wrong in either
   direction hurts: too much up front overwhelms, too little forces clicks.

## Evidence

### [NN/g, "Progressive Disclosure"][nng]

- Initially show "only a few of the most important options"; move rarely used or specialised
  material to a secondary display.
- Decide the split from evidence (task analysis, usage data, testing), not guesswork.
- More than **two** disclosure levels "typically have low usability". Multiple secondary
  displays, each opened by a different control, are acceptable but add complexity to the
  first view.
- The mechanics must be simple: controls in clearly visible places, links that look like
  links. Labels must set expectations about what's behind them.
- Done right, it improves learnability, efficiency, and error rates for novices and experts
  alike.

### [IxDF, "Progressive Disclosure"][ixdf] (secondary, agrees with NN/g)

- Pitfalls: hiding everyday content behind extra steps; oversimplifying so the product looks
  "dumbed down"; several access paths to one feature.
- Typical mechanisms: accordions/expanders, tabs, modals, tooltips, click-to-reveal.
- Use clear signifiers for hidden content (arrows, "more" labels).

## Applying it here

The site's two levels are fixed:

| Level         | Where                                                       | Must contain                                                                                    |
| ------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1: surface    | Home page and `/work/`: project cards, hero, about, contact | Everything a scanner needs: face and name, role, the work as images plus 2–3 sentences, contact |
| 2: case study | `/work/<slug>/` (`ProjectLayout.astro`)                     | The full story: problem, approach, what was built, outcome, all media                           |

- Don't add a third level (e.g. an expander inside a case study that opens a modal that links
  elsewhere). Deeper detail goes into the case-study body.
- Within level 1, small reveals (hover HUD, in-view loop playback) are **enhancements**, not
  disclosure layers. Nothing a scanner needs may sit behind them.
- Link labels into level 2 should name the destination (project title, "All work →"), which
  is the information scent.
- "One path per destination" is about not confusing people: a project reachable from the home
  card, the `/work/` index, and prev/next is fine, because each is the natural path from where
  the visitor is. Avoid duplicate links **within one card or row**.

[nng]: https://www.nngroup.com/articles/progressive-disclosure/
[ixdf]: https://ixdf.org/literature/topics/progressive-disclosure
