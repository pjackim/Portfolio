/**
 * Links and assets: on every page, every same-origin link and asset URL lives under
 * `/Portfolio/`, each unique one answers below 400 (requested once for the whole site), and
 * every `#hash` / `path#hash` link lands on an element that exists. mailto: and external
 * URLs are out of scope (the weekly lychee workflow covers external links).
 *
 * The markup is the same in every browser, so this runs in the `chromium` project only.
 */
import { expect, test } from '@playwright/test';
import { gotoRel, NOT_FOUND_PAGE, ROUTES } from './helpers/routes.ts';

const PAGES = [...ROUTES, NOT_FOUND_PAGE];

/** URL-bearing attributes: [selector, attribute]. `srcset` holds a candidate list. */
const SOURCES: ReadonlyArray<readonly [string, string]> = [
  ['a[href]', 'href'],
  ['img[src]', 'src'],
  ['img[srcset]', 'srcset'],
  ['source[src]', 'src'],
  ['source[srcset]', 'srcset'],
  ['link[rel="stylesheet"][href]', 'href'],
  ['link[rel="icon"][href]', 'href'],
  ['link[rel="preload"][href]', 'href'],
  ['link[rel="apple-touch-icon"][href]', 'href'],
  ['link[rel="sitemap"][href]', 'href'],
];

/** Requests in flight at once. */
const CONCURRENCY = 12;

test('internal URLs resolve and hash targets exist', async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'markup is browser-independent');
  test.setTimeout(180_000);

  /** URL without hash → pages referencing it. */
  const resources = new Map<string, Set<string>>();
  /** URL with a hash → pages referencing it. */
  const anchors = new Map<string, Set<string>>();
  const note = (map: Map<string, Set<string>>, url: string, from: string) =>
    map.set(url, (map.get(url) ?? new Set()).add(from));

  for (const path of PAGES) {
    await gotoRel(page, path);
    const origin = new URL(page.url()).origin;
    const found = await page.evaluate((sources) => {
      const urls: string[] = [];
      for (const [selector, attribute] of sources) {
        for (const element of document.querySelectorAll(selector)) {
          const value = element.getAttribute(attribute) ?? '';
          const candidates =
            attribute === 'srcset'
              ? value.split(',').map((candidate) => candidate.trim().split(/\s+/)[0] ?? '')
              : [value];
          for (const candidate of candidates) {
            if (candidate) urls.push(new URL(candidate, document.baseURI).href);
          }
        }
      }
      return urls;
    }, SOURCES);
    // Never pass vacuously: every page links somewhere (at least the skip link).
    expect(found.length, `URLs collected on ${path || 'home'}`).toBeGreaterThan(0);

    for (const href of found) {
      const url = new URL(href);
      if (url.origin !== origin) continue; // external, mailto:, …
      expect.soft(url.pathname, `${href} (on ${path || 'home'})`).toMatch(/^\/Portfolio\//);
      if (url.hash) note(anchors, href, path);
      url.hash = '';
      note(resources, url.href, path);
    }
  }

  // Each unique URL once.
  const bodies = new Map<string, string>();
  const urls = [...resources.keys()];
  expect(urls.length, 'unique internal URLs collected').toBeGreaterThan(0);
  // The skip link (`#main`) alone guarantees at least one.
  expect(anchors.size, 'hash links collected').toBeGreaterThan(0);
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    await Promise.all(
      urls.slice(i, i + CONCURRENCY).map(async (url) => {
        const response = await request.get(url);
        const from = [...(resources.get(url) ?? [])].map((p) => p || 'home').join(', ');
        expect.soft(response.status(), `${url} (on ${from})`).toBeLessThan(400);
        if ((response.headers()['content-type'] ?? '').startsWith('text/html')) {
          bodies.set(url, await response.text());
        }
      }),
    );
  }

  // Hash targets exist on the destination page.
  for (const [href, from] of anchors) {
    const url = new URL(href);
    const id = decodeURIComponent(url.hash.slice(1));
    url.hash = '';
    const html = bodies.get(url.href) ?? '';
    const exists = await page.evaluate(
      ([source, target]) =>
        new DOMParser().parseFromString(source, 'text/html').getElementById(target) !== null,
      [html, id] as const,
    );
    const pages = [...from].map((p) => p || 'home').join(', ');
    expect.soft(exists, `#${id} missing on ${url.pathname} (linked from ${pages})`).toBe(true);
  }

  testInfo.annotations.push({
    type: 'checked',
    description: `${PAGES.length} pages, ${urls.length} unique URLs, ${anchors.size} hash links`,
  });
});
