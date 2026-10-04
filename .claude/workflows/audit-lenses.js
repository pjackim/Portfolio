export const meta = {
  name: 'audit-lenses',
  description:
    'Grade portfolio pages against docs/design/review-checklist.md: one reviewer per lens (goals, identity, style, craft, motion, constraints) over captured screenshots + source, then an adversarial verify/dedupe pass',
  whenToUse:
    'Called by /audit-portfolio (whole-site or focused audit) and /design-portfolio (independent review of a finished feature). Needs a capture directory from .claude/skills/audit-portfolio/scripts/capture.ts',
  phases: [
    { title: 'Review', detail: 'six lens reviewers in parallel, read-only' },
    { title: 'Verify', detail: 'adversarial check: drop false positives, merge duplicates, rank' },
  ],
};

// args:
//   captureDir: string (required) — output of capture.ts (PNGs + manifest.json)
//   repoPath:   string — repo/worktree root; defaults to the session's working directory
//   focus:      string — optional topic/feature to concentrate on
//   pages:      string[] — routes in scope (relative to the base, '' = home)
//   brief:      string — optional design brief (from /design-portfolio) to grade against
const A = args || {};
if (!A.captureDir)
  return { ok: false, error: 'args.captureDir is required (run capture.ts first)' };
const WHERE = A.repoPath
  ? `Repo root: ${A.repoPath}. Read files under it (paths below are relative to it).`
  : 'Repo root: the current working directory.';
const FOCUS = A.focus
  ? `Focus: "${A.focus}". Concentrate on the pages, components, scripts, and styles that implement it; note out-of-focus problems only if P0.`
  : 'Focus: the whole site across every page type captured.';
const PAGES =
  A.pages && A.pages.length
    ? `Pages in scope: ${A.pages.map((p) => p || '(home)').join(', ')}.`
    : '';
const BRIEF = A.brief
  ? `\nThe agreed design brief for this work (grade against it too):\n${A.brief}\n`
  : '';

const COMMON = `${WHERE}
${FOCUS} ${PAGES}
You are one reviewer in a design audit of Parker Jackim's portfolio (Astro 7 static site, plain CSS tokens, vanilla TS, strict CSP). Read-only: never edit files, run git write commands, or start servers.
Evidence lives in ${A.captureDir}: manifest.json (per view: overflow, thirdPartyRequests, jsBytes, inlineStyleAttrs, consoleErrors, imagesWithoutAlt) and PNGs named <page>__<width>__<scheme>[__motion]__{fold|full}.png. Open the PNGs with Read and look at them; "__fold" is what a scanning visitor sees first.
Rubric: docs/design/review-checklist.md (cite check IDs). Identity: docs/identity/site-style.md (and any other docs/identity/*.md). Goals and constraints: CLAUDE.md. Read the docs/design/ files your checks link to.
Approved identity is NOT a finding: the anti-slop.md "existing pattern" table (hero eyebrow, typed caret, numbered section headings, reticle/spotlight, Geist, existing em-dashes) is deliberate. Flag only new spread of those patterns.
Every finding needs concrete evidence: a screenshot file name plus what is visible in it, or a file:line with the offending code quoted. No evidence, no finding. Prefer fewer, real findings over many speculative ones.
Every finding also needs:
- "fix": a concrete, implementable solution a later agent can apply without re-deciding anything: the files, the exact change (selectors, properties, token names, markup, copy), and how to verify it. Not "consider improving X". If the right solution genuinely needs a choice only Parker can make, say what the choice is and propose a default.
- "shot": how to photograph the issue for the report: the page path, a CSS selector that tightly frames the problem (prefer a component or element over a whole section), the width and scheme where it's clearest, and the state (hover, focus, or none) that exposes it. For code-only issues, frame the element the code styles. Also list what is working well in your lens (short), so fixes don't break it.${BRIEF}`;

