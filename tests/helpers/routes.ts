/**
 * Shared route data for the e2e specs. Pages are discovered from the build output (every
 * `index.html` under `dist/`), so a new project page is covered without touching the tests. All
 * paths are relative to the base URL (`''`, `work/`, `work/<slug>/`) — no leading slash, so
 * `page.goto()` resolves them under `/Portfolio/`.
 */
import { globSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page, Response } from '@playwright/test';

const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));

/** `globSync` returns OS-separated paths (`\` on Windows); routes and names are URL paths. */
const globPosix = (pattern: string): string[] =>
  globSync(pattern, { cwd: DIST }).map((file) => file.split(sep).join('/'));

/** The post-deploy (`@prod`) sample: home + one project. */
export const PROD_ROUTES: readonly string[] = ['', 'work/credential-correlation/'];

/** The 404 page, as built (not an `index.html` route). */
export const NOT_FOUND_PAGE = '404.html';

/**
 * Legacy `html/Work/<name>.html` pages → their new home (relative to the base). The contract
 * the redirect stubs must honour; `LEGACY_PAGES` (what the build emitted) must match it.
 */
export const LEGACY_REDIRECTS: Readonly<Record<string, string>> = {
  aes: 'work/aes-256/',
  alvin: 'work/',
  ant_game: 'work/ant-game/',
  archlinux: 'work/arch-linux/',
  credential_correlation: 'work/credential-correlation/',
  foresthack: 'work/the-forest/',
  go_green: 'work/go-green/',
  hero_trivia: 'work/hero-trivia/',
  lost_city: 'work/lost-city/',
  mordhauhack: 'work/mordhau/',
  mordhaumod: 'work/hardpoint/',
  nodes: 'work/nodes/',
  over_the_rainbow: 'work/over-the-rainbow/',
  paradox: 'work/paradox/',
  spectre: 'work/spectre/',
  tripsite: 'work/trip-planner/',
};

/** `<name>` of every `dist/html/Work/<name>.html` stub the build emitted. */
export const LEGACY_PAGES: readonly string[] = globPosix('html/Work/*.html')
  .map((file) => file.replace(/^.*\/|\.html$/g, ''))
  .sort();

/** Every indexed page: `''` (home), `work/`, `work/<slug>/`. */
export const ROUTES: readonly string[] = discoverRoutes();

/**
 * The error screens built to `errors/<code>/` (everything but the 404, which is `NOT_FOUND_PAGE`).
 * They are noindex and have no canonical, so `ROUTES` leaves them out; errors.spec.ts covers
 * them, and the specs that check every page's accessibility and links add them to their lists.
 */
export const ERROR_ROUTES: readonly string[] = globPosix('errors/*/index.html')
  .map((file) => file.replace(/index\.html$/, ''))
  .sort();

/**
 * The HTML of the built page at base-relative `route`, as the preview server sends it, read from
 * `dist/`. Specs that need the server's markup (before any script has run) use this, not
 * `request.get()`: Node's socket to the preview server (it listens on `[::1]` only) times out
 * whenever the single-threaded server stalls for a quarter of a second, which failed tests before
 * their first assertion. Not for `BASE_URL` runs against a live site (`@prod` specs).
 */
export function builtHtml(route: string): string {
  return readFileSync(join(DIST, route, 'index.html'), 'utf8');
}

/** The pages with a `<video>` (screen-recording loops), as built; see helpers/platform.ts. */
export const VIDEO_ROUTES: readonly string[] = ROUTES.filter((route) => {
  try {
    return builtHtml(route).includes('<video');
  } catch {
    return false;
  }
});

function discoverRoutes(): string[] {
  const routes = globPosix('**/index.html')
    .filter((file) => !file.startsWith('errors/'))
    .map((file) => file.replace(/index\.html$/, ''))
    .sort();
  if (routes.length > 0) return routes;
  // A post-deploy run (`BASE_URL` set, `--grep @prod`) needs no local build.
  if (process.env.BASE_URL) return [...PROD_ROUTES];
  throw new Error('tests: no pages in dist/ — run `npm run build:only` first.');
}

/** Title suffix that puts a test in the post-deploy subset. */
export const prodTag = (route: string): string => (PROD_ROUTES.includes(route) ? ' @prod' : '');

/** Human-readable name of a route for test titles. */
export const routeName = (route: string): string => (route === '' ? 'home' : route);

/** Navigates to a base-relative path (`''`, `work/`, …). */
export async function gotoRel(page: Page, path: string): Promise<Response | null> {
  if (path.startsWith('/')) throw new Error(`gotoRel: "${path}" must not start with "/"`);
  return page.goto(path);
}
