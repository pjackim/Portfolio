// Off-script design-sync builder for this Astro site (the React converter doesn't apply: no
// React components). Produces ./ds-bundle from the real compiled site, never a reimplementation:
//   styles.css            -> @imports fonts/fonts.css, tokens/tokens.css, _ds_bundle.css
//   _ds_bundle.css        -> every compiled dist/_astro/*.css + per-instance page-style <style>s
//   fonts/                -> the self-hosted Geist / Geist Mono woff2 + @font-face rules
//   components/<g>/<N>/   -> <N>.html (@dsCard reference card: captured SSR markup, real CSS)
//                            <N>.prompt.md (source doc comment + markup + screenshot paths)
//   _preview/assets/      -> images the captured markup references
//   guidelines/           -> style/brand docs, page screenshots, per-component screenshots
//
// Usage: npm run build:only && npx astro preview --port 4399 &
//        node .design-sync/build.mjs [--base http://localhost:4399]
import { chromium } from '@playwright/test';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const OUT = join(ROOT, 'ds-bundle');
const DIST = join(ROOT, 'dist');
const BASE = process.argv.includes('--base')
  ? process.argv[process.argv.indexOf('--base') + 1]
  : 'http://localhost:4399';
const PREFIX = '/Portfolio';
const NS = 'PortfolioDS';

const PAGES = { home: '/', work: '/work/', case: '/work/aes-256/' };

