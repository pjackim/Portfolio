/**
 * Redirect stubs at the legacy site's exact URLs (spec-architecture §6): `html/Work/<name>.html`
 * for every project's `legacyPaths` → `work/<slug>/`. Legacy pages without a published project
 * — `REMOVED_LEGACY`, and the `legacyPaths` of draft projects — go to `work/`. GitHub Pages
 * can't send HTTP redirects, so each stub is a tiny document with a zero-delay meta refresh
 * and a visible fallback link (root-relative, so they work on any host, e.g. the local
 * preview) plus an absolute canonical link.
 *
 * No script (Astro's CSP doesn't cover endpoints) and nothing to load, so the stub carries its
 * own policy that allows nothing at all.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { REMOVED_LEGACY } from '../../../lib/legacy';
import { getAllProjectEntries, getProjects } from '../../../lib/projects';
import { absoluteUrl, withBase } from '../../../lib/url';

const LEGACY_PAGE = /^html\/Work\/([a-z_]+)\.html$/;

interface Props {
  /** Target path relative to the base, e.g. `work/the-forest/`. */
  target: string;
}

export const getStaticPaths = (async () => {
  const [entries, published] = await Promise.all([getAllProjectEntries(), getProjects()]);
  const live = new Set(published.map((p) => p.id));
  const targets = new Map<string, string>(Object.entries(REMOVED_LEGACY));
  for (const entry of entries) {
    for (const path of entry.data.legacyPaths) {
      if (targets.has(path)) throw new Error(`legacy redirects: ${path} is claimed twice`);
      targets.set(path, live.has(entry.id) ? `work/${entry.id}/` : 'work/');
    }
  }
  return [...targets].map(([path, target]) => {
    const name = LEGACY_PAGE.exec(path)?.[1];
    if (!name) throw new Error(`legacy redirects: not an html/Work/<name>.html path: ${path}`);
    return { params: { legacy: name }, props: { target } satisfies Props };
  });
}) satisfies GetStaticPaths;

const escapeHtml = (text: string) =>
  text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export const GET: APIRoute<Props> = ({ props }) => {
  const href = escapeHtml(withBase(props.target));
  const canonical = escapeHtml(absoluteUrl(props.target));
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="content-security-policy" content="default-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="robots" content="noindex">
<title>Moved — Parker Jackim</title>
<link rel="canonical" href="${canonical}">
<meta http-equiv="refresh" content="0; url=${href}">
</head>
<body>
<p>This page moved to <a href="${href}">${href}</a>.</p>
</body>
</html>
`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
};
