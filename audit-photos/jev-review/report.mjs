// Generates jev-review/REPORT.md from results.json, accuracy.json, adjudication/, claims. Run: node audit-photos/jev-review/report.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const J = (p) => JSON.parse(fs.readFileSync(path.join(dir, p), 'utf8'));
const results = J('results.json');
const acc = J('accuracy.json');
const man = J('../flagged-downloads/manifest.json');
const mById = Object.fromEntries(man.map((m) => [m.id, m]));
const adj = {};
for (const f of fs.readdirSync(path.join(dir, 'adjudication'))) {
	const a = J('adjudication/' + f);
	adj[a.id] = a;
}
const SEV = { none: 0, minor: 1, moderate: 2, severe: 3 };
const int = Math.round;
const fl = (m) => (m ? (m.group === 'confirmed' ? m.priority : 'candidate') : 'unflagged');
const ranked = [...results].sort((a, b) => a.overall.composite - b.overall.composite);
const rank = Object.fromEntries(ranked.map((r, i) => [r.id, i + 1]));
const pct = (x) => `${int(x * 100)}%`;
const j = acc.jev;
const c = acc.consensus;
const cl = acc.claims;

const tierCount = (pred) => results.filter(pred).length;
const flaggedIds = new Set(man.map((m) => m.id));
const graded = results.filter((r) => adj[r.id]);
const px = (id) => Math.max(SEV[adj[id].standalone], SEV[adj[id].in_place]);
const agreeFirst = graded.filter((r) => (['high', 'medium'].includes(fl(mById[r.id])) ? 1 : 0) === (px(r.id) >= 2 ? 1 : 0)).length;
const agreeJev = graded.filter((r) => (r.overall.tier === 'Issue' ? 1 : 0) === (px(r.id) >= 2 ? 1 : 0)).length;

const newConsensus = results.filter((r) => !flaggedIds.has(r.id) && r.overall.tier === 'Issue' && adj[r.id] && px(r.id) >= 2).map((r) => r.id);
const overcalled = results.filter((r) => flaggedIds.has(r.id) && adj[r.id] && px(r.id) <= 1).map((r) => r.id);
const jevOnlyIssue = results.filter((r) => !flaggedIds.has(r.id) && r.overall.tier === 'Issue' && adj[r.id] && px(r.id) <= 1).map((r) => r.id);

const usage = (() => {
	const dirs = ['jev/standalone', 'jev/inplace'];
	return dirs.map((d) => fs.readdirSync(path.join(dir, d)).length).join(' + ');
})();

const rows = ranked.map((r) => {
	const m = mById[r.id];
	const a = adj[r.id];
	return `| ${r.id} | ${r.project ?? '—'} | ${fl(m)} | **${r.overall.tier}** | ${int(r.overall.composite)} | ${int(r.standalone.composite)} | ${int(r.inplace.composite)} | ${r.standalone.severity.label}${r.standalone.severity.decision === 'reject' ? '*' : ''} | ${r.standalone.primary_issue.label.replaceAll('_', ' ')} | ${a ? `${a.standalone} / ${a.in_place}` : '—'} |`;
});

