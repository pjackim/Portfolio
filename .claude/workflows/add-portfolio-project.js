export const meta = {
  name: 'add-portfolio-project',
  description:
    'Autonomously add a repository (local path or URL) to the portfolio as a new project: explore it, source every fact and media asset, write the entry, verify it, and merge it into the originating branch',
  whenToUse:
    'Run by the add-to-portfolio skill ("add to portfolio <path|url>", "new portfolio project <path|url>")',
  phases: [
    { title: 'Acquire', detail: 'resolve or clone the source, git facts, duplicate check' },
    {
      title: 'Explore',
      detail: 'six read-only lenses over the source, then a completeness critic',
    },
    { title: 'Ledger', detail: 'every field with its sources; open questions only in ask mode' },
    { title: 'Build', detail: 'wt worktree, scaffold, source + encode media, write index.md' },
    {
      title: 'Verify',
      detail: 'build/render gate, fact-check, conventions, 3-lens accuracy panel, fix loop',
    },
    { title: 'Land', detail: 'commit, then wt merge into the originating branch' },
  ],
};

// args:
//   source:       string (required) — local path or URL of the project
//   originPath:   string (required) — root of the checkout the run started in
//   originBranch: string (required) — branch checked out there; the project merges into it
//   date:         string (required) — today, YYYY-MM-DD (scripts can't read the clock)
//   ask:          boolean — "ask questions" mode: stop after the ledger with open questions
//   answers:      object  — { <question id>: "<the author's exact words>" }, on the resumed run
//   publish:      boolean — write draft: false (default: draft: true, publishing is Parker's call)
//   trailer:      string  — last paragraph of the commit message (session attribution)
const A = args || {};
const missing = ['source', 'originPath', 'originBranch', 'date'].filter((k) => !A[k]);
if (missing.length)
  return {
    status: 'error',
    report: `**add-portfolio-project** did not run: missing args ${missing.join(', ')}.`,
  };

const ORIGIN = String(A.originPath).replace(/\\/g, '/').replace(/\/$/, '');
const BRANCH = A.originBranch;
const DATE = A.date;
const MONTHS =
  'January February March April May June July August September October November December'.split(
    ' ',
  );
const MONTH_YEAR = `${MONTHS[Number(DATE.slice(5, 7)) - 1]} ${DATE.slice(0, 4)}`;
const ASK = !!A.ask;
const ANSWERS = A.answers && Object.keys(A.answers).length ? A.answers : null;
const MAX_FIX_ROUNDS = 2;

// Fields graded for accuracy (also the enum every agent tags claims with).
const FIELDS = [
  'title',
  'summary',
  'date',
  'role',
  'group',
  'capabilities',
  'stack',
  'highlights',
  'body',
  'links',
  'media',
];
const FIELD_LABEL = {
  title: 'Title',
  summary: 'Summary',
  date: 'Date (year / period)',
  role: 'Role',
  group: 'Group',
  capabilities: 'Topics (capabilities)',
  stack: 'Stack',
  highlights: 'Highlights',
  body: 'Project body',
  links: 'Links',
  media: 'Media alt text & captions',
};
const LOCAL_ORIGINS = ['repo-file', 'repo-capture'];

const READ_ONLY =
  'The source is read-only: never modify, build, install, or run anything inside it, and run no state-changing git commands there. Never copy secrets, credentials, tokens, private hostnames, or personal data into your output.';
const FACT_RULES =
  'Every fact needs a source: a path with line numbers (relative to the source root), a git command plus what it printed, or a URL. Mark each one explicit (the source says it) or inferred (you deduced it; say from what). Prefer a few solid facts over many shaky ones. When the README claims something the code does not implement (or the reverse), report both.';
const GIT_SAFETY =
  'Never push. Never force, reset --hard, stash, clean, checkout -- <path>, or amend. Never pass --no-verify.';

