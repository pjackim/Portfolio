# design-sync notes

- **Shape: off-script static-markup DS.** The bundled converter supports React libraries only; this is an
  Astro site with no React. `.design-sync/build.mjs` produces the upload layout from the real build instead:
  compiled `dist/_astro/*.css` → `_ds_bundle.css`, Astro Fonts' inline `@font-face` → `fonts/`,
  `src/styles/tokens.css` → `tokens/`, and each component's SSR markup + element screenshots captured with
  Playwright from `astro preview`. `_ds_bundle.js` is an empty `window.PortfolioDS = {}` with a
  `components: []` header. Decided with the owner (2026-09-27): tokens + fonts + screenshots + docs so the
  design agent can mimic the UI nearly exactly.
- **Scoped CSS needs `data-astro-cid-*`.** Captured markup keeps those attributes; the conventions header
  tells the agent to keep them. Scope ids change when a component's styles change, so always re-capture.
- **Capture gotchas (all handled in build.mjs):** the page CSP blocks `addStyleTag` (context uses
  `bypassCSP`); the sticky header overlaps element captures (forced `position: static`); lazy covers
  need a scroll walk + `decode()` before full-page shots; a lone `li.card` flips to the odd-last
  horizontal layout, so ProjectCard captures two cards inside an `ol.project-grid` shell; `<script>` tags
  are stripped from markup; `picture > source` is dropped and `img src` pinned to `currentSrc`.
- **No `_ds_sync.json`.** The anchor's recipe doesn't fit this shape, so it's omitted on purpose.
  Every re-sync re-verifies everything, and the whole run takes a few minutes.
- **Verification:** build.mjs renders every card from disk into `ds-bundle/_screenshots/` (local only).
  Compare those against `guidelines/screenshots/components/` before uploading.

## Re-sync

```sh
npm run build:only
npx astro preview --port 4399   # background
node .design-sync/build.mjs
```

Then upload everything under `ds-bundle/` except `_screenshots/` and dot-files: sentinel first, then
content, then deletes for remote paths no longer produced, then re-arm the sentinel.

## Re-sync risks

- A new component or page section isn't captured until it's added to `COMPONENTS` in build.mjs.
- If `/work/aes-256/` is renamed, update `PAGES.case`.
- `docs/identity/*.md` filenames are copied by name (brand.md was once site-brand.md).