// name, group, page, selector (first match), source component file for the doc comment, and an
// optional parent selector whose (empty) shell wraps the item so grid/subgrid layout still applies,
// and how many sibling items to keep in that shell (a lone card switches to the odd-last layout)
const COMPONENTS = [
  ['SiteHeader', 'Layout', 'home', 'header.site-header', 'SiteHeader'],
  ['SiteFooter', 'Layout', 'home', 'footer.site-footer', 'SiteFooter'],
  ['SectionHeading', 'Layout', 'home', '.home-section .section-heading', 'SectionHeading'],
  ['Hero', 'Hero', 'home', 'section.hero', 'Hero'],
  ['StatusStrip', 'Hero', 'home', 'dl.status-strip', 'StatusStrip'],
  ['Readouts', 'Hero', 'home', 'ul.readouts', 'Readouts'],
  ['Buttons', 'Controls', 'home', '.hero__buttons', null],
  ['ThemeToggle', 'Controls', 'home', '.theme-toggle-slot', 'ThemeToggle'],
  [
    'MotionToggle',
    'Controls',
    'home',
    '.site-footer .motion-toggle-slot, .site-footer .motion-toggle',
    'MotionToggle',
  ],
  ['TagList', 'Projects', 'home', '.card .tag-list', 'TagList'],
  ['ProjectCard', 'Projects', 'home', 'li.card', 'ProjectCard', 'ol.project-grid', 2],
  ['ProjectGrid', 'Projects', 'home', 'ol.project-grid', 'ProjectGrid'],
  ['ArchiveRow', 'Projects', 'home', 'li.archive-row', 'ArchiveRow', 'ol.archive'],
  ['ArchiveList', 'Projects', 'home', 'ol.archive', 'ArchiveList'],
  ['WorkFilter', 'Projects', 'work', 'div.work-filter', 'WorkFilter'],
  [
    'CapabilityGroups',
    'About',
    'home',
    'section.home-section:has(li.capability)',
    'CapabilityGroups',
  ],
  ['ExperienceList', 'About', 'home', 'ol.experience', 'ExperienceList'],
  ['ContactBlock', 'About', 'home', 'div.contact', 'ContactBlock'],
  ['CaseHeader', 'Case study', 'case', 'header.case__header', 'CaseHeader'],
  ['ProjectMeta', 'Case study', 'case', 'dl.project-meta', 'ProjectMeta'],
  ['CaseHero', 'Case study', 'case', 'figure.case-hero', 'CaseHero'],
  ['CaseIndex', 'Case study', 'case', 'nav.case-index', 'CaseIndex'],
  ['KeyPoints', 'Case study', 'case', 'section.case__key-points', null],
  ['Prose', 'Case study', 'case', 'div.case__prose', null],
  ['MediaFigure', 'Case study', 'case', 'section.case__gallery figure.figure', 'media/MediaFigure'],
  ['PrevNext', 'Case study', 'case', 'nav.prev-next, .prev-next', 'PrevNext'],
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const w = (rel, data) => {
  const p = join(OUT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, data);
};

function docComment(file) {
  if (!file) return '';
  const p = join(ROOT, 'src/components', `${file}.astro`);
  if (!existsSync(p)) return '';
  const m = /\/\*\*([\s\S]*?)\*\//.exec(readFileSync(p, 'utf8'));
  return m
    ? m[1]
        .split('\n')
        .map((l) => l.replace(/^\s*\* ?/, ''))
        .join('\n')
        .trim()
    : '';
}

// Copy a /Portfolio/... asset out of dist into _preview/assets, return its bundle-relative path.
const copied = new Set();
function asset(url) {
  if (!url.startsWith(PREFIX + '/')) return url;
  const rel = decodeURIComponent(url.slice(PREFIX.length + 1).split(/[?#]/)[0]);
  const src = join(DIST, rel);
  if (!existsSync(src)) return url;
  const name = basename(rel);
  if (!copied.has(name)) {
    mkdirSync(join(OUT, '_preview/assets'), { recursive: true });
    cpSync(src, join(OUT, '_preview/assets', name));
    copied.add(name);
  }
  return `_preview/assets/${name}`;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = async (scheme, width = 1440) =>
  browser.newContext({
    viewport: { width, height: 900 },
    colorScheme: scheme,
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
    bypassCSP: true,
  });

async function load(page, path) {
  await page.goto(BASE + PREFIX + path, { waitUntil: 'networkidle' });
  await page.evaluate(() =>
    document.querySelectorAll('img[loading="lazy"]').forEach((i) => (i.loading = 'eager')),
  );
  // Walk the page so every lazy cover decodes before a full-page capture.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
  });
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

// 1. Styles: fonts, per-instance page styles, compiled CSS.
const fontCss = [];
const pageStyles = new Set();
{
  const c = await ctx('light');
  const page = await c.newPage();
  for (const path of Object.values(PAGES)) {
    await load(page, path);
    for (const css of await page.evaluate(() =>
      [...document.querySelectorAll('style')].map((s) => s.textContent),
    )) {
      if (css.includes('@font-face')) fontCss.push(css);
      else if (css.includes('[data-style=')) pageStyles.add(css);
    }
  }
  await c.close();
}
const fontFiles = new Set();
const fontsCss = [...new Set(fontCss)]
  .join('\n')
  .replace(
    /url\("?\/Portfolio\/_astro\/fonts\/([^")]+)"?\)/g,
    (_, f) => (fontFiles.add(f), `url("${f}")`),
  );
for (const f of fontFiles)
  cpSync(join(DIST, '_astro/fonts', f), join(OUT, 'fonts', f), { recursive: true });
w(
  'fonts/fonts.css',
  `/* Geist + Geist Mono (variable, Latin subset) with metric-matched fallbacks, as the site emits them. */\n${fontsCss}\n`,
);
cpSync(join(ROOT, 'src/styles/tokens.css'), join(OUT, 'tokens/tokens.css'));

const cssFiles = readdirSync(join(DIST, '_astro'))
  .filter((f) => f.endsWith('.css'))
  .sort();
let bundleCss = cssFiles
  .map((f) => `/* ${f} */\n${readFileSync(join(DIST, '_astro', f), 'utf8')}`)
  .join('\n');
bundleCss = bundleCss.replace(/url\("?(\/Portfolio\/[^")]+)"?\)/g, (m, u) => {
  const r = asset(u);
  return r === u ? m : `url("${r}")`;
});
bundleCss += `\n/* per-instance styles (src/lib/page-style.ts) */\n${[...pageStyles].join('\n')}\n`;
w('_ds_bundle.css', bundleCss);
w(
  'styles.css',
  `/* Portfolio design system entry: fonts, tokens, then the site's compiled CSS. */\n@import url("fonts/fonts.css");\n@import url("tokens/tokens.css");\n@import url("_ds_bundle.css");\n`,
);
w(
  '_ds_bundle.js',
  `/* @ds-bundle: ${JSON.stringify({ namespace: NS, components: [], sourceHashes: {}, inlinedExternals: [], builtBy: 'cc-design-sync' })} */\n// Static-markup design system: there are no JS components. Build with the HTML + classes in\n// components/*/*.prompt.md; styles.css carries everything.\nwindow.${NS} = {};\n`,
);
w('_ds_needs_recompile', JSON.stringify({ by: 'design-sync-cli' }));

