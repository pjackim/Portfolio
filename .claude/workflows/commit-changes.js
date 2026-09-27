export const meta = {
  name: 'commit-changes',
  description:
    'Summarize the repo, inventory uncommitted/untracked/stashed changes, then fan out disjoint review lanes that split them into logical commits and commit them one at a time',
  whenToUse:
    'When the working tree has piled up unrelated changes that should land as several well-scoped commits',
  phases: [
    { title: 'Survey', detail: 'repo summary + commit style, git status/stash inventory' },
    { title: 'Plan', detail: 'partition changed files into disjoint review lanes' },
    { title: 'Review', detail: 'one agent per lane: split into commits, write messages' },
    { title: 'Commit', detail: 'one lane at a time (git index is shared), hooks honoured' },
    { title: 'Converge', detail: 'final git status/log check' },
  ],
};

// args (all optional):
//   trailer: string  — appended as the last paragraph of every commit message
//   repoPath: string — repo root; defaults to the session's working directory
const TRAILER = (args && args.trailer) || '';
const REPO = (args && args.repoPath) || '';
const WHERE = REPO
  ? `Repo root: ${REPO} (run git with \`git -C "${REPO}" ...\`).`
  : 'Repo root: the current working directory.';
const GIT_RULES =
  'Never push, never amend or rewrite existing commits, never pass --no-verify, never run `git stash pop/apply/drop`, `git reset --hard`, `git checkout -- <path>` or `git clean`, and never edit working-tree files.';

const SUMMARY = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description: '<=120 words: what the repo is, stack, main directories',
    },
    commit_style: {
      type: 'string',
      description: 'observed commit subject convention with 3 real example subjects',
    },
  },
  required: ['summary', 'commit_style'],
};
const INVENTORY = {
  type: 'object',
  properties: {
    branch: { type: 'string', description: 'current branch, or "(detached)"' },
    operation_in_progress: {
      type: 'string',
      description: 'merge | rebase | cherry-pick | revert | bisect, or empty string if none',
    },
    files: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'repo-relative path, forward slashes (new path for renames)',
          },
          old_path: { type: 'string', description: 'previous path for renames, else empty string' },
          status: {
            type: 'string',
            enum: [
              'modified',
              'added',
              'deleted',
              'renamed',
              'untracked',
              'typechange',
              'unmerged',
            ],
          },
          staged: { type: 'boolean', description: 'true if any part is already in the index' },
          note: { type: 'string', description: 'one line: what the change is' },
        },
        required: ['path', 'old_path', 'status', 'staged', 'note'],
      },
    },
    stashes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ref: { type: 'string' },
          subject: { type: 'string' },
          files: { type: 'array', items: { type: 'string' } },
          note: {
            type: 'string',
            description: 'one line: what it contains, and whether it overlaps the working tree',
          },
        },
        required: ['ref', 'subject', 'files', 'note'],
      },
    },
  },
  required: ['branch', 'operation_in_progress', 'files', 'stashes'],
};
const PLAN = {
  type: 'object',
  properties: {
    lanes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'short kebab-case id' },
          title: { type: 'string' },
          intent: { type: 'string', description: 'what this lane of changes is about' },
          files: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'title', 'intent', 'files'],
      },
    },
    skip: {
      type: 'array',
      description: 'files that should not be committed at all',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          reason: {
            type: 'string',
            description:
              'e.g. secret, machine-local state, stray lockfile, build output; suggest a .gitignore entry if apt',
          },
        },
        required: ['path', 'reason'],
      },
    },
  },
  required: ['lanes', 'skip'],
};
const REVIEW = {
  type: 'object',
  properties: {
    commits: {
      type: 'array',
      description: 'in the order they should be committed',
      items: {
        type: 'object',
        properties: {
          files: { type: 'array', items: { type: 'string' } },
          subject: {
            type: 'string',
            description: 'one line, <=72 chars, in the repo commit style',
          },
          body: {
            type: 'string',
            description: 'optional second line of context (<=1 line); empty string if none',
          },
        },
        required: ['files', 'subject', 'body'],
      },
    },
    excluded: {
      type: 'array',
      items: {
        type: 'object',
        properties: { path: { type: 'string' }, reason: { type: 'string' } },
        required: ['path', 'reason'],
      },
    },
    concerns: { type: 'array', items: { type: 'string' } },
  },
  required: ['commits', 'excluded', 'concerns'],
};
const COMMITTED = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          ok: { type: 'boolean' },
          sha: { type: 'string', description: 'short sha, empty string if not committed' },
          error: { type: 'string', description: 'hook/git error output, empty string if ok' },
        },
        required: ['subject', 'ok', 'sha', 'error'],
      },
    },
  },
  required: ['results'],
};
const FINAL = {
  type: 'object',
  properties: {
    remaining: {
      type: 'array',
      items: { type: 'string' },
      description: '`git status --porcelain` lines still present',
    },
    new_commits: {
      type: 'array',
      items: { type: 'string' },
      description: '`git log --oneline` lines newer than the start HEAD',
    },
  },
  required: ['remaining', 'new_commits'],
};