const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'one line, the defect' },
          checks: {
            type: 'array',
            items: { type: 'string' },
            description: 'checklist IDs, e.g. ["G2","C3"]',
          },
          severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
          where: { type: 'string', description: 'page(s)/viewport(s) and component/file' },
          evidence: {
            type: 'string',
            description: 'screenshot file + what it shows, and/or file:line + quoted code',
          },
          fix: {
            type: 'string',
            description:
              'concrete, implementable solution: files, exact change, how to verify (no "consider…")',
          },
          shot: {
            type: 'object',
            description: 'evidence shot spec for scripts/evidence.ts',
            properties: {
              path: { type: 'string', description: "route relative to base, '' = home" },
              selector: { type: 'string', description: 'CSS selector framing the issue' },
              width: { type: 'number', enum: [390, 768, 1280, 1920] },
              scheme: { type: 'string', enum: ['light', 'dark'] },
              state: { type: 'string', enum: ['none', 'hover', 'focus'] },
            },
            required: ['path', 'selector', 'width', 'scheme', 'state'],
          },
          fix_class: {
            type: 'string',
            enum: ['M', 'J'],
            description: 'M = one objectively correct fix; J = design judgement',
          },
          files: {
            type: 'array',
            items: { type: 'string' },
            description: 'files a fix would touch',
          },
        },
        required: [
          'title',
          'checks',
          'severity',
          'where',
          'evidence',
          'fix',
          'shot',
          'fix_class',
          'files',
        ],
      },
    },
    strengths: { type: 'array', items: { type: 'string' } },
  },
  required: ['findings', 'strengths'],
};

const LENSES = [
  {
    key: 'goals',
    prompt:
      "Lens: GOALS / SHOWCASE (checks G1–G4, G7). Be the fast, lazy scanner: from the fold and full screenshots at 390 and 1280 only, what would a visitor learn about what Parker built, his history, and how strong the work is, without reading prose or clicking? Are projects shown with real imagery plus a 2–3 short-sentence summary? Is the strongest work biggest and earliest? Does each page read as a layer cake? Does new UI reach the hero's bar? Read docs/design/scanning-and-reading.md, progressive-disclosure.md, bento-grid.md.",
  },
  {
    key: 'identity',
    prompt:
      'Lens: IDENTITY & CONTACT (checks G8, G9, S6). Is Parker recognisable (photo, name, logo as one identity, face appearing early)? Is every contact channel in src/data/site.ts one obvious, zero-friction step away on every captured page (mailto:/tel:, label, no forms)? Is the visible copy in the site voice (plain first person, terse mono keys, destination-named actions, no hype, no new em-dashes) and fact-only (every claim sourced by a comment in site.ts or project frontmatter)?',
  },
  {
    key: 'style',
    prompt:
      'Lens: STYLE FIDELITY (checks S1–S5, S7). Compare every in-scope surface with docs/identity/site-style.md and with the hero as the reference: palette roles (one accent, tone + hairline depth, no shadows/glass/gradient fills), 2–4px radii, type roles (mono only for labels/data), signature elements reused via components rather than re-drawn or multiplied, and whether each section feels like the same instrument. Grep styles for box-shadow, backdrop-filter, border-radius, raw colours outside tokens.css. Compare light and dark screenshots.',
  },
  {
    key: 'craft',
    prompt:
      'Lens: CRAFT (checks C1–C8). Squint test on the screenshots, proximity rhythm, heading spacing, token use (grep in-scope CSS for raw px/rem/ms/colour literals that should be --step/--space/--radius/--dur/--ease or colour tokens), body size and measure, anti-slop tells (docs/design/anti-slop.md table), repeated layout families, bento cell counts, overflow (manifest overflowX/overflowingElements) and clipping/overlap at every width.',
  },
  {
    key: 'motion',
    prompt:
      "Lens: MOTION & INTERACTION (checks A1–A7, G5, G6). Read the in-scope components' <style> and their src/scripts modules. Every animation has a job; content visible at rest; every motion rule is behind the gate (CSS: :root:not([data-motion='off']) inside @media (prefers-reduced-motion: no-preference), wrapped in :global() in scoped styles; TS: motionAllowed()/onMotionChange() from src/scripts/motion.ts); token durations/easing, no bounce, cheap properties; reveals via data-reveal presets (no new IntersectionObserver or scroll listener); loops only in view; hover/focus/press feedback everywhere with focus mirroring hover; nothing essential hover-only; whole-card links follow docs/design/cards.md. Compare __motion shots with reduced-motion shots if present.",
  },
  {
    key: 'constraints',
    prompt:
      'Lens: CONSTRAINTS (checks X1–X7, static part). From source and manifest.json: inline style= or on*= handlers in src/ markup; per-instance CSS not via src/lib/page-style.ts; raw href="/…" or src="/…" instead of withBase(); jsBytes per page vs the 30 KB budget; any thirdPartyRequests; consoleErrors; imagesWithoutAlt; media outside the pipeline (non-WebP images or videos without MP4+WebM+poster under src/content); lossy masters that have a recoverable original (npm run check:media lists them) and images or loops that look visibly compressed at 2x (quality first: media ships at the best quality its original allows); visible contrast problems in screenshots (verify token pairs in tokens.css when in doubt); heading order; new dependencies in package.json. The session runs axe/lint/build/e2e itself; don\'t claim results you didn\'t see.',
  },
];

