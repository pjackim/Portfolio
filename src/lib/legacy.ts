/**
 * Legacy pages that no longer have a project. Maps the legacy path to the redirect target
 * (raw, relative to the base — wrap with `withBase()`). Project redirects come from each
 * project's `legacyPaths` frontmatter instead.
 */
export const REMOVED_LEGACY: Record<string, string> = {
  'html/Work/alvin.html': 'work/',
};