const norm = (p) =>
  String(p || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '');

// Every lane shares one git index, so commits must not interleave. Chain them.
let commitChain = Promise.resolve();
const serially = (fn) => {
  const run = commitChain.then(fn, fn);
  commitChain = run.then(
    () => {},
    () => {},
  );
  return run;
};

// ---- Survey ----
phase('Survey');
const [survey, inv] = await parallel([
  () =>
    agent(
      `${WHERE} Give a quick orientation to this repository: skim README/CLAUDE.md and the top-level layout, then summarize it in <=120 words. Also run \`git log -20 --format=%s\` and describe the commit subject convention (prefixes/scopes, tense, casing) with 3 real examples. Read-only.`,
      { label: 'summary', phase: 'Survey', schema: SUMMARY, effort: 'low' },
    ),
  () =>
    agent(
      `${WHERE} Inventory every uncommitted change. Read-only: ${GIT_RULES}
1. \`git status --porcelain=v1 -uall\` (untracked directories expanded to files), \`git branch --show-current\`, and check .git for MERGE_HEAD / rebase-merge / rebase-apply / CHERRY_PICK_HEAD / REVERT_HEAD / BISECT_LOG.
2. For each entry: repo-relative path with forward slashes (for renames give the new path and old_path), status, whether anything is already staged, and a one-line note of what changed — use \`git diff\`/\`git diff --cached\` for tracked files and read untracked files (skim large ones; just note binaries).
3. \`git stash list\`, and for each entry \`git stash show --include-untracked --name-only <ref>\` plus a glance at \`git stash show -p <ref>\`: list its files, what it holds, and whether it overlaps files changed in the working tree. Do not apply it.`,
      { label: 'inventory', phase: 'Survey', schema: INVENTORY, effort: 'low' },
    ),
]);
if (!inv) return { ok: false, stage: 'survey', error: 'inventory agent died' };
if (inv.operation_in_progress) {
  return {
    ok: false,
    stage: 'survey',
    error: `a ${inv.operation_in_progress} is in progress; finish it first`,
    stashes: inv.stashes,
  };
}
const files = inv.files.map((f) => ({ ...f, path: norm(f.path), old_path: norm(f.old_path) }));
const byPath = new Map(files.map((f) => [f.path, f]));
log(`${inv.branch}: ${files.length} changed file(s), ${inv.stashes.length} stash entr(ies)`);
if (inv.stashes.length)
  log(
    `Stashes are reported only, never applied: ${inv.stashes.map((s) => `${s.ref} (${s.subject})`).join('; ')}`,
  );
const unmerged = files.filter((f) => f.status === 'unmerged').map((f) => f.path);
if (unmerged.length)
  return { ok: false, stage: 'survey', error: `unmerged paths: ${unmerged.join(', ')}` };
