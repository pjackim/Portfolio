/**
 * Redirect stubs at the legacy site's exact URLs (spec-architecture §6): `html/Work/<name>.html`
 * for every project's `legacyPaths` → `work/<slug>/`, plus the removed pages in
 * `REMOVED_LEGACY`. GitHub Pages can't send HTTP redirects, so each stub is a tiny document
 * with a zero-delay meta refresh, a canonical link to the new URL and a visible fallback link.
 *
 * No script (Astro's CSP doesn't cover endpoints) and nothing to load, so the stub carries its
 * own policy that allows nothing at all.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { REMOVED_LEGACY } from '../../../lib/legacy';
import { getProjects } from '../../../lib/projects';
import { absoluteUrl } from '../../../lib/seo';

const LEGACY_PAGE = /^html\/Work\/([a-z_]+)\.html$/;

interface Props {
  /** Absolute URL of the new page. */
  target: string;
}

export const getStaticPaths = (async () => {
  const projects = await getProjects();
  const redirects: [legacyPath: string, target: string][] = [
    ...projects.flatMap((p) =>
      p.data.legacyPaths.map((path): [string, string] => [path, `work/${p.id}/`]),
    ),
    ...Object.entries(REMOVED_LEGACY),
  ];
  return redirects.map(([path, target]) => {
    const name = LEGACY_PAGE.exec(path)?.[1];
    if (!name) throw new Error(`legacy redirects: not an html/Work/<name>.html path: ${path}`);
    return { params: { legacy: name }, props: { target: absoluteUrl(target) } satisfies Props };
  });
}) satisfies GetStaticPaths;

const escapeHtml = (text: string) =>
  text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export const GET: APIRoute<Props> = ({ props }) => {
  const url = escapeHtml(props.target);
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="content-security-policy" content="default-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="robots" content="noindex">
<title>Moved — Parker Jackim</title>
<link rel="canonical" href="${url}">
<meta http-equiv="refresh" content="0; url=${url}">
</head>
<body>
<p>This page moved to <a href="${url}">${url}</a>.</p>
</body>
</html>
`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
};
