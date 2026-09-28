# Prototyping variants on this site

Adapted from the `prototype` skill's UI branch for Astro + a strict CSP. A prototype is
**throwaway code that answers "what should this look like?"**. It lives only on the design
branch and is deleted before the real build.

## Shape

- **Mount on the real page** (the page the feature will live on), so every variant sits between
  the real header, hero, and neighbouring sections at real density. Only for a genuinely new
  top-level page, use a throwaway route `src/pages/prototype-<slug>.astro` (dev-only; delete it
  after).
- **One `.astro` file per variant** next to where the feature will live, named so it's obviously
  a prototype: `src/components/prototype/<Feature>A.astro`, `…B.astro`, … Each takes the same
  real data (collection entries, `site.ts`) through props.
- **Copy `assets/PrototypeSwitcher.astro`** (from this skill) to
  `src/components/prototype/PrototypeSwitcher.astro` and render it once on the host page.
- On the host page, wrap each variant, and hide all but A in markup so there's no flash:

  ```astro
  <div data-prototype-variant="A" data-prototype-name="Lead + list">
    <FeatureA {...props} />
  </div>
  <div data-prototype-variant="B" data-prototype-name="Bento" hidden>
    <FeatureB {...props} />
  </div>
  <PrototypeSwitcher />
  ```

- Run `npx astro dev --port <port>`; each variant is `…/Portfolio/<page>?variant=B`.

## What makes variants worth comparing

- **Minimum 2, default 3, cap 5.** Each variant must disagree with the others about
  **structure**: layout, information hierarchy, primary affordance, or what the surface shows vs.
  hides. Two card grids with different gaps are one variant.
- Name each by its idea ("Lead + list", "Bento by order", "Filmstrip"), not by a letter.
- **Every variant stays inside the rules**, because a variant the site can't ship answers
  nothing: tokens, the style profile (`docs/identity/site-style.md`), the CSP (no inline
  `style=`), real content only (no placeholder images or invented copy; if media is missing,
  use an existing project's real media and say so), and the motion gate for any motion you
  include.
- **Skip the polish:** no tests, rough edges fine, and motion can be sketched (describe the
  intended motion in the variant's summary if it isn't built yet). Structure, hierarchy, and
  scannability are what's being judged.
- Keep the variants independent. Sharing a sub-component is fine; sharing the layout defeats the
  point.

## Presenting for sign-off

1. Capture every variant with the shared capture script (see
   `.claude/skills/audit-portfolio/references/verify-and-land.md`), passing the variant URLs as
   pages (`--pages "?variant=A,?variant=B"` for home, or `work/?variant=A,…`), widths `390,1280`,
   the scheme the user uses most (both if colour matters). Look at each shot yourself first; if
   two variants look alike, redo one.
2. Show the user, for each variant: the name, a one-line idea, the fold screenshot paths at 390
   and 1280, and a short **trade-offs** table scored against the brief (scan-first, showcases the
   work, on-vibe, interaction payoff, complexity/risk). End with **your recommendation and why**.
3. Give them the live URLs (`?variant=` keys, ←/→ to cycle) to poke at.
4. Ask for sign-off with `AskUserQuestion`: one option per variant plus "mix" (they describe it
   in Other). The usual real answer is a mix ("B's layout with A's hover"): restate the mix as a
   concrete spec and confirm it before building.
5. If they reject all, ask what's wrong with the closest one, then produce a new round (reuse
   what worked). Don't start the real build without an explicit sign-off.

## After sign-off

Write the verdict (the question, the chosen variant or mix, and why) into the design brief,
because the commit message of the real build carries it. Then **delete** `src/components/prototype/`
and any prototype route, and build the winner properly from scratch in the real component.
Prototype code was written under prototype rules; don't promote it as-is.