if (!files.length)
  return {
    ok: true,
    summary: survey && survey.summary,
    commits: [],
    stashes: inv.stashes,
    note: 'working tree clean',
  };

const context = `Repo summary: ${survey ? survey.summary : '(unavailable)'}
Commit style: ${survey ? survey.commit_style : 'concise imperative subject, <=72 chars'}`;
const fileList = files
  .map(
    (f) =>
      `- ${f.path}${f.old_path ? ` (renamed from ${f.old_path})` : ''} [${f.status}${f.staged ? ', staged' : ''}] ${f.note}`,
  )
  .join('\n');

// ---- Plan (barrier: lanes must see every file to stay disjoint) ----
phase('Plan');
const plan = await agent(
  `${WHERE} ${context}

Changed files:
${fileList}

Partition these files into disjoint review lanes. A lane is a coherent area of work (one feature, one tooling change, one docs pass...) that a reviewer will later split into 1+ commits; files that must land together belong in the same lane. Every file goes in exactly one lane or in skip. Put a file in skip only if it should not be committed at all (secrets/credentials, machine-local or generated state, stray lockfiles for the wrong package manager, build output) — check .gitignore and the repo's own instructions (CLAUDE.md) for what belongs. Inspect diffs/files as needed; read-only (${GIT_RULES}). Use the exact paths above.`,
  { label: 'plan', phase: 'Plan', schema: PLAN },
);
if (!plan) return { ok: false, stage: 'plan', error: 'plan agent died' };

// Enforce disjointness in code: first claim wins, unknown paths dropped, unclaimed files get a lane.
const claimed = new Set();
const skip = plan.skip
  .map((s) => ({ ...s, path: norm(s.path) }))
  .filter((s) => byPath.has(s.path) && !claimed.has(s.path) && claimed.add(s.path));
const lanes = plan.lanes
  .map((l) => ({
    ...l,
    files: l.files.map(norm).filter((p) => byPath.has(p) && !claimed.has(p) && claimed.add(p)),
  }))
  .filter((l) => l.files.length);
const stray = files.map((f) => f.path).filter((p) => !claimed.has(p));
if (stray.length) {
  log(`Planner missed ${stray.length} file(s); giving them their own lane`);
  lanes.push({
    id: 'unclassified',
    title: 'Unclassified changes',
    intent: 'files the planner did not place',
    files: stray,
  });
}
log(
  `${lanes.length} lane(s): ${lanes.map((l) => `${l.id} (${l.files.length})`).join(', ')}; ${skip.length} file(s) skipped`,
);

const pathspec = (paths) =>
  paths
    .flatMap((p) => [p, (byPath.get(p) || {}).old_path])
    .filter(Boolean)
    .map((p) => `"${p}"`)
    .join(' ');

