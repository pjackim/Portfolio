export const meta = {
  name: 'update-adr',
  description:
    'Refresh the codebase-memory-mcp ADR: npm run graph:snapshot into docs/codebase/, draft + verify each section against source, persist via manage_adr',
  whenToUse:
    'After merging structural changes to the Portfolio repo, to keep the codebase-memory-mcp Architecture Decision Record current',
  phases: [
    {
      title: 'Snapshot',
      detail: 'npm run graph:snapshot -- --reindex, read current ADR',
      model: 'sonnet',
    },
    { title: 'Draft', detail: 'one agent per ADR section', model: 'sonnet' },
    {
      title: 'Verify',
      detail: 'adversarial fact-check of each section against source',
      model: 'sonnet',
    },
    {
      title: 'Overview',
      detail: 'overview + hotspots/coupling from docs/codebase/*.json',
      model: 'sonnet',
    },
    { title: 'Publish', detail: 'manage_adr --mode update, confirm outline', model: 'sonnet' },
  ],
};

const MODEL = 'sonnet';
const REPO = (args && args.repoPath) || 'C:/Users/m0rt/projects/Portfolio';
const CLI = 'codebase-memory-mcp cli --quiet';
const SNAP_DIR = 'docs/codebase';
const snapFiles = (aspects) => aspects.map((a) => `${SNAP_DIR}/${a}.json`).join(', ');

// Stable headings: later runs (or manual set_sections edits) rely on these exact names.
const SECTIONS = [
  {
    title: 'Content model',
    scope:
      'src/content.config.ts, src/content/projects/, src/lib/projects.ts, src/data/site.ts, src/data/taxonomy.ts',
    aspects: ['file_tree', 'hotspots', 'clusters'],
  },
  {
    title: 'Rendering and routing',
    scope:
      'src/pages/ (incl. src/pages/html/Work/[legacy].html.ts redirects), src/layouts/, src/components/, src/lib/url.ts, src/lib/legacy.ts, astro.config.ts',
    aspects: ['routes', 'file_tree', 'boundaries', 'layers'],
  },
  {
    title: 'Client runtime and motion',
    scope:
      'src/scripts/ (motion, motion-toggle, reveal, hero*, theme, lightbox, work-filter, video, youtube), the 30 KB/page script budget in lighthouserc.json',
    aspects: ['hotspots', 'clusters', 'cycles'],
  },
  {
    title: 'Security, SEO and styling',
    scope:
      'src/lib/csp.ts, src/lib/seo.ts, src/lib/page-style.ts, src/layouts/BaseLayout.astro, src/styles/',
    aspects: ['file_tree', 'hotspots'],
  },
  {
    title: 'Media pipeline',
    scope:
      'scripts/media/ (build, check, migrate, lib), src/lib/media.ts, src/lib/images.ts, src/components/media/, scripts/og/, src/lib/monogram.ts',
    aspects: ['entry_points', 'clusters', 'hotspots'],
  },
  {
    title: 'Build, test and CI',
    scope:
      'package.json scripts, scripts/cbm.ts, scripts/graph-*.ts, src/lib/build-info.ts, tests/, playwright config, lighthouserc.json, .github/workflows/, .config/wt.toml',
    aspects: ['entry_points', 'dependencies', 'packages'],
  },
];
const OVERVIEW_ASPECTS = [
  'overview',
  'languages',
  'packages',
  'layers',
  'boundaries',
  'hotspots',
  'clusters',
  'cycles',
];

const SNAPSHOT = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    project: { type: 'string', description: 'the "project" field of docs/codebase/structure.json' },
    nodes: { type: 'number' },
    edges: { type: 'number' },
    previous_adr: {
      type: 'string',
      description: 'full current ADR markdown, empty string if none',
    },
    error: { type: 'string' },
  },
  required: ['ok', 'project', 'nodes', 'edges', 'previous_adr'],
};
const SECTION = {
  type: 'object',
  properties: {
    body: { type: 'string', description: 'section body markdown, no ## heading' },
    sources: { type: 'array', items: { type: 'string' } },
  },
  required: ['body', 'sources'],
};
const VERIFIED = {
  type: 'object',
  properties: {
    body: { type: 'string', description: 'corrected section body markdown, no ## heading' },
    removed_or_corrected: { type: 'array', items: { type: 'string' } },
  },
  required: ['body', 'removed_or_corrected'],
};
const OVERVIEW = {
  type: 'object',
  properties: {
    overview: { type: 'string' },
    coupling: { type: 'string' },
  },
  required: ['overview', 'coupling'],
};
const PUBLISHED = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    headings: { type: 'array', items: { type: 'string' } },
    error: { type: 'string' },
  },
  required: ['ok', 'headings'],
};