// ---------- schemas ----------
const str = { type: 'string' };
const strArr = { type: 'array', items: str };
const obj = (properties, required = Object.keys(properties)) => ({
  type: 'object',
  properties,
  required,
});
const FACTS = obj({
  summary: { type: 'string', description: '<=80 words: what this lens found' },
  facts: {
    type: 'array',
    items: obj({
      topic: str,
      claim: str,
      source: str,
      basis: { type: 'string', enum: ['explicit', 'inferred'] },
    }),
  },
  gaps: { ...strArr, description: 'things this lens looked for and could not establish' },
});
const ACQUIRE = obj({
  ok: { type: 'boolean' },
  error: { type: 'string', description: 'empty string when ok' },
  kind: { type: 'string', enum: ['local', 'remote', 'web'] },
  repoDir: { type: 'string', description: 'absolute path agents read from, forward slashes' },
  subdir: { type: 'string', description: 'project subfolder inside repoDir, or empty string' },
  citeAs: { type: 'string' },
  remoteUrl: str,
  visibility: { type: 'string', enum: ['public', 'private', 'none', 'unknown'] },
  headSha: str,
  name: str,
  slug: str,
  firstCommit: str,
  lastCommit: str,
  commitCount: { type: 'integer' },
  authors: { type: 'array', items: obj({ name: str, commits: { type: 'integer' } }) },
  parkerShare: { type: 'string', enum: ['sole', 'primary', 'contributor', 'none', 'unknown'] },
  tree: { type: 'string', description: 'top two levels of the layout' },
  manifests: strArr,
  languages: str,
  duplicates: {
    type: 'array',
    items: obj({
      slug: str,
      why: str,
      sameRepo: { type: 'boolean', description: 'its links/Sources point at this exact repo' },
    }),
  },
});
const ORIGIN_ENUM = {
  type: 'string',
  enum: ['repo-file', 'repo-capture', 'web-download', 'web-embed'],
};
const MEDIA_INV = obj({
  summary: str,
  assets: {
    type: 'array',
    items: obj({
      location: { type: 'string', description: 'source-relative path or URL' },
      origin: { type: 'string', enum: ['repo-file', 'web'] },
      type: {
        type: 'string',
        enum: ['image', 'gif', 'video', 'youtube', 'design-source', 'other'],
      },
      dimensions: { type: 'string', description: 'WxH if known, else empty string' },
      shows: { type: 'string', description: 'what it actually shows (you looked at it)' },
      quality: { type: 'string', enum: ['good', 'usable', 'poor'] },
      rights: {
        type: 'string',
        description: 'owner-made / owner-published / third-party / unclear',
      },
      coverCandidate: { type: 'boolean' },
    }),
  },
  captureIdeas: {
    type: 'array',
    items: obj({
      what: str,
      how: str,
      safe: { type: 'boolean', description: 'meets the capture safety rules' },
    }),
  },
});
const CONTEXT = obj({
  ...FACTS.properties,
  suggestedGroup: { type: 'string', enum: ['security', 'software', 'design'] },
  suggestedCapabilities: strArr,
  related: { ...strArr, description: 'existing project slugs that relate to this one' },
  legacyPaths: {
    ...strArr,
    description: 'html/Work/<name>.html pages about THIS project on the legacy site',
  },
  sensitivity: obj({
    level: { type: 'string', enum: ['none', 'possible', 'high'] },
    reason: str,
  }),
});
const CRITIC = obj({
  missing: {
    type: 'array',
    items: obj({
      lens: { type: 'string', enum: ['purpose', 'build', 'history', 'media', 'web', 'context'] },
      question: str,
      hint: { type: 'string', description: 'where to look' },
    }),
  },
});
const FIELD_ENUM = { type: 'string', enum: FIELDS };
const LEDGER = obj({
  abort: { type: 'string', description: 'reason not to add this project, or empty string' },
  slug: str,
  title: str,
  summary: str,
  year: { type: 'integer' },
  period: { type: 'string', description: 'display string, or empty string' },
  role: { type: 'string', description: 'empty string when no source states it' },
  group: { type: 'string', enum: ['security', 'software', 'design'] },
  capabilities: strArr,
  stack: strArr,
  highlights: strArr,
  body: obj({ problem: str, approach: str, built: str, outcome: str }),
  links: obj({ repo: str, demo: str, video: str, private: strArr }),
  legacyPaths: strArr,
  sourcesHeader: { ...strArr, description: 'lines of the # Sources: comment, without the "# "' },
  fields: {
    type: 'array',
    items: obj({
      field: FIELD_ENUM,
      sources: strArr,
      basis: {
        type: 'string',
        enum: ['explicit', 'inferred', 'author-stated', 'default', 'omitted'],
      },
      note: str,
    }),
  },
  openQuestions: {
    type: 'array',
    items: obj({
      id: str,
      question: str,
      why: str,
      options: strArr,
      defaultIfUnanswered: str,
    }),
  },
  suggestions: {
    ...strArr,
    description: 'follow-ups for Parker (featured slot, seenIn chips, ...)',
  },
});
const WORKTREE = obj({
  ok: { type: 'boolean' },
  error: str,
  path: { type: 'string', description: 'absolute, forward slashes' },
  branch: str,
  port: { type: 'integer' },
});
const MEDIA_ITEM = obj({
  ref: { type: 'string', description: './<file> as referenced in frontmatter, or yt:<id>' },
  kind: { type: 'string', enum: ['image', 'video', 'youtube'] },
  alt: { type: 'string', description: 'alt text (image/video) or title (youtube)' },
  caption: { type: 'string', description: 'empty string for none' },
  wide: { type: 'boolean' },
  autoplay: { type: 'boolean' },
  origin: ORIGIN_ENUM,
  source: { type: 'string', description: 'source path or URL' },
});
const MEDIA_RESULT = obj({
  cover: obj({
    ref: str,
    alt: str,
    position: { type: 'string', description: 'CSS object-position, or empty string' },
    origin: ORIGIN_ENUM,
    source: str,
    fallback: { type: 'boolean', description: 'true if it is a last-resort cover' },
  }),
  items: { type: 'array', items: MEDIA_ITEM },
  sourcesLines: { ...strArr, description: 'media: <file> ← <source> (<terms>, fetched <date>)' },
  rejected: { type: 'array', items: obj({ location: str, reason: str }) },
  checkMedia: { type: 'boolean', description: 'npm run check:media passed' },
  notes: str,
});
const WRITE = obj({ ok: { type: 'boolean' }, notes: str });
const GATE = obj({
  lint: obj({ pass: { type: 'boolean' }, failures: str }),
  build: obj({ pass: { type: 'boolean' }, failures: str }),
  issues: {
    type: 'array',
    items: obj({
      severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
      area: { type: 'string', enum: ['render', 'media', 'links', 'schema', 'other'] },
      what: str,
      fix: str,
    }),
  },
  final: obj({
    title: str,
    summary: str,
    year: { type: 'integer' },
    period: str,
    role: str,
    group: str,
    capabilities: strArr,
    stack: strArr,
    highlights: strArr,
    links: str,
    draft: { type: 'boolean' },
    cover: str,
    media: { ...strArr, description: 'refs: ./<file> or yt:<id>' },
    abstract: {
      type: 'string',
      description: '2-3 sentences condensing the final body, adding nothing',
    },
  }),
});
const FACTCHECK = obj({
  claims: {
    type: 'array',
    items: obj({
      field: FIELD_ENUM,
      claim: str,
      verdict: {
        type: 'string',
        enum: ['SUPPORTED', 'FAITHFUL', 'OVERSTATED', 'UNSUPPORTED', 'AUTHOR-STATED'],
      },
      evidence: str,
      fix: str,
    }),
  },
});
const CONVENTIONS = obj({
  violations: { type: 'array', items: obj({ rule: str, file: str, detail: str, fix: str }) },
});
const PANEL = obj({
  fields: {
    type: 'array',
    items: obj({
      field: FIELD_ENUM,
      score: { type: 'integer', minimum: 0, maximum: 100 },
      refuted: { type: 'boolean' },
      problem: { type: 'string', description: 'empty string if none' },
      fix: { type: 'string', description: 'concrete edit, or empty string' },
    }),
  },
});
const FIX = obj({ changes: strArr, unresolved: strArr });
const LAND = obj({
  committed: { type: 'boolean' },
  merged: { type: 'boolean' },
  sha: { type: 'string', description: 'short sha of the project commit on the origin branch' },
  error: str,
});