const md = `# Jev second pass on the photo audit

Date: 2026-09-29. Engine: Jev \`jev-1.13.0\` (TypeSafe System One) through the \`jev_ask\` (Score, Noul, Choice), \`jev_classify\` and \`jev_verify\` tools. Reports edited in place: \`flagged-downloads/README.md\`, \`findings.csv\`, \`manifest.json\`, \`../COVERAGE.md\`; new: \`../all-assets-side-by-side.csv\`. The first-pass text is unchanged (baseline is git commit \`53b6042\`); every image evaluation now has the Jev evaluation beside it.

## Headline: how accurate was the first pass?

**${int(j.total)} / 100** measured against Jev (as asked). Against a stricter reference where blind pixel graders can veto Jev, **${int(c.total)} / 100**. Read it as "about 55, ±5": the first pass's facts were sound, but it found only part of what Jev sees and ranked it only weakly like Jev does.

| Component (weight fixed before scoring) | What it measures | Result | Points |
| --- | --- | --- | --- |
| Claims (30) | The first pass's own statements: ${cl.numeric.n} numeric (${cl.numeric.holds} hold), ${cl.process.n} coverage/process (${cl.process.holds} hold, 7 cannot be checked from files; 9 of the process claims come from the README intro and closing paragraphs and are attached to no README line), ${cl.semantic.n} descriptive checked by \`jev_verify\` (${cl.semantic.yes} supported, ${cl.semantic.uncertain} uncertain, ${cl.semantic.no} not supported; mean p ${cl.semantic.mean_p.toFixed(2)}). Weighted 0.30 / 0.10 / 0.60 | ${pct(cl.value)} | ${(30 * cl.value).toFixed(1)} |
| Overlap of worst 22 (20) | First pass flagged 22 files; how many are among Jev's 22 lowest overall scores | ${j.overlap22.n}/22 | ${(20 * j.overlap22.value).toFixed(1)} |
| Precision (15) | Of the 22 flagged: Jev Issue = 1, Watch = ½, Clean = 0 | ${pct(j.precision.value)} | ${(15 * j.precision.value).toFixed(1)} |
| Recall (15) | Of Jev's ${j.issueCount} Issue-tier assets, share the first pass flagged | ${j.recall.n}/${j.recall.of} = ${pct(j.recall.value)} | ${(15 * j.recall.value).toFixed(1)} |
| Ranking (20) | Spearman ρ between first-pass tier (high 3, medium 2, candidate 1, unflagged 0) and Jev severity; max(0, ρ) | ρ = ${j.ranking.rho.toFixed(2)} | ${(20 * j.ranking.value).toFixed(1)} |
| **Total** | | | **${j.total.toFixed(1)}** |

Sensitivity: with blind pixel graders able to veto Jev on the 36 assets they graded, overlap ${c.overlap22.n}/22, precision ${pct(c.precision.value)}, recall ${c.recall.n}/${c.recall.of}, ρ ${c.ranking.rho.toFixed(2)}, total ${c.total.toFixed(1)}. Implementation: \`accuracy.mjs\`, output \`accuracy.json\`.

## What the second pass found

- **The first pass's evidence is accurate.** Every numeric claim reproduces from \`inventory.json\`/\`facts.json\` (crop %, rendered sizes, native sizes), all checkable coverage statements hold (20 pages, 5 sizes, 100 visits, 61 assets, sha256 of the 22 downloads). The weak spot is descriptive wording, where Jev could not fully support ${cl.semantic.uncertain + cl.semantic.no} of ${cl.semantic.n} claims; 6 of the 59 paragraph claims are "not supported" and split into two evidence gaps (C066 "131x140 is too small to read" and C123 "same framing as on the page" were not among the views captured; they are scored as failures, p 0.10 and 0.14, although they are gaps, not contradictions) and four disagreements about legibility/background: Go Green paragraph "illegible" at phone width (C167, C168; the 276 px width in C168 was measured, not re-viewed), Trip Planner dialog text "difficult to read" at 308 px (C152), and Forest menu panels "over detailed dark foliage" (C110). The second pass's observers read those screenshots at full dpr3 resolution and found the text small but readable; only a physical-phone check settles it. The six "Other observations" claims (C173-C178) were verified last (they are attached to no single asset): C173 Hero Trivia blur is deliberate, supported (p 0.95); C174 Arch Linux wallpaper, C175 ant close-ups and C176 smoke/cloud effects "not a resolution defect", uncertain (p 0.61, 0.45, 0.57); C177 "portrait, logo exports, most renders and scenic images had no material image-quality defect", not supported (p 0.05); C178 "dense diagrams benefit from full-size links", not supported (p 0.09; the evidence describes image quality only and says nothing about links, so this is a gap, not a contradiction). C177 is partly contradicted by Jev's own data: main problem "low resolution" for #47 (ant render close-up), #59 (Paradox logo) and #7 (portrait), all Watch, and #13, #45, #46 (renders) are Jev Issue.
- **The top of the first pass is right.** Jev's two worst assets are first-pass "high" (#54 Ant Game poster, #58 Paradox banner); #6, #2 follow. Nine of the 14 confirmed findings are Jev Issue (six of six "high"); the other five confirmed are Watch (Jev finds a problem, less severe). Blind pixel graders agree the "high" items are real for #2, #58 (severe) and #54 (moderate).
- **The first pass over-called its review candidates.** Of the 8 candidates, Jev rates 2 Issue, 4 Watch, 2 Clean (#17, #20), and blind graders put ${overcalled.length} flagged files at minor/none (#${overcalled.join(', #')}: six of the eight candidates, plus confirmed #30). The README itself called the candidates optional; the second pass agrees.
- **The first pass missed some real weakness.** ${jevOnlyIssue.length + newConsensus.length} unflagged assets are Jev Issue and were graded blind. Pixel graders back Jev on ${newConsensus.length} (#${newConsensus.join(', #')}: moderate or worse); on the other ${jevOnlyIssue.length} (#${jevOnlyIssue.join(', #')}) they say minor/none, so Jev is probably over-strict there.
- **One concrete site defect the first pass did not name.** The AES home card (#6) loads a 480 px wide rendition into a 1150 px wide, 177 px tall slot on a 1440 px screen (\`sizes\` says \`30rem\` while the card is full width): the browser enlarges it about 2.4x, so beyond the 73% crop the image is also soft (\`facts.json\` placement \`home / desktop / cover-card\`, \`source_used.w = 480\`). The first pass cited only the 1280x720 source. A different cause: Mordhau's carousel file is natively 514 px (its srcset tops out at 514w) in a 644 px slot, not a \`sizes\` mismatch, and the first pass already flagged it (C027, C050).
- **Jev and blind graders disagree in a consistent direction.** On the 36 blind-graded assets, the first pass's high/medium flags match the graders' "moderate or worse" on ${agreeFirst}/36; Jev's Issue tier on ${agreeJev}/36. Jev is stricter, mostly about "artifacts or overlays" and "framing" (taskbars, cursors, limbs running off the frame such as #13).

## How Jev was used (per docs.typesafe.ai)

Jev is text-only, literal, and cannot count or compare numbers; it degrades on large or irrelevant state. So code owns the workflow:

1. **Measure (code):** \`facts.mjs\` → \`facts.json\`: native size, sharpness, exposure, contrast, empty bands; for each of the 485 placements, rendered size, fit, crop loss, and the file the browser actually loaded (\`inventory.json\`, \`carousels.json\`). Most numbers are turned into words before Jev sees them; a few (\`file_pixels\`, shown size, crop note, empty-band percentages, the loaded-file width) still reach it as text.
2. **Describe (blind vision agents):** 61 standalone and 61 in-place observation files (146 element screenshots on the live site at desktop 1440 and mobile 390, up to two placements per asset per viewport). Agents were barred from the first-pass reports and only described, never graded.
3. **Judge (Jev):** per asset, one \`jev_ask\` with 6-7 Score questions (resolution headroom, text legibility, subject clarity, framing, contrast/exposure, artifact cleanliness, glance impact), 3 Noul questions and a Choice for the main issue; \`jev_classify\` for severity (none/minor/moderate/severe) and for fix kind (gentle AI touch-up / recrop-or-recapture / replace; in place also layout-fix). Per in-place view: 4-5 Scores (97 views have 5, 49 have 4: no text-legibility score when the observation says "no text"), 2 Nouls, severity and fix kind. \`jev_verify\` for the first pass's descriptive claims; \`jev_classify\` again to read each first-pass recommendation as a fix kind. Composite weights and tiers are code (\`rubric.mjs\`, \`compose.mjs\`).
4. **Tier rule (revised twice, see "What went wrong"; only the accuracy weights were fixed before scoring):** dimension flagged if its expected level < 1.5 (rounds to the two weakest anchors; level 2 is "acceptable" in every rubric). Classifier flag = severity moderate or severe, ignored when Jev marks the answer \`reject\` (too uncertain). **Issue** = classifier severe and scorer flag together; **Watch** = either, not both; **Clean** = neither.
5. **Third opinion:** 36 assets where first pass and Jev disagreed (plus controls) were graded blind from pixels alone (\`adjudication/\`). Selected for disagreement, so agreement rates on it are not population rates.

Jev calls: results for ${usage} asset files (standalone + in place); about 1,500 requests across all iterations, roughly US$0.07 in total (from the run ledger; no usage fields are stored in \`jev/\`).

## What went wrong on the way (kept so the numbers can be trusted)

- v1 asked one 5-way action question; Jev picked "recrop-or-recapture" for 47/61 (37 of them with decision \`accept\`) and never "fine". Fix: ask severity separately from fix kind (\`jev/v1-standalone-action-classify/\`).
- v2 severity with the full state (including code buckets like "dark", "low contrast") still marked 59/61 as needing work; a fine waterfall photo (#56) came back "moderate". Fix: classify on a lean state with concrete severity anchors (\`jev/v2-standalone-full-state-classify/\`).
- v3 described resolution shortfall against device pixels; every phone placement (dpr 3) then read "visibly blurry" for every asset. Fix: source pixels per CSS pixel (\`jev/v3-inplace-device-ratio-wording/\`).
- The first tier rule (classifier ≥ moderate and scorer flag) was first run as 48/61 "Issue" (that v4a answer set was not kept, so 48 cannot be reproduced; the same rule on the final data gives 49); tightened to severe (28), then to ${tierCount((r) => r.overall.tier === 'Issue')} after adding the confidence gate (asset #13, a fine render whose limbs leave the frame, had come back moderate at confidence 0.38).
- Thresholds and wording were calibrated on #56 (clearly fine) and #54/#2/#58 (clearly bad), never by tuning against first-pass flags; but #54, #2 and #58 are three of the first pass's six "high" findings (see Limits).

## Limits

- Jev never sees pixels. Everything it judges is a vision agent's description plus code measurements, and the observers were asked to describe defects, which biases toward negatives. Blind graders (same model family as the observers) were milder, so the true bar sits between Jev and them.
- Jev's in-place severity was \`reject\` (too uncertain) for 78 of 146 views and 22 of 61 standalone; those contribute no flag. Scores are still shown.
- In-place review covers desktop 1440 and mobile 390 visually. 1920, 768 and 320 were measured, not re-viewed.
- First-pass numeric claims all hold partly because the first pass and this one read the same browser measurements; that component measures fidelity, not independent truth.
- Tier thresholds are judgment calls; ranking metrics (overlap, ρ) do not depend on them.
- The calibration anchors #54, #2 and #58 are three of the first pass's six "high" findings, so agreement at the top of the list (overlap, ranking) is partly by construction.
- Asset #13 (a fine render whose limbs leave the frame) motivated the confidence gate, yet it is still Jev Issue through one in-place view (severity severe, decision accept, confidence 0.99); the gate did not change its tier. Its standalone read was moderate (confidence 0.38, reject).
- The claims total counts a 'not supported' verdict from an evidence gap as a failure, and the Agreement and precision rows compare tiers only, not the stated main problem (for example #18 "limited retina resolution" vs Jev "poor framing"). Recall counts the 8 optional review candidates as flagged.
- Not covered: \`docs/audits/2026-09-27-project-cards.md\` (a layout audit, finding F3 also calls the Mordhau cover mostly empty black, consistent with Jev's #2 result).

## All 61 assets, worst first

Overall = 0.5 × standalone + 0.5 × in place; in place = half mean of views, half worst view. 0-100, 50 = "acceptable". \`*\` = severity classifier too uncertain. The severity column is standalone-only, while the Jev tier also uses in-place severity. Blind grade = standalone / in place from pixels only.

| ID | Project | First pass | Jev tier | Overall | Standalone | In place | Standalone severity | Main problem | Blind grade |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join('\n')}

## Files

- \`CONTRACT.md\` data contract; \`facts.mjs\`/\`facts.json\`; \`observations/standalone|inplace/\`; \`rubric.mjs\` (question set, levels, weights); \`run-jev.body.js\` (Jev runner); \`jev/\` raw answers and exact states; \`compose.mjs\` → \`results.json\`; \`claims.mjs\`/\`claims.json\`, \`jev/claims-verify.json\`; \`adjudication/\`; \`accuracy.mjs\` → \`accuracy.json\`; \`apply-reports.mjs\` (rewrites the reports from the baseline commit); \`report.mjs\` (this file).
- Re-run: \`node audit-photos/jev-review/compose.mjs && node audit-photos/jev-review/accuracy.mjs && node audit-photos/jev-review/apply-reports.mjs && node audit-photos/jev-review/report.mjs\` (Jev calls themselves need a TypeSafe key and the agent's \`jev_*\` tools).
`;
fs.writeFileSync(path.join(dir, 'REPORT.md'), md);
console.log('REPORT.md written', md.length);