// ---- Review -> Commit, per lane (no barrier; commits serialized) ----
const laneResults = await pipeline(
  lanes,
  (lane) =>
    agent(
      `${WHERE} ${context}

You own ONE review lane: "${lane.title}" — ${lane.intent}
Your files (only these; other agents own every other changed file):
${lane.files.map((p) => `- ${p} [${byPath.get(p).status}] ${byPath.get(p).note}`).join('\n')}

Review the actual changes (\`git diff HEAD -- <path>\` for tracked files, read untracked ones). Then:
- Split your files into well-scoped logical commits (often just one). Each file goes in exactly one commit; whole files only (no partial hunks). Order them so each commit makes sense on top of the previous.
- Write each commit's subject in the repo's commit style (<=72 chars, imperative) plus an optional one-line body.
- Move a file to excluded if it should not be committed (secret, machine-local, generated, clearly unfinished/broken), with the reason.
- List real concerns you noticed (bugs, leftover debug code, secrets) in concerns.
Read-only: do not stage or commit anything yourself. ${GIT_RULES}`,
      { label: `review:${lane.id}`, phase: 'Review', schema: REVIEW },
    ),
  (review, lane) => {
    const mine = new Set(lane.files);
    const used = new Set();
    const commits = review.commits
      .map((c) => ({
        ...c,
        files: c.files.map(norm).filter((p) => mine.has(p) && !used.has(p) && used.add(p)),
      }))
      .filter((c) => c.files.length);
    const excluded = review.excluded
      .map((e) => ({ ...e, path: norm(e.path) }))
      .filter((e) => mine.has(e.path) && !used.has(e.path));
    const handled = new Set([...used, ...excluded.map((e) => e.path)]);
    const orphaned = lane.files.filter((p) => !handled.has(p));
    if (orphaned.length)
      log(`${lane.id}: reviewer left ${orphaned.join(', ')} unassigned; leaving uncommitted`);
    if (!commits.length)
      return {
        lane: lane.id,
        commits: [],
        results: [],
        excluded,
        orphaned,
        concerns: review.concerns,
      };

    const steps = commits
      .map((c, i) => {
        const msg = [c.subject.trim(), c.body.trim(), TRAILER].filter(Boolean).join('\n\n');
        return `Commit ${i + 1}
  paths: ${pathspec(c.files)}
  message (write verbatim to a temp file):
<<<MSG
${msg}
MSG>>>`;
      })
      .join('\n\n');
    return serially(() =>
      agent(
        `${WHERE} Create these commits, in order, touching ONLY the listed paths. Use the Bash tool (POSIX quoting). ${GIT_RULES}
For each commit:
1. \`git add -A -- <paths>\` (the -A stages deletions and both sides of renames).
2. Write the message between the markers to a temp file outside the repo (\`mktemp\`) byte for byte, then \`git commit -F <file> -- <paths>\` so nothing else that happens to be staged is included.
3. If the commit fails (e.g. a pre-commit hook), do NOT bypass or fix it: run \`git restore --staged -- <paths>\`, record ok=false with the error output, and continue with the next commit.
4. On success record \`git rev-parse --short HEAD\`. Remove the temp file.

${steps}`,
        { label: `commit:${lane.id}`, phase: 'Commit', schema: COMMITTED, effort: 'low' },
      ).then((r) => ({
        lane: lane.id,
        commits,
        results: r ? r.results : [],
        excluded,
        orphaned,
        concerns: review.concerns,
      })),
    );
  },
);

// ---- Converge ----
phase('Converge');
const done = laneResults.filter(Boolean);
const failedLanes = lanes.filter((_, i) => !laneResults[i]).map((l) => l.id);
if (failedLanes.length) log(`Lanes that died (left uncommitted): ${failedLanes.join(', ')}`);
const committed = done.reduce((n, r) => n + r.results.filter((x) => x.ok).length, 0);
const final = await agent(
  `${WHERE} Read-only check. Run \`git status --porcelain=v1 -uall\` and \`git log --oneline -${committed + 5}\`; return the status lines and the log lines for commits made just now (the most recent ${committed}).`,
  { label: 'converge', phase: 'Converge', schema: FINAL, effort: 'low' },
);

return {
  ok: failedLanes.length === 0 && done.every((r) => r.results.every((x) => x.ok)),
  branch: inv.branch,
  summary: survey ? survey.summary : null,
  commits: done.flatMap((r) => r.results.map((x) => ({ lane: r.lane, ...x }))),
  skipped: skip,
  excluded: done.flatMap((r) => r.excluded.map((e) => ({ lane: r.lane, ...e }))),
  unassigned: done.flatMap((r) => r.orphaned),
  concerns: done.flatMap((r) => r.concerns.map((c) => `${r.lane}: ${c}`)),
  failed_lanes: failedLanes,
  stashes: inv.stashes,
  remaining: final ? final.remaining : null,
  new_commits: final ? final.new_commits : null,
};