function splitSections(md) {
  const out = {};
  let cur = null;
  for (const line of (md || '').split('\n')) {
    const m = line.match(/^## (.+?)\s*$/);
    if (m) {
      cur = m[1];
      out[cur] = [];
      continue;
    }
    if (cur) out[cur].push(line);
  }
  for (const k of Object.keys(out)) out[k] = out[k].join('\n').trim();
  return out;
}

const FACT_RULE =
  'Every claim must trace to the current source, CLAUDE.md, README, or docs/. Only state a rationale ("why") if it is written down in one of those places; otherwise write "Rationale not recorded." Never invent decisions, numbers, or file paths.';

// ---- Snapshot ----
phase('Snapshot');
const snap = await agent(
  `Working directory: ${REPO}. Run these with the Bash tool and report results:
1. \`npm run graph:snapshot -- --reindex\` (from ${REPO}). It re-indexes the repo and writes one get_architecture JSON per aspect into ${SNAP_DIR}/. It exits non-zero on failure.
2. Read ${SNAP_DIR}/structure.json and return its "project", "total_nodes" and "total_edges" fields.
3. \`${CLI} manage_adr --project <that project> --mode get\` and return its full markdown content verbatim as previous_adr (empty string if there is no ADR yet).
Set ok=false and fill error if step 1 or 2 fails.`,
  { label: 'snapshot', phase: 'Snapshot', schema: SNAPSHOT, model: MODEL, effort: 'low' },
);
if (!snap || !snap.ok) {
  return { ok: false, stage: 'snapshot', error: snap ? snap.error : 'snapshot agent died' };
}
const PROJECT = snap.project;
log(
  `${PROJECT}: ${snap.nodes} nodes / ${snap.edges} edges; previous ADR ${snap.previous_adr ? 'found' : 'empty'}`,
);
const prev = splitSections(snap.previous_adr);

// ---- Sections (draft -> verify, no barrier) + overview in parallel ----
const graphHint = `Graph tools (codebase-memory-mcp MCP, always pass project="${PROJECT}") or the CLI (\`${CLI} search_graph --project ${PROJECT} ...\`) are available; Read/Grep are fine for verification. ${SNAP_DIR}/<aspect>.json holds fresh get_architecture snapshots (overview, structure, dependencies, routes, languages, packages, entry_points, hotspots, boundaries, layers, file_tree, clusters, cycles).`;

const [sections, ov] = await parallel([
  () =>
    pipeline(
      SECTIONS,
      (s) =>
        agent(
          `You are writing one section of this repo's Architecture Decision Record (ADR), persisted in codebase-memory-mcp.
Section: "${s.title}". Scope: ${s.scope}. Repo root: ${REPO}.
${graphHint}
Start from the snapshots most relevant to this section: ${snapFiles(s.aspects)}.
Read the in-scope source and write the section body in markdown with NO "##" heading. Use "### <decision>" for each notable architectural decision (3-6 of them), each with short bullets:
- **Decision** — what the code does / enforces
- **Why** — ${FACT_RULE}
- **Consequences** — the constraint a contributor must respect
- **Where** — file paths
Keep it under ~350 words. Scannable, no filler.
${prev[s.title] ? `Previous version of this section (keep what is still true, drop what is stale):\n<<<\n${prev[s.title]}\n>>>` : 'There is no previous version of this section.'}`,
          { label: `draft:${s.title}`, phase: 'Draft', schema: SECTION, model: MODEL },
        ),
      (draft, s) =>
        agent(
          `Adversarially fact-check this ADR section ("${s.title}", scope: ${s.scope}) against the CURRENT source in ${REPO}.
${graphHint}
For every claim — file paths, symbol names, behaviours, numbers, stated rationale — open the source and confirm it. Assume each claim is wrong until you see it. Remove or correct anything you cannot confirm; a "Why" with no written source becomes "Rationale not recorded." Do not add new decisions. Keep the same structure (### headings, bullets) and no "##" heading.
List each removal/correction in removed_or_corrected.
Draft cited sources: ${(draft.sources || []).join(', ')}
<<<
${draft.body}
>>>`,
          { label: `verify:${s.title}`, phase: 'Verify', schema: VERIFIED, model: MODEL },
        ),
    ),
  () =>
    agent(
      `Read these codebase-memory-mcp get_architecture snapshots for this Astro portfolio site (repo root ${REPO}): ${snapFiles(OVERVIEW_ASPECTS)}, plus CLAUDE.md's Overview/Architecture sections.
Write two markdown blocks with no "##" headings:
1. overview — 4-6 sentences: what the system is, its main layers/packages, and how a request/build flows through them.
2. coupling — bullets on hotspots (highest fan-in symbols), cross-package boundaries, clusters, and any cycles (cycles.json), taken from those files. Name symbols by short name with file path. ${FACT_RULE}`,
      { label: 'overview', phase: 'Overview', schema: OVERVIEW, model: MODEL, effort: 'low' },
    ),
]);

const done = (sections || []).map((r, i) => ({ s: SECTIONS[i], r })).filter((x) => x.r);
const dropped = SECTIONS.filter((_, i) => !(sections || [])[i]).map((s) => s.title);
if (dropped.length) log(`Sections that failed and keep their previous text: ${dropped.join(', ')}`);
if (!ov) return { ok: false, stage: 'overview', error: 'overview agent died' };

const bodies = SECTIONS.map((s) => {
  const hit = done.find((x) => x.s.title === s.title);
  return {
    title: s.title,
    body: hit ? hit.r.body.trim() : prev[s.title] || '_Not generated this run._',
  };
});

const content = [
  '# Architecture Decision Record: Portfolio',
  '',
  `> Maintained by the \`update-adr\` workflow from \`${SNAP_DIR}/*.json\` (\`npm run graph:snapshot\`), each section fact-checked against source. Graph at generation: ${snap.nodes} nodes / ${snap.edges} edges.`,
  '',
  '## Overview',
  '',
  ov.overview.trim(),
  '',
  ...bodies.flatMap((b) => [`## ${b.title}`, '', b.body, '']),
  '## Hotspots and coupling',
  '',
  ov.coupling.trim(),
  '',
].join('\n');

const expected = ['Overview', ...SECTIONS.map((s) => s.title), 'Hotspots and coupling'];

// ---- Publish ----
phase('Publish');
const pub = await agent(
  `Persist an ADR document into codebase-memory-mcp. Work in a temp dir (\`mktemp -d\`), not the repo.
1. Use the Write tool to write the markdown between the markers below to <tmp>/adr.md EXACTLY, byte for byte (do not edit, reflow, or summarize it).
2. Build the args file with node so escaping is exact:
   node -e "const fs=require('fs');fs.writeFileSync(process.argv[2],JSON.stringify({project:'${PROJECT}',mode:'update',content:fs.readFileSync(process.argv[1],'utf8')}))" <tmp>/adr.md <tmp>/args.json
3. Run \`${CLI} manage_adr --args-file <tmp>/args.json\`.
4. Run \`${CLI} manage_adr --project ${PROJECT} --mode outline --format json\` and return the section headings it lists (heading text only, without #).
5. Delete the temp dir. Set ok=false and fill error if step 3 fails.
<<<ADR_START
${content}
ADR_END>>>`,
  { label: 'publish', phase: 'Publish', schema: PUBLISHED, model: MODEL, effort: 'low' },
);

const missing = pub ? expected.filter((h) => !pub.headings.some((x) => x.trim() === h)) : expected;
if (missing.length) log(`Outline is missing expected headings: ${missing.join(', ')}`);

return {
  ok: !!(pub && pub.ok) && missing.length === 0,
  project: PROJECT,
  graph: { nodes: snap.nodes, edges: snap.edges },
  sections_updated: done.map((x) => x.s.title),
  sections_failed: dropped,
  corrections: done.map((x) => ({
    section: x.s.title,
    removed_or_corrected: x.r.removed_or_corrected,
  })),
  published_headings: pub ? pub.headings : [],
  publish_error: pub ? pub.error || null : 'publish agent died',
};