// 2. Page screenshots.
const shots = [];
for (const [scheme, width, tag] of [
  ['light', 1440, 'desktop-light'],
  ['dark', 1440, 'desktop-dark'],
  ['light', 390, 'mobile-light'],
]) {
  const c = await ctx(scheme, width);
  const page = await c.newPage();
  for (const [name, path] of Object.entries(PAGES)) {
    await load(page, path);
    const rel = `guidelines/screenshots/pages/${name}-${tag}.png`;
    await page.screenshot({ path: join(OUT, rel), fullPage: true });
    shots.push(rel);
  }
  await c.close();
}

// 3. Components: markup (light) + element screenshots (light, dark).
const captured = {};
for (const scheme of ['light', 'dark']) {
  const c = await ctx(scheme);
  const page = await c.newPage();
  let current = null;
  for (const [name, , pg, sel, , wrap, take = 1] of COMPONENTS) {
    if (current !== pg) {
      await load(page, PAGES[pg]);
      // The sticky header would otherwise overlap element captures below it.
      await page.addStyleTag({ content: '.site-header{position:static!important}' });
      current = pg;
    }
    const el = page.locator(sel).first();
    if (!(await el.count())) {
      console.warn(`[MISSING] ${name}: ${sel}`);
      continue;
    }
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const rel = `guidelines/screenshots/components/${name}-${scheme}.png`;
    await el.screenshot({ path: join(OUT, rel) });
    captured[name] ??= { shots: [] };
    captured[name].shots.push(rel);
    if (scheme === 'light') {
      captured[name].html = await el.evaluate(
        (first, [wrap, take]) => {
          const items = [first];
          while (items.length < take && items.at(-1).nextElementSibling)
            items.push(items.at(-1).nextElementSibling);
          const clean = (node) => {
            const n = node.cloneNode(true);
            n.querySelectorAll('picture source').forEach((s) => s.remove());
            const live = [...node.querySelectorAll('img, video')];
            [...n.querySelectorAll('img, video')].forEach((m, i) => {
              const cur = live[i]?.currentSrc;
              if (cur) m.setAttribute('src', new URL(cur).pathname);
              m.removeAttribute('srcset');
              m.removeAttribute('sizes');
              m.removeAttribute('loading');
              m.querySelectorAll?.('source').forEach((s) => s.remove());
            });
            n.querySelectorAll('[data-reveal-state]').forEach((e) =>
              e.removeAttribute('data-reveal-state'),
            );
            n.removeAttribute('data-reveal-state');
            n.querySelectorAll('script').forEach((e) => e.remove());
            n.querySelectorAll('canvas').forEach((e) => e.replaceChildren());
            return n;
          };
          const shell = wrap && first.closest(wrap)?.cloneNode(false);
          if (!shell) return clean(first).outerHTML;
          shell.removeAttribute('data-reveal-state');
          shell.append(...items.map(clean));
          return shell.outerHTML;
        },
        [wrap ?? null, take],
      );
    }
  }
  await c.close();
}
await browser.close();

// 4. Cards + prompt docs.
const rewrite = (html, prefix) =>
  html.replace(/(src|poster)="(\/Portfolio\/[^"]+)"/g, (m, a, u) => {
    const r = asset(u);
    return r === u ? m : `${a}="${prefix}${r}"`;
  });
const index = [];
for (const [name, group, pg, sel, file] of COMPONENTS) {
  const cap = captured[name];
  if (!cap?.html) continue;
  const dir = `components/${slug(group)}/${name}`;
  const cardHtml = rewrite(cap.html, '../../../');
  w(
    `${dir}/${name}.html`,
    `<!-- @dsCard group="${group}" -->\n<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${name}</title>\n<link rel="stylesheet" href="../../../styles.css">\n<style>body{margin:0;padding:24px;background:var(--bg);color:var(--text)}</style>\n</head><body>\n${cardHtml}\n</body></html>\n`,
  );
  const doc = docComment(file);
  const md = `# ${name}

- **Group:** ${group}
- **Source:** ${file ? `\`src/components/${file}.astro\`` : 'page markup (no dedicated component)'}; captured from \`${PAGES[pg]}\` (selector \`${sel}\`)
- **Screenshots:** ${cap.shots.map((s) => `\`${s}\``).join(', ')}

This is **static HTML styled by \`styles.css\`**, not a JS component. To reproduce it exactly,
copy the markup below verbatim, including every \`class\` and \`data-astro-cid-*\` attribute (the
compiled CSS is scoped by them), then swap the text and image \`src\` for your content.
Interactive effects that need the site's scripts (scramble, count-up readouts, reticle spotlight,
filters) render in their final, at-rest state.
${doc ? `\n## What it is (from the source)\n\n${doc}\n` : ''}
## Markup