// ---------- helpers ----------
const json = (x) => JSON.stringify(x, null, 1);
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};
const cell = (s, n = 90) => {
  const t = String(s == null ? '' : s)
    .replace(/\|/g, '\\|')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
const normRef = (r) => String(r || '').replace(/^\.\//, '');

function failReport(title, detail, extra = {}) {
  return { status: 'error', report: `## Add to portfolio: ${title}\n\n${detail}`, ...extra };
}

// ---------- Acquire ----------
phase('Acquire');
const acq = await agent(
  `You prepare a source so other agents can study it. Source: "${A.source}". Portfolio repo (where it will be added): ${ORIGIN}. Today: ${DATE}.

1. Resolve the source.
   - Local path: make it absolute (forward slashes). If it sits inside a git repo, repoDir is the repo root and subdir the path inside it (empty if it is the root). Do not modify it.
   - URL of a git repo (GitHub, GitLab, other host): clone it into ${ORIGIN}/.cache/add-project/<repo-name>/ with full history (no --depth), or reuse that directory and \`git fetch\` if it already holds the same remote. For github.com use \`GH_TOKEN=$(gh auth token --user pjackim) gh repo clone <owner>/<repo> <dir>\` so Parker's private repos work; otherwise \`git clone\`.
   - URL that is not a repo (a site, video, paper): kind=web, repoDir empty; record what it is.
2. citeAs: for a local repo, its path relative to ${ORIGIN} (e.g. ../ArcExploit, plus /<subdir>); for a clone, "<url> @ <short sha>"; for web, the URL.
3. Visibility: unauthenticated \`curl -s -o /dev/null -w '%{http_code}' <https url of the repo page>\` — 200 → public, 404 → private. A local repo: check its origin remote the same way; no remote → none.
4. Git facts (\`git -C <repoDir> ...\`, scoped to subdir when set): HEAD sha, first and last commit dates (ISO), commit count, authors with commit counts (\`git shortlog -sn HEAD\`). Parker's identities: m0rt, pjackim, j4ck1m, "Parker Jackim", plus whatever \`git -C ${ORIGIN} config user.name\` and \`user.email\` print. parkerShare: sole | primary (>50% of commits) | contributor | none | unknown.
5. Layout: the top two levels (skip .git, node_modules, build output), manifest files (package.json, pyproject.toml, Cargo.toml, *.csproj, *.sln, go.mod, CMakeLists.txt, *.uproject, ...), the rough language mix.
6. Duplicates: search ${ORIGIN}/src/content/projects/*/index.md (frontmatter, links and # Sources headers) for this repo's URL, folder name, or project name; list any existing project that may be the same work, with sameRepo=true only when it points at this exact repo.
7. slug: kebab-case (a-z, 0-9, single hyphens, <= 30 chars) from the project name, not already a folder in ${ORIGIN}/src/content/projects/.
Write nothing outside the clone directory. On failure set ok=false with the error.`,
  { label: 'acquire', phase: 'Acquire', schema: ACQUIRE, effort: 'low' },
);
if (!acq || !acq.ok)
  return failReport(A.source, `Could not acquire the source: ${acq ? acq.error : 'agent died'}.`);
const dupe = acq.duplicates.find((d) => d.sameRepo);
if (dupe)
  return {
    status: 'aborted',
    report: `## Add to portfolio: ${acq.name}\n\n**Not added.** This repo is already in the portfolio as \`${dupe.slug}\` (${dupe.why}). Update it with the portfolio-manager agent instead.`,
  };
log(
  `${acq.name}: ${acq.kind}, ${acq.visibility}, ${acq.commitCount} commits (${acq.firstCommit} → ${acq.lastCommit}), Parker: ${acq.parkerShare}`,
);

const SRC = `Source: ${acq.kind === 'web' ? A.source : acq.repoDir}${acq.subdir ? ` (the project is the subfolder ${acq.subdir})` : ''} — "${acq.name}", cited as "${acq.citeAs}". Remote: ${acq.remoteUrl || 'none'} (${acq.visibility}). Git: ${acq.commitCount} commits, ${acq.firstCommit} → ${acq.lastCommit}; authors ${acq.authors.map((a) => `${a.name} (${a.commits})`).join(', ') || 'n/a'}; Parker's share: ${acq.parkerShare}. Manifests: ${acq.manifests.join(', ') || 'none'}. Languages: ${acq.languages}.
Layout:
${acq.tree}`;

// ---------- Explore ----------
const LENSES = {
  purpose: `Lens: PURPOSE. Read the README, docs/, wiki or notes folders, CHANGELOG, manifest descriptions, and top-of-file comments of the entry points. Establish: what the project is (one sentence), the problem it solves and for whom, its features, how it is used, and any outcomes the source itself states (releases, users, grades, results). Quote the exact wording of important claims.`,
  build: `Lens: BUILD. Read the manifests and the code. Establish: the main languages, frameworks, and key libraries (the ones the project is built around, not incidental deps), the architecture and its main components, the notable techniques (what is technically hard or clever here, with the file that shows it), what is actually implemented versus only planned or stubbed, and tests/CI/packaging.`,
  history: `Lens: HISTORY. Use git: \`git log --format='%ad %an %s' --date=short\`, tags and releases, activity by month, and merge/PR messages. Establish: when the work happened (active date range; the year most of it was done), how many commits and by whom, whether Parker worked alone or with others (his identities: m0rt, pjackim, j4ck1m, "Parker Jackim", and \`git -C ${ORIGIN} config user.name\`/\`user.email\`), the context if stated (course, hackathon, employer, personal), and the milestones.`,
  media: `Lens: MEDIA. Inventory every visual that could show this project: image/gif/video files in the repo (screenshots, docs images, logos, icons, diagrams), images the README embeds (local or hosted), design-source files (.ai, .psd, .fig, .blend, .eps), demo or YouTube links, GitHub release assets, the repo's social preview. LOOK at each image with the Read tool before you describe it (dimensions via \`file\` or sharp in ${ORIGIN}/node_modules). Judge quality honestly and mark cover candidates (would work as a 16:10 card image at >= 1200 px). Also list captureIdeas: real artifacts that could be screenshotted safely (a static site, a web app's UI, a rendered diagram). A capture is safe only if it needs no admin rights, drivers, packet capture, process injection, game or anti-cheat interaction, credentials, paid APIs, or network access beyond localhost, and Parker is an author.`,
  web: `Lens: WEB. Look outside the source for owner-published context: the repo host's metadata (for GitHub: \`GH_TOKEN=$(gh auth token --user pjackim) gh api repos/<owner>/<repo>\` for description, topics, homepage, created/pushed dates; \`gh release list\`), the homepage/demo if any (is it live?), and with WebSearch any page, video, talk, or write-up by Parker or the project itself. Only owner-controlled or official sources count; ignore reposts, wikis, and unrelated projects with similar names. If the source has no remote and no public presence, say so and stop early.`,
  context: `Lens: PORTFOLIO CONTEXT. Read ${ORIGIN}/src/data/taxonomy.ts (CAPABILITIES, GROUPS, CAPABILITY_GROUPS), ${ORIGIN}/src/data/site.ts, and the frontmatter of every project in ${ORIGIN}/src/content/projects/. Check the legacy site (\`git -C ${ORIGIN} show d8782d1:index.html\`, \`git -C ${ORIGIN} ls-tree -r --name-only d8782d1 html/Work\`) and the résumé (${ORIGIN}/public/files/Resume_General.pdf, Read it) for any mention of this project; if a legacy html/Work/<name>.html page covers it, return that path in legacyPaths. Suggest the group and 1-4 capability ids the evidence supports, related existing projects, and sensitivity: "high" if the source looks like employer, client, classified, or NDA work, or holds non-public information about real people or organisations; "possible" if unclear.`,
};
const lensPrompt = (lens, extra = '') =>
  `You study one project for Parker Jackim's portfolio. ${SRC}

${LENSES[lens]}
${extra}
${READ_ONLY} ${FACT_RULES}`;
const lensSchema = (lens) => (lens === 'media' ? MEDIA_INV : lens === 'context' ? CONTEXT : FACTS);

phase('Explore');
const found = {};
const lensNames = Object.keys(LENSES);
const first = await parallel(
  lensNames.map(
    (l) => () =>
      agent(lensPrompt(l), { label: `explore:${l}`, phase: 'Explore', schema: lensSchema(l) }),
  ),
);
lensNames.forEach((l, i) => {
  found[l] = first[i] ? [first[i]] : [];
  if (!first[i]) log(`explore:${l} died; continuing without it`);
});

// Completeness critic, up to two follow-up rounds (loop-until-dry).
const MAX_FOLLOWUPS = 6;
for (let round = 1; round <= 2; round++) {
  const critic = await agent(
    `You are the completeness critic for a portfolio entry about "${acq.name}". ${SRC}

Findings so far, by lens:
${json(found)}

A portfolio entry needs: what it is, why it matters, when it was done, Parker's role, the main stack, 3-5 concrete highlights backed by code, the outcome, a real cover image, and media that shows it working. Which of these are still missing, contradicted, or resting only on inference that one targeted look could settle? Return at most ${MAX_FOLLOWUPS} questions, each assigned to the lens best placed to answer it, with a hint of where to look. Return an empty list if the findings are sufficient. Read-only; you may spot-check the source to judge.`,
    { label: `critic:${round}`, phase: 'Explore', schema: CRITIC },
  );
  const asks = critic ? critic.missing : [];
  if (!asks.length) break;
  if (asks.length > MAX_FOLLOWUPS)
    log(`critic asked ${asks.length} questions; following up the first ${MAX_FOLLOWUPS}`);
  log(`critic round ${round}: ${asks.length} follow-up(s)`);
  const more = await parallel(
    asks.slice(0, MAX_FOLLOWUPS).map(
      (q, i) => () =>
        agent(
          lensPrompt(
            q.lens,
            `\nThis is a targeted follow-up. Answer only this: ${q.question}\nWhere to look: ${q.hint}`,
          ),
          {
            label: `followup:${round}.${i + 1}:${q.lens}`,
            phase: 'Explore',
            schema: lensSchema(q.lens),
          },
        ).then((r) => (r ? { lens: q.lens, r } : null)),
    ),
  );
  more.filter(Boolean).forEach(({ lens, r }) => found[lens].push(r));
}

const assets = found.media.flatMap((m) => m.assets);
const captureIdeas = found.media.flatMap((m) => m.captureIdeas);
const ctx = found.context[0] || null;
log(
  `explored: ${lensNames.map((l) => `${l} ${found[l].reduce((n, r) => n + (r.facts ? r.facts.length : r.assets.length), 0)}`).join(', ')}`,
);

// ---------- Ledger ----------
phase('Ledger');
const answersBlock = ANSWERS
  ? `Parker answered these questions. Treat each answer as an author-stated fact: cite it as \`per the author (${MONTH_YEAR}): "<his exact words>"\` and claim no more than the words say.\n${json(ANSWERS)}`
  : ASK
    ? 'Ask mode: anything you cannot settle from the sources goes in openQuestions (id, question, why, 2-4 concrete options, and what you would do if unanswered). Still fill every field with your best sourced value.'
    : 'Autonomous mode: nobody can answer questions. Resolve every doubt conservatively: omit what no source states, choose the weaker wording, and return openQuestions as an empty list.';
const ledger = await agent(
  `You write the content ledger for adding "${acq.name}" to Parker Jackim's portfolio. ${SRC}

Findings from six lenses and their follow-ups:
${json(found)}

Read first: ${ORIGIN}/src/content.config.ts (the schema and its limits), ${ORIGIN}/src/data/taxonomy.ts, ${ORIGIN}/docs/identity/site-style.md (voice), and two finished entries for tone and body shape: ${ORIGIN}/src/content/projects/bodycam-external/index.md and ${ORIGIN}/src/content/projects/arcexploit/index.md. The fact-only rule in CLAUDE.md binds every word: nothing that the findings (or an author answer) do not support. Open the source to confirm anything you rely on that a lens marked inferred.

${answersBlock}

Decide each field:
- slug: "${acq.slug}" unless a clearer kebab-case name exists (never an existing folder).
- title: <= 60 chars, "Name — short descriptor" when the name alone doesn't say what it is.
- summary: 20-180 chars, the card text: what it is and what makes it notable, in concrete terms (no "powerful", "robust", "cutting-edge").
- year: the year most of the work happened. period: a display string from the git dates when they are meaningful ("January–February 2026", "2019–2021"), else empty.
- role: only when a source states it, or "Solo developer" when git shows Parker as the sole author; else empty.
- group, capabilities (1-4 ids from CAPABILITIES), stack (1-8 main technologies, named the way the project names them).
- highlights: 3-5 items <= 160 chars, each a concrete thing he built or did that a file or commit shows.
- body: Problem, Approach, What I built, Outcome & lessons, in Markdown, first person, short paragraphs and bullets like the examples. Use an empty string for a section with no source. Outcomes are only what happened (duration, commits, releases, stated results); never invent metrics or users.
- links: repo URL only when public (${acq.visibility}); a private repo goes in private: [repo]. demo/video only when owner-published and live. Empty strings otherwise.
- legacyPaths: ${ctx && ctx.legacyPaths.length ? json(ctx.legacyPaths) : 'none found'} (keep only pages about this exact project).
- sourcesHeader: the "# Sources:" lines in the style of the examples: every file (with line ranges where useful), the git log range and commit count, URLs, author statements. Media lines are added later.
- fields: one row per field in ${json(FIELDS)} with its sources and basis (explicit / inferred / author-stated / default / omitted).
- abort: set a reason (and nothing will be written) only if there is no evidence Parker built or contributed to this, it is the same work as an existing project, or it is employer/client/classified/NDA material (context lens sensitivity: ${ctx ? json(ctx.sensitivity) : 'unknown'}).${ASK && !ANSWERS ? ' In ask mode, turn a doubtful abort into an open question instead.' : ''}
- suggestions: follow-ups only Parker should decide (a featured slot and order, adding the slug to a CAPABILITY_GROUPS item's seenIn, missing media only he has).`,
  { label: 'ledger', phase: 'Ledger', schema: LEDGER, effort: 'high' },
);
if (!ledger) return failReport(acq.name, 'The ledger agent died; nothing was written.');
if (ledger.abort)
  return {
    status: 'aborted',
    report: `## Add to portfolio: ${acq.name}\n\n**Not added.** ${ledger.abort}\n\nNothing was written. Source: ${acq.citeAs}.`,
  };
if (ASK && !ANSWERS && ledger.openQuestions.length)
  return {
    status: 'needs_input',
    questions: ledger.openQuestions,
    report: `## Add to portfolio: ${ledger.title}\n\n${ledger.openQuestions.length} open question(s); resume this run with args.answers.`,
  };
const SLUG = ledger.slug;

// ---------- Build ----------
phase('Build');
const wt = await agent(
  `Create an isolated worktree for adding the project "${SLUG}" to the portfolio at ${ORIGIN}, using worktrunk (never raw git worktree).
1. \`wt -C "${ORIGIN}" switch --create add/${SLUG} --base ${BRANCH} --no-cd -y\`. If the branch add/${SLUG} already exists, use add/${SLUG}-2 (then -3, ...). The pre-start hook runs npm ci; let it finish.
2. Find the new worktree's absolute path (\`wt -C "${ORIGIN}" list\` or \`git -C "${ORIGIN}" worktree list\`); use forward slashes.
3. In it: \`npm run new -- ${SLUG}\` (scaffolds src/content/projects/${SLUG}/index.md).
4. port = 4400 + (cksum of the branch name mod 500): \`echo $((4400 + $(printf %s "<branch>" | cksum | cut -d' ' -f1) % 500))\`.
${GIT_SAFETY}`,
  { label: 'worktree', phase: 'Build', schema: WORKTREE, effort: 'low' },
);
if (!wt || !wt.ok)
  return failReport(
    ledger.title,
    `Could not create the worktree: ${wt ? wt.error : 'agent died'}.`,
  );
const WT = wt.path.replace(/\\/g, '/');
const DIR = `src/content/projects/${SLUG}`;
const IN_WT = `Work only in the worktree ${WT} (branch ${wt.branch}); paths below are relative to it. ${GIT_SAFETY}`;
log(`worktree ${wt.branch} at ${WT}`);

const entryBrief = `Project: "${ledger.title}" — ${ledger.summary}
Highlights: ${ledger.highlights.join(' / ')}
${SRC}`;
const media = await agent(
  `${IN_WT}
You source, prepare, and encode the cover and media for the new project ${SLUG} (${DIR}/, scaffolded). You are doing media-finder's job for a new project, in this worktree, without Chrome: read ${WT}/.claude/agents/media-finder.md and follow its section 3 (sourcing order, the Adobe .ai/.psd extraction steps, the accuracy/rights/recorded rules) and section 4 steps 1-3 (download to cache, crop, encode through the pipeline). Use ${WT}/.cache/add-project/${SLUG}/raw/ and .../prep/ as your cache folders.

${entryBrief}

What the explorers found (they looked at each asset):
${json(assets)}
Capture ideas:
${json(captureIdeas)}

Goal (CLAUDE.md, "picture first"): a real cover that shows the thing Parker built, plus up to 5 media items that show it working (UI screenshots, diagrams, short loops, owner-published videos). Quality beats count; include nothing low-res, off-subject, watermarked, or of unclear rights, and record why you rejected each candidate.
Preference order: (1) files in the source repo; (2) media the owner published online (README images hosted elsewhere, release assets, the project's site, the owner's YouTube via \`npm run media -- --youtube <id> --project ${SLUG}\`); (3) a screenshot you take of the real artifact, only when it is safe: copy what you need into the cache (never run or build inside the source), serve it on localhost, and screenshot it with Playwright from ${WT}/node_modules (launch pattern: ${WT}/.claude/skills/audit-portfolio/scripts/capture.ts). Never run anything that needs admin rights, drivers, packet capture, process injection, game or anti-cheat interaction, credentials, paid APIs, or network beyond localhost, and never run code Parker didn't author. (4) Only when nothing above gives a cover: a clean screenshot of the project's own README or key source view (fallback=true).
Covers: 16:10, >= 1200 px wide (ideally 2400), never upscaled, subject centred or placed with a position. UI screenshots and line art encode with --lossless. Filenames: descriptive kebab-case (control-panel-players-tab.png), cover.<ext> for the cover. Encode only with \`npm run media -- <prepared files> --project ${SLUG}\`, then run \`npm run check:media\`.
Do not edit index.md; return the cover and each item (alt text describing what the image shows, captions that make no new claims), with origin: repo-file (a file from the repo), repo-capture (your screenshot of the real project), web-download, web-embed (YouTube). sourcesLines: one per asset, \`media: <file> ← <source path or URL> (<terms>, fetched ${DATE})\`.`,
  { label: 'media', phase: 'Build', schema: MEDIA_RESULT, effort: 'high' },
);
if (!media)
  return failReport(ledger.title, `The media agent died; the worktree ${WT} is left as is.`);
log(
  `media: cover from ${media.cover.origin}${media.cover.fallback ? ' (fallback)' : ''}, ${media.items.length} item(s), ${media.rejected.length} rejected`,
);

const write = await agent(
  `${IN_WT}
Replace ${DIR}/index.md (the scaffold) with the finished entry. Model the layout on ${WT}/src/content/projects/arcexploit/index.md.
Frontmatter, in this order: a "# Sources:" comment block (the ledger's sourcesHeader lines, then the media sourcesLines, wrapped under ~100 chars with "# " prefixes), title, summary, year, period (omit if empty), role (omit if empty), group, capabilities, stack, cover (${media.cover.ref}), coverAlt, coverPosition (omit if empty), featured: false, order: 100, showOnHome: false, draft: ${A.publish ? 'false' : 'true'}, highlights, media (images: kind/src/alt/caption/wide; videos: kind/src/alt/caption/autoplay; youtube: kind/id/title/caption — omit empty captions), links (repo/demo/video only when non-empty; private list when non-empty; \`links: {}\` if nothing), legacyPaths.
Body: "## Problem", "## Approach", "## What I built", "## Outcome & lessons" with the ledger's text, skipping any empty section.
Ledger: ${json({ ...ledger, fields: undefined, openQuestions: undefined, suggestions: undefined })}
Media: ${json(media)}
Use the values verbatim; don't add claims. Then \`npx prettier --write ${DIR}/index.md\`.`,
  { label: 'write', phase: 'Build', schema: WRITE },
);
if (!write || !write.ok)
  return failReport(
    ledger.title,
    `Writing index.md failed: ${write ? write.notes : 'agent died'}. Worktree: ${WT}.`,
  );

// ---------- Verify (+ fix loop) ----------
const panelLens = {
  grounding:
    'GROUNDING. Is each value actually supported by the source? Open the cited files and git history yourself; a citation that does not say it is a refutation.',
  inflation:
    'INFLATION. Is anything stronger, bigger, more finished, more original, or more impressive than the evidence shows? Would Parker be caught out if an interviewer asked about it? When a claim leans on inference, refute it.',
  representation:
    'REPRESENTATION. Does the entry show what the project really is: the right title, group, capabilities, main stack (not incidental dependencies), date range, and role? Does it miss the most important thing the project does? Do the cover and media show this project, and does each alt text match its image (Read the image files)?',
};
const RUBRIC =
  'Score 0-100 for how confident you are the final value is ACCURATE: 90-100 stated directly in the source; 70-89 a faithful synthesis of explicit facts; 50-69 a reasonable inference; below 50 weak, overstated, or contradicted. For a field left empty on purpose (e.g. no role), score whether leaving it empty is right. refuted=true when the value is wrong or unsupported as written.';

let round = 0;
let gate = null;
let fc = null;
let conv = null;
let panel = [];
const fixLog = [];
for (;;) {
  round++;
  phase('Verify');
  const [g, f, c, ...p] = await parallel([
    () =>
      agent(
        `${IN_WT}
Gate the new project ${SLUG}, then look at it rendered.
1. \`npm run lint\` and \`npm run build:only\`; report only failures (empty strings when they pass).
2. Link health (per ${WT}/.claude/agents/media-manager.md section 3): every links.* URL and YouTube id in ${DIR}/index.md.
3. Media hygiene (media-manager section 4): descriptive filenames, every referenced file exists, no orphaned files in ${DIR}/.
4. Render: start \`npx astro dev --port ${wt.port}\` in the background (drafts only render in dev), wait until it answers, then \`node .claude/skills/audit-portfolio/scripts/capture.ts --base http://localhost:${wt.port}/Portfolio/ --pages "work/,work/${SLUG}/" --widths 390,1280 --out .cache/captures/add-${SLUG}-r${round}\`. Read manifest.json (overflow, console errors, images without alt) and LOOK at the PNGs: the card on work/ and the project at both widths, light and dark. Is the cover sharp, is its subject visible in the 16:10 crop, does every media item render, do alt text and captions match the images? Stop the dev server when done.
5. final: read back ${DIR}/index.md as it now stands (media as refs ./<file> or yt:<id>; links as a short string) and write a 2-3 sentence abstract condensing the body, adding nothing.
Issue severities: blocker (broken build, missing or wrong image, dead link), major (bad crop, blurry cover, mismatched alt), minor.`,
        { label: `gate:r${round}`, phase: 'Verify', schema: GATE },
      ),
    () =>
      agent(
        `Audit ${WT}/${DIR}/index.md — the whole file: frontmatter, body, alt text and captions (for what they claim about the project). The project's own repository is on disk at ${acq.repoDir}${acq.subdir ? `/${acq.subdir}` : ''} (the file cites it as ${acq.citeAs}); media files are in ${WT}/${DIR}/. Return one entry per claim, tagged with the field it belongs to: ${FIELDS.join(', ')} (year and period are "date"; alt text and captions are "media").`,
        {
          label: `fact-check:r${round}`,
          phase: 'Verify',
          schema: FACTCHECK,
          agentType: 'fact-checker',
        },
      ),
    () =>
      agent(
        `Review the uncommitted changes in the worktree ${WT}: \`git -C "${WT}" status --porcelain -uall\` and \`git -C "${WT}" diff HEAD\`, and read the untracked files (the new ${DIR}/ folder). Report every rule violation with a concrete fix.`,
        {
          label: `conventions:r${round}`,
          phase: 'Verify',
          schema: CONVENTIONS,
          agentType: 'convention-guard',
        },
      ),
    ...Object.entries(panelLens).map(
      ([lens, focus]) =>
        () =>
          agent(
            `You are a skeptical reviewer of a new portfolio entry, ${WT}/${DIR}/index.md, about the project at ${acq.repoDir}${acq.subdir ? `/${acq.subdir}` : ''} (cited as ${acq.citeAs}). Lens: ${focus}
Read the entry, then check it against the source yourself. Grade every field: ${FIELDS.map((x) => `${x} (${FIELD_LABEL[x]})`).join(', ')}. ${RUBRIC} For each problem give a concrete fix (usually cutting or weakening words; never adding unsourced facts). Read-only.`,
            { label: `panel:${lens}:r${round}`, phase: 'Verify', schema: PANEL, effort: 'high' },
          ),
    ),
  ]);
  gate = g;
  fc = f;
  conv = c;
  panel = p.filter(Boolean);

  const problems = [];
  if (!gate) problems.push('gate agent died; re-run lint, build, and render checks');
  else {
    if (!gate.lint.pass) problems.push(`lint: ${gate.lint.failures}`);
    if (!gate.build.pass) problems.push(`build: ${gate.build.failures}`);
    gate.issues
      .filter((i) => i.severity !== 'minor')
      .forEach((i) => problems.push(`${i.area} (${i.severity}): ${i.what} → ${i.fix}`));
  }
  if (fc)
    fc.claims
      .filter((x) => x.verdict === 'OVERSTATED' || x.verdict === 'UNSUPPORTED')
      .forEach((x) =>
        problems.push(`fact-check ${x.verdict} [${x.field}] "${x.claim}" → ${x.fix}`),
      );
  if (conv)
    conv.violations.forEach((v) =>
      problems.push(`convention ${v.rule} (${v.file}): ${v.detail} → ${v.fix}`),
    );
  FIELDS.forEach((field) => {
    const rows = panel.map((r) => r.fields.find((x) => x.field === field)).filter(Boolean);
    const refuted = rows.filter((r) => r.refuted);
    const med = median(rows.map((r) => r.score));
    if (refuted.length >= 2 || (med !== null && med < 60))
      rows
        .filter((r) => r.problem)
        .forEach((r) => problems.push(`panel [${field}] ${r.problem} → ${r.fix}`));
  });

  log(`verify round ${round}: ${problems.length} problem(s)`);
  if (!problems.length) break;
  if (round > MAX_FIX_ROUNDS) {
    log(`stopping after ${MAX_FIX_ROUNDS} fix rounds with ${problems.length} problem(s) open`);
    break;
  }
  const fix = await agent(
    `${IN_WT}
Fix these problems in the new project ${SLUG} (${DIR}/):
${problems.map((x) => `- ${x}`).join('\n')}

Rules: when a claim can't be supported, cut or weaken it — never add unsourced facts, and keep the # Sources: header in step with what the entry now claims. Keep the schema limits (${WT}/src/content.config.ts). Media problems: fix the crop with coverPosition or re-prepare from ${WT}/.cache/add-project/${SLUG}/ and re-encode with \`npm run media\`; drop an item rather than keep a bad one, and remove the dropped files and their Sources lines. Then \`npx prettier --write ${DIR}/index.md\` and \`npm run lint\`. Report what you changed and anything you could not fix.`,
    { label: `fix:r${round}`, phase: 'Verify', schema: FIX },
  );
  if (fix) fixLog.push(...fix.changes);
}

// ---------- confidence ----------
const CAP = { UNSUPPORTED: 40, OVERSTATED: 60 };
const confidence = FIELDS.map((field) => {
  const rows = panel.map((r) => r.fields.find((x) => x.field === field)).filter(Boolean);
  let score = median(rows.map((r) => r.score));
  const claims = fc ? fc.claims.filter((x) => x.field === field) : [];
  const verdicts = {};
  claims.forEach((x) => (verdicts[x.verdict] = (verdicts[x.verdict] || 0) + 1));
  Object.keys(CAP).forEach((v) => {
    if (verdicts[v] && score !== null) score = Math.min(score, CAP[v]);
  });
  const led = ledger.fields.find((x) => x.field === field);
  return {
    field,
    score,
    basis: led ? led.basis : '',
    factCheck: Object.entries(verdicts)
      .map(([v, n]) => `${n} ${v.toLowerCase()}`)
      .join(', '),
    refutedBy: rows.filter((r) => r.refuted).length,
    note: rows.filter((r) => r.problem).map((r) => r.problem)[0] || (led ? led.note : ''),
  };
});
const scored = confidence.filter((c) => c.score !== null);
const overall = scored.length
  ? Math.round(scored.reduce((n, c) => n + c.score, 0) / scored.length)
  : null;

// ---------- Land ----------
phase('Land');
const gatePassed = gate && gate.lint.pass && gate.build.pass;
let land = null;
if (gatePassed) {
  const subject = `content(${SLUG}): add ${ledger.title}`.slice(0, 72);
  const msg = [
    subject,
    `Added autonomously from ${acq.citeAs} by the add-portfolio-project workflow.`,
    A.trailer,
  ]
    .filter(Boolean)
    .join('\n\n');
  land = await agent(
    `${IN_WT}
Land the new project.
1. \`git -C "${WT}" add -A -- ${DIR}\`. Check \`git -C "${WT}" status --porcelain\`: anything else changed is left out of the commit (list it in error).
2. Write this message byte for byte to a temp file outside the repo (mktemp) and \`git -C "${WT}" commit -F <file> -- ${DIR}\`:
<<<MSG
${msg}
MSG>>>
3. \`wt -C "${WT}" merge ${BRANCH} --no-squash -y\` — rebases onto ${BRANCH}, fast-forwards it, removes the worktree. If it fails (conflict, a dirty target worktree, a hook), do not force, stash, reset, or discard anything: record the error and leave the worktree and branch in place.
4. Confirm: \`git -C "${ORIGIN}" log -1 --format='%h %s' ${BRANCH}\` shows the commit, and ${ORIGIN}/${DIR}/index.md exists if ${BRANCH} is checked out at ${ORIGIN}.`,
    { label: 'land', phase: 'Land', schema: LAND, effort: 'low' },
  );
} else log('gate did not pass; not merging');

// ---------- report ----------
const F = (gate && gate.final) || {
  title: ledger.title,
  summary: ledger.summary,
  year: ledger.year,
  period: ledger.period,
  role: ledger.role,
  group: ledger.group,
  capabilities: ledger.capabilities,
  stack: ledger.stack,
  highlights: ledger.highlights,
  links: '',
  draft: !A.publish,
  cover: media.cover.ref,
  media: media.items.map((m) => m.ref),
  abstract: '',
};
const byRef = new Map(
  [{ ...media.cover, kind: 'cover' }, ...media.items].map((m) => [normRef(m.ref), m]),
);
const included = [F.cover, ...F.media].map((r) => {
  const m = byRef.get(normRef(r));
  return {
    ref: normRef(r),
    kind: r === F.cover ? 'cover' : m ? m.kind : '?',
    origin: m ? m.origin : 'unknown',
    source: m ? m.source : '',
  };
});
const nLocal = included.filter((m) => LOCAL_ORIGINS.includes(m.origin)).length;
const nExternal = included.filter(
  (m) => m.origin === 'web-download' || m.origin === 'web-embed',
).length;
const nUnknown = included.length - nLocal - nExternal;
const merged = land && land.merged;
const level = (s) =>
  s === null ? '—' : s >= 85 ? `**${s}** high` : s >= 65 ? `**${s}** medium` : `**${s}** low`;
const openProblems = [];
if (gate && !gatePassed)
  openProblems.push(
    `Gate failed: ${[gate.lint.failures, gate.build.failures].filter(Boolean).join(' / ')}`,
  );
if (gate) gate.issues.forEach((i) => openProblems.push(`${i.severity} ${i.area}: ${i.what}`));
if (fc)
  fc.claims
    .filter((x) => x.verdict === 'OVERSTATED' || x.verdict === 'UNSUPPORTED')
    .forEach((x) => openProblems.push(`${x.verdict} [${x.field}]: "${cell(x.claim, 120)}"`));
if (conv) conv.violations.forEach((v) => openProblems.push(`convention ${v.rule}: ${v.detail}`));

const lines = [
  `## Added to portfolio: ${F.title}`,
  '',
  merged
    ? `**Merged** into \`${BRANCH}\` as \`${land.sha}\` — \`${DIR}/\`, page \`work/${SLUG}/\`, ${F.draft ? '`draft: true` (hidden in production until you publish it)' : 'published (`draft: false`)'}.`
    : `**Not merged.** ${land ? land.error : gatePassed ? 'The land step died.' : 'Lint/build did not pass.'} The work is on branch \`${wt.branch}\` at \`${WT}\`.`,
  '',
  '| | |',
  '|---|---|',
  `| **Project** | ${cell(F.title, 200)} (\`${SLUG}\`) |`,
  `| **Source** | ${cell(acq.citeAs, 200)} (${acq.visibility}; ${acq.commitCount} commits, Parker: ${acq.parkerShare}) |`,
  `| **Date** | ${cell(F.period || String(F.year), 80)}${acq.firstCommit ? ` (commits ${acq.firstCommit.slice(0, 10)} → ${acq.lastCommit.slice(0, 10)})` : ''} |`,
  `| **Role** | ${cell(F.role || '— (not stated in the source; omitted)', 120)} |`,
  `| **Group** | ${F.group} |`,
  `| **Topics** | ${F.capabilities.join(', ')} |`,
  `| **Stack** | ${F.stack.join(', ')} |`,
  '',
  `**Summary:** ${F.summary}`,
  '',
  F.abstract ? `**Abstract:** ${F.abstract}` : '',
  '',
  F.highlights.length ? `**Highlights:**\n${F.highlights.map((h) => `- ${h}`).join('\n')}` : '',
  '',
  `### Media: ${included.length} included — ${nLocal} local, ${nExternal} external/online${nUnknown ? `, ${nUnknown} of unknown origin` : ''}`,
  '',
  '| File | Kind | Origin | Source |',
  '|---|---|---|---|',
  ...included.map((m) => `| ${m.ref} | ${m.kind} | ${m.origin} | ${cell(m.source, 80)} |`),
  '',
  media.cover.fallback
    ? '_The cover is a last-resort fallback; a real screenshot or artwork would be better._\n'
    : '',
  media.rejected.length
    ? `Rejected ${media.rejected.length} candidate(s): ${media.rejected.map((r) => `${cell(r.location, 50)} (${cell(r.reason, 60)})`).join('; ')}.`
    : '',
  '',
  `### Confidence in the accuracy of what was written`,
  '',
  `Median of three independent reviewers (grounding, inflation, representation), capped by the fact-check (unsupported → 40, overstated → 60). Overall: ${level(overall)}.`,
  '',
  '| Field | Final value | Confidence | Basis | Fact-check | Refuted by | Note |',
  '|---|---|---|---|---|---|---|',
  ...confidence.map((c) => {
    const val = {
      title: F.title,
      summary: F.summary,
      date: F.period || F.year,
      role: F.role || '(omitted)',
      group: F.group,
      capabilities: F.capabilities.join(', '),
      stack: F.stack.join(', '),
      highlights: `${F.highlights.length} items`,
      body: 'Problem / Approach / Built / Outcome',
      links: F.links,
      media: `${included.length} assets`,
    }[c.field];
    return `| ${FIELD_LABEL[c.field]} | ${cell(val, 60)} | ${level(c.score)} | ${c.basis || '—'} | ${c.factCheck || '—'} | ${c.refutedBy}/${panel.length} | ${cell(c.note, 90)} |`;
  }),
  '',
  `Verification: ${round} round(s), ${fixLog.length} fix(es) applied.`,
  openProblems.length
    ? `\n**Still open:**\n${openProblems.map((x) => `- ${cell(x, 200)}`).join('\n')}`
    : '',
  ledger.suggestions.length || F.draft
    ? `\n**Next steps for you:**\n${[...(F.draft ? [`Review \`work/${SLUG}/\` in \`npm run dev\`, then set \`draft: false\` to publish.`] : []), ...ledger.suggestions].map((x) => `- ${x}`).join('\n')}`
    : '',
];
const report = lines
  .filter((l, i, a) => !(l === '' && a[i - 1] === ''))
  .join('\n')
  .trim();

return {
  status: merged ? 'merged' : 'not-merged',
  report,
  slug: SLUG,
  branch: wt.branch,
  worktree: merged ? null : WT,
  sha: merged ? land.sha : null,
  media: { included, local: nLocal, external: nExternal, rejected: media.rejected },
  confidence,
  overall,
};
