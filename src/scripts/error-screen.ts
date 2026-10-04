/**
 * Error screens (src/components/ErrorScreen.astro): fills in what only the browser knows. An
 * error document is served at the address that failed, so `location` is the request:
 *
 * - the requested path goes into the panel's Path row (a break may fall after any slash);
 * - on the 404, where the screen carries `data-routes` (the site's real pages), the closest one
 *   to that path becomes the "Closest match" link: a typo'd project name, a path missing its
 *   `work/`, or an address cut short.
 *
 * Both land in slots the layout already reserves (hidden by `visibility`, not removed), so
 * nothing moves when they appear, and without script they simply stay blank. Text only goes
 * in as text nodes: the path is the visitor's input, never markup. Import-free, so
 * Astro inlines it and it costs no request.
 */

export {};

/** Edit distance between two short strings (insert, delete, replace). */
const distance = (a: string, b: string): number => {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j]!;
      row[j] = Math.min(above + 1, row[j - 1]! + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length]!;
};

const tidy = (path: string): string =>
  path
    .toLowerCase()
    .replace(/\.html?$/, '')
    .replace(/^\/+|\/+$/g, '');

/** The route nearest `wanted` (both base-relative), or nothing when none is near enough. */
function closest(wanted: string, routes: ReadonlyArray<readonly [string, string]>) {
  if (wanted.length < 3) return undefined;
  let best: { score: number; path: string; label: string } | undefined;
  for (const [path, label] of routes) {
    const target = tidy(path);
    // A cut-short address (`work/trip`) is a prefix of the page it was meant for.
    const score = target.startsWith(wanted) ? 0.5 : distance(wanted, target);
    if (score <= Math.max(2, target.length * 0.3) && (!best || score < best.score)) {
      best = { score, path, label };
    }
  }
  return best;
}

const root = document.querySelector<HTMLElement>('[data-error-screen]');
if (root) {
  const base = root.dataset.base ?? '/';
  let path = location.pathname;
  try {
    path = decodeURIComponent(path);
  } catch {
    // A malformed escape: show it as it came.
  }

  const slot = root.querySelector<HTMLElement>('[data-error-path]');
  if (slot) {
    // A line break may fall after any slash, so a long path wraps at its segments.
    (path + location.search).split('/').forEach((part, i) => {
      if (i > 0) slot.append('/', document.createElement('wbr'));
      slot.append(part);
    });
    slot.closest('[data-live]')?.setAttribute('data-ready', '');
  }

  const suggest = root.querySelector<HTMLElement>('[data-suggest]');
  const link = root.querySelector<HTMLAnchorElement>('[data-suggest-link]');
  const label = root.querySelector<HTMLElement>('[data-suggest-label]');
  if (suggest && link && label && root.dataset.routes) {
    try {
      const routes = JSON.parse(root.dataset.routes) as Array<[string, string]>;
      const wanted = tidy(path.startsWith(base) ? path.slice(base.length) : path);
      const match = closest(wanted, routes);
      if (match) {
        link.href = base + match.path;
        label.textContent = match.label;
        suggest.setAttribute('data-ready', '');
      }
    } catch {
      // Unreadable route list: no suggestion.
    }
  }
}