phase('Review');
const reviews = await parallel(
  LENSES.map(
    (lens) => () =>
      agent(`${COMMON}\n\n${lens.prompt}`, {
        label: `lens:${lens.key}`,
        phase: 'Review',
        schema: FINDINGS,
      }).then((r) => (r ? { lens: lens.key, ...r } : null)),
  ),
);

const done = reviews.filter(Boolean);
const failed = LENSES.map((l) => l.key).filter((k) => !done.some((r) => r.lens === k));
if (failed.length) log(`Lens reviewer(s) died: ${failed.join(', ')}`);
const raw = done.flatMap((r) => r.findings.map((f) => ({ ...f, lens: r.lens })));
log(`${raw.length} raw finding(s) from ${done.length} lens(es)`);
if (!raw.length)
  return {
    ok: true,
    findings: [],
    strengths: done.flatMap((r) => r.strengths),
    failedLenses: failed,
  };

phase('Verify');
const VERIFIED = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'F1, F2, … in final rank order' },
          ...FINDINGS.properties.findings.items.properties,
          lenses: { type: 'array', items: { type: 'string' } },
          verdict: { type: 'string', enum: ['confirmed', 'plausible'] },
          route: {
            type: 'string',
            enum: ['fix', 'design', 'owner'],
            description:
              'fix = keeps current layout/hierarchy/content; design = changes layout, sizes/order, what is shown, or adds an interaction; owner = needs Parker (fact, media, contact detail, dependency, brand change)',
          },
          route_reason: { type: 'string', description: 'one line: why this route' },
        },
        required: [
          'id',
          'title',
          'checks',
          'severity',
          'where',
          'evidence',
          'fix',
          'shot',
          'fix_class',
          'files',
          'lenses',
          'verdict',
          'route',
          'route_reason',
        ],
      },
    },
    rejected: {
      type: 'array',
      items: {
        type: 'object',
        properties: { title: { type: 'string' }, reason: { type: 'string' } },
        required: ['title', 'reason'],
      },
    },
  },
  required: ['findings', 'rejected'],
};
const verified = await agent(
  `${COMMON}

You are the adversarial verifier. Below are raw findings from six lens reviewers. For EACH one, re-open its evidence (the screenshot or file:line) and try to refute it. Reject it (with a reason) if the evidence doesn't show the problem, if it's approved identity per the anti-slop.md existing-pattern table, if it contradicts CLAUDE.md or docs/identity/site-style.md, or if it's pure taste with no rule behind it. Merge duplicates (keep every lens name and check ID). Re-check severity and fix_class: M only if there is one objectively correct fix. Mark "confirmed" when you reproduced it from the evidence, "plausible" when it's likely but you couldn't fully confirm. Then check that every surviving finding's "fix" is concrete enough to implement without re-deciding anything (sharpen it if not) and that its "shot" selector really frames the problem. Then route it. A later "/audit-portfolio fix" run implements fix- and design-routed findings exactly as written, without asking, so be strict: "fix" only when the change keeps the current layout, information hierarchy, and content (a token swap, a missing hover/focus/active state, a contrast or spacing correction, a gate or attribute that's missing). Anything that changes layout, sizes/order of items, what is shown, or adds a new interaction is "design". Anything that needs a fact, image/media choice, contact detail, dependency, or brand decision (fonts, accent, signature elements) from Parker is "owner". When torn between fix and design, choose design. Rank most severe first and number them F1, F2, …

Raw findings (JSON):
${JSON.stringify(raw, null, 1)}`,
  { label: 'verify', phase: 'Verify', schema: VERIFIED },
);
if (!verified) return { ok: false, error: 'verifier died', raw, failedLenses: failed };

return {
  ok: true,
  findings: verified.findings,
  rejected: verified.rejected,
  strengths: done.flatMap((r) => r.strengths.map((s) => `${r.lens}: ${s}`)),
  failedLenses: failed,
};