\`\`\`html
${rewrite(cap.html, '')}
\`\`\`
`;
  w(`${dir}/${name}.prompt.md`, md);
  index.push({ name, group, dir });
}

// 4b. Verify: render every card from disk (stays local in _screenshots/, never uploaded).
{
  const b = await chromium.launch();
  for (const scheme of ['light', 'dark']) {
    const c = await b.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: scheme,
      reducedMotion: 'reduce',
    });
    const page = await c.newPage();
    for (const { name, dir } of index) {
      await page.goto(pathToFileURL(join(OUT, dir, name + '.html')).href, { waitUntil: 'load' });
      await page.evaluate(() =>
        Promise.all([
          document.fonts.ready,
          ...[...document.images].map((i) => i.decode().catch(() => {})),
        ]),
      );
      await page.screenshot({
        path: join(OUT, '_screenshots', `${name}-${scheme}.png`),
        fullPage: true,
      });
    }
    await c.close();
  }
  await b.close();
}

// 5. Guidelines.
cpSync(join(ROOT, 'docs/identity/site-style.md'), join(OUT, 'guidelines/site-style.md'));
cpSync(join(ROOT, 'docs/identity/brand.md'), join(OUT, 'guidelines/brand.md'));
// The sourced design research behind the goals. Each file ends with "Applying it here", written
// against repo paths; the conventions header translates those rules for the design agent.
const DESIGN_DOCS = {
  'scanning-and-reading': 'how visitors scan; headings, copy length, link text',
  cards: 'the whole-card link pattern and what a card carries',
  'progressive-disclosure': 'the two fixed levels (surface, case study)',
  'bento-grid': 'varied-size showcase grid rules',
  motion: 'what motion is for, timing, reduced motion',
  'typography-and-layout': 'squint test, spacing rhythm, type roles, copy lengths',
  'anti-slop': 'avoiding the generic AI-generated look',
};
for (const name of Object.keys(DESIGN_DOCS))
  cpSync(join(ROOT, `docs/design/${name}.md`), join(OUT, `guidelines/design/${name}.md`));
// Project goals + the fact-only content rule, lifted verbatim from CLAUDE.md.
{
  const md = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');
  const goals = /^## Goals[\s\S]*?(?=^## )/m.exec(md)?.[0];
  const factOnly = /^- \*\*Content is fact-only\.\*\*[\s\S]*?(?=^- \*\*)/m.exec(md)?.[0];
  if (!goals || !factOnly) throw new Error('CLAUDE.md: Goals section or fact-only rule not found');
  w(
    'guidelines/project-goals.md',
    `# Project goals\n\nVerbatim from the repo's CLAUDE.md. Paths name source files in the site repo; the\nconventions in README.md translate them into what to do in a design.\n\n${goals.trim()}\n\n## Content rule\n\n${factOnly.trim()}\n`,
  );
}
w(
  'guidelines/index.md',
  `# Guidelines

- \`project-goals.md\`: what every page must achieve, in priority order, and the fact-only content rule. Read first.
- \`site-style.md\`: the "operator console" style profile (palette roles, type roles, shape, motion, voice, on/off-vibe test).
- \`brand.md\`: the named signature patterns (reticle, decrypt, readouts...) and how to rebuild them.
- \`design/\`: the sourced research behind the goals; each file ends with "Applying it here".
${Object.entries(DESIGN_DOCS)
  .map(([n, d]) => `  - \`design/${n}.md\`: ${d}`)
  .join('\n')}
- \`screenshots/pages/\`: full-page captures of the home page, the work index, and a case study, at 1440px (light, dark) and 390px (light).
${shots.map((s) => `  - \`${s.replace('guidelines/', '')}\``).join('\n')}
- \`screenshots/components/\`: each component in light and dark.
`,
);

// 6. README (conventions header + index).
const header = existsSync(join(ROOT, '.design-sync/conventions.md'))
  ? readFileSync(join(ROOT, '.design-sync/conventions.md'), 'utf8') + '\n\n'
  : '';
const byGroup = Object.groupBy(index, (c) => c.group);
w(
  'README.md',
  `${header}## Component index

${Object.entries(byGroup)
  .map(
    ([g, cs]) =>
      `### ${g}\n${cs.map((c) => `- \`${c.name}\`: \`${c.dir}/${c.name}.prompt.md\``).join('\n')}`,
  )
  .join('\n\n')}
`,
);
console.log(
  `built ${index.length} components, ${shots.length} page shots, ${copied.size} assets, ${fontFiles.size} fonts -> ds-bundle/`,
);
