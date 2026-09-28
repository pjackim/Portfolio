/**
 * The element a `#fragment` names — the one lookup behind in-page anchor scrolling
 * (smooth-scroll.ts) and the case-study index (case-index.ts). The id is percent-decoded, and a
 * malformed escape (`#%zz`) is looked up as written, as the browser does. (src/scripts/reveal.ts,
 * inlined and so import-free, asks the browser itself: `:target`.)
 */
export function fragmentTarget(hash: string): HTMLElement | null {
  let id = hash.startsWith('#') ? hash.slice(1) : hash;
  try {
    id = decodeURIComponent(id);
  } catch {
    // Not valid percent-encoding: as written.
  }
  return id ? document.getElementById(id) : null;
}
