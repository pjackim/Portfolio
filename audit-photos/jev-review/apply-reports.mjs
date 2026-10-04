// Rewrites the first-pass reports with the Jev second pass side by side.
// Source of the first-pass text is the baseline commit (BASELINE), so this script is re-runnable.
// Run from repo root: node audit-photos/jev-review/apply-reports.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const BASELINE = '53b6042';
const dir = path.dirname(fileURLToPath(import.meta.url));
const audit = path.resolve(dir, '..');
const repo = path.resolve(audit, '..');
const J = (p) => JSON.parse(fs.readFileSync(path.join(dir, p), 'utf8'));
const base = (rel) => execFileSync('git', ['show', `${BASELINE}:audit-photos/${rel}`], { cwd: repo, encoding: 'utf8', maxBuffer: 1 << 26 });
const pad = (n) => String(n).padStart(2, '0');
const int = (x) => Math.round(x);

const results = J('results.json');
const byId = Object.fromEntries(results.map((r) => [r.id, r]));
const acc = J('accuracy.json');
const claims = J('claims.json');
const verify = J('jev/claims-verify.json');
const recKind = Object.fromEntries(J('jev/firstpass-recommendation-kind.json').map((r) => [r.id, r]));
const SEV = { none: 0, minor: 1, moderate: 2, severe: 3 };
const adj = {};
for (const f of fs.readdirSync(path.join(dir, 'adjudication'))) {
	const a = J('adjudication/' + f);
	adj[a.id] = a;
}
const manifest = JSON.parse(base('flagged-downloads/manifest.json'));
const mById = Object.fromEntries(manifest.map((m) => [m.id, m]));
const firstLabel = (m) => (m.group === 'confirmed' ? m.priority : 'candidate');

// rank 1 = worst overall composite
const ranked = [...results].sort((a, b) => a.overall.composite - b.overall.composite);
const rank = Object.fromEntries(ranked.map((r, i) => [r.id, i + 1]));

// ---- claim summaries per asset ----
const semanticByClaim = {};
for (const v of verify) v.claim_ids.forEach((cid, i) => (semanticByClaim[cid] = v.raw.claims[i]));
function claimSummary(assetId) {
	const cs = claims.filter((c) => c.asset_id === assetId);
	const num = cs.filter((c) => c.kind === 'numeric' && c.verdict !== 'cannot-check');
	const sem = cs.filter((c) => c.kind === 'semantic' && semanticByClaim[c.claim_id]);
	const yes = sem.filter((c) => semanticByClaim[c.claim_id].read === 'yes').length;
	const unc = sem.filter((c) => semanticByClaim[c.claim_id].read === 'uncertain').length;
	const no = sem.filter((c) => semanticByClaim[c.claim_id].read === 'no').length;
	const weak = sem
		.filter((c) => semanticByClaim[c.claim_id].read !== 'yes')
		.map((c) => `“${c.text}” (${semanticByClaim[c.claim_id].read}, p=${semanticByClaim[c.claim_id].p})`);
	return {
		numeric: { n: num.length, holds: num.filter((c) => c.verdict === 'holds').length },
		semantic: { n: sem.length, yes, unc, no, weak },
	};
}
const claimText = (s) => {
	const parts = [];
	if (s.numeric.n) parts.push(`numeric ${s.numeric.holds}/${s.numeric.n} hold`);
	if (s.semantic.n) parts.push(`descriptive ${s.semantic.yes} supported, ${s.semantic.unc} uncertain, ${s.semantic.no} not supported`);
	return parts.length ? parts.join(' · ') : 'no checkable statements';
};

function agreement(m, r) {
	const t = r.overall.tier;
	if (!m) return t === 'Clean' ? 'agree (neither flags it)' : `Jev flags it (${t}); first pass did not`;
	const l = firstLabel(m);
	if (t === 'Clean') return 'disagree (Jev sees no problem)';
	if (l === 'candidate') return t === 'Watch' ? 'agree' : 'partly (Jev rates it more serious)';
	return t === 'Issue' ? 'agree' : 'partly (Jev rates it less serious)';
}

const dimLabel = { resolution_headroom: 'resolution', text_legibility: 'text', subject_clarity: 'subject', framing: 'framing', contrast_exposure: 'contrast', artifact_cleanliness: 'artifacts', scan_first_impact: 'glance impact', text_legibility_here: 'text', crop_framing_here: 'crop', resolution_here: 'resolution', overlay_intrusion: 'overlays', glance_here: 'glance impact' };
const dimsLine = (dims) =>
	Object.entries(dims)
		.map(([k, v]) => `${dimLabel[k]} ${int(v.score100)}`)
		.join(' · ');
const sevText = (s) => `${s.label} (${s.decision === 'reject' ? 'too uncertain' : s.decision}, conf ${s.confidence})`;

function worstView(r) {
	return r.inplace.views.reduce((a, b) => (b.composite < a.composite ? b : a));
}
function inplaceSev(r) {
	const order = { none: 0, minor: 1, moderate: 2, severe: 3 };
	const usable = r.inplace.views.filter((v) => v.severity.decision !== 'reject');
	if (!usable.length) return 'no confident read';
	return usable.reduce((a, b) => (order[b.severity.label] > order[a.severity.label] ? b : a)).severity.label + ` (worst of ${usable.length} confident of ${r.inplace.views.length} views)`;
}

function block(id, m) {
	const r = byId[id];
	const w = worstView(r);
	const a = adj[id];
	const cs = claimSummary(id);
	const rk = recKind[id];
	const rows = [];
	rows.push(['Verdict', m ? `**${firstLabel(m)}**: ${m.issue}` : 'not flagged', `**${r.overall.tier}** · overall ${int(r.overall.composite)}/100 · rank ${rank[id]} of 61 (1 = worst)`]);
	rows.push(['Score', 'none given (priority tier only)', `standalone ${int(r.standalone.composite)} · in place ${int(r.inplace.composite)} (worst view: ${w.page} @ ${w.viewport}, ${int(w.composite)})`]);
	rows.push(['Severity (classifier)', '—', `standalone ${sevText(r.standalone.severity)}; in place ${inplaceSev(r)}`]);
	rows.push(['Main problem', m ? m.issue : '—', `${r.standalone.primary_issue.label.replaceAll('_', ' ')} (standalone, conf ${r.standalone.primary_issue.confidence})`]);
	rows.push([
		'Fix',
		m ? `${m.recommendation} — Jev reads this as **${rk.choice}** (conf ${rk.confidence})` : '—',
		`standalone: ${r.standalone.remedy.label} (conf ${r.standalone.remedy.confidence}) · in place: ${r.inplace.dominant_remedy ?? 'none needed'}`,
	]);
	rows.push(['Weakest dimensions', '—', `standalone: ${dimsLine(r.standalone.dims)} → weakest **${dimLabel[r.standalone.min_dim.dim]}** ${int((r.standalone.min_dim.level / 4) * 100)}`]);
	if (m) rows.push(['Fact check of the paragraph above', '—', claimText(cs) + (cs.semantic.weak.length ? `. Not fully supported: ${cs.semantic.weak.join('; ')}` : '')]);
	if (a) rows.push(['Blind pixel grade (third opinion)', '—', `standalone ${a.standalone} · in place ${a.in_place} (${a.in_place_worst_file}): ${a.evidence}`]);
	rows.push(['Tier agreement (severity tier only)', '', agreement(m, r)]);
	const esc = (s) => String(s).replaceAll('|', '\\|');
	return ['**Second pass (Jev) beside the first pass**', '', '| | First pass | Jev second pass |', '| --- | --- | --- |', ...rows.map((x) => `| ${esc(x[0])} | ${esc(x[1])} | ${esc(x[2])} |`), ''].join('\n');
}

// ---------------- README ----------------
function buildReadme() {
	let md = base('flagged-downloads/README.md');
	const lines = md.split('\n');
	const out = [];
	let currentSection = null; // asset id for per-image sections
	const flushSection = () => {
		if (currentSection != null) {
			out.push(block(currentSection, mById[currentSection]));
			out.push('');
		}
		currentSection = null;
	};
	const extraCols = (line, cells) => line.replace(/\s*\|\s*$/, '') + ' | ' + cells.join(' | ') + ' |';
	const jevCells = (id) => {
		const r = byId[id];
		return [`**${r.overall.tier}**`, `${int(r.overall.composite)}`, `${int(r.standalone.composite)} / ${int(r.inplace.composite)}`, r.standalone.primary_issue.label.replaceAll('_', ' ')];
	};
	const bulletFacts = (line) => {
		const hit = claims.filter((c) => c.quote && line.includes(c.quote.trim()));
		if (!hit.length) return line;
		const chk = hit.filter((c) => c.kind !== 'semantic');
		const holds = chk.filter((c) => c.verdict === 'holds').length;
		const cant = chk.filter((c) => c.verdict === 'cannot-check').length;
		const sem = hit.filter((c) => c.kind === 'semantic' && semanticByClaim[c.claim_id]);
		const bits = [];
		if (chk.length - cant) bits.push(`${holds}/${chk.length - cant} checkable statements hold`);
		if (cant) bits.push(`${cant} cannot be checked from the saved files`);
		if (sem.length) bits.push(`${sem.filter((c) => semanticByClaim[c.claim_id].read === 'yes').length}/${sem.length} descriptive statements supported by Jev`);
		return bits.length ? line + `\n  - *Second pass:* ${bits.join('; ')}.` : line;
	};
	let inPerImage = false;
	let inTable = null;
	for (let i = 0; i < lines.length; i++) {
		let line = lines[i];
		if (line.startsWith('### ')) {
			flushSection();
			const id = Number(line.match(/^### (\d+)\./)[1]);
			currentSection = id;
			inPerImage = true;
		} else if (line.startsWith('## ')) {
			flushSection();
			inPerImage = line.startsWith('## Per-image');
			inTable = line.startsWith('## Confirmed') ? 'confirmed' : line.startsWith('## Lower-priority') ? 'candidates' : null;
		}
		if (inTable && line.startsWith('| ID')) line = extraCols(line, ['Jev tier', 'Jev overall (0-100)', 'Jev standalone / in place', 'Jev main problem']);
		else if (inTable && line.startsWith('| ---')) line = extraCols(line, ['---', '---', '---', '---']);
		else if (inTable && /^\| \d+ /.test(line)) line = extraCols(line, jevCells(Number(line.match(/^\| (\d+)/)[1])));
		else if (/^\d\. /.test(line) && lines[i - 2]?.startsWith('## Highest priority') || (/^\d\. /.test(line) && /^\d\. /.test(lines[i - 1] ?? ''))) {
			const ids = { 1: [6], 2: [2, 22], 3: [3], 4: [54], 5: [58] }[Number(line[0])];
			line += ' — *Jev:* ' + ids.map((id) => `#${id} ${byId[id].overall.tier}, overall ${int(byId[id].overall.composite)}, rank ${rank[id]} of 61`).join('; ') + '.';
		} else if (/^- /.test(line) && !inPerImage) line = bulletFacts(line);
		out.push(line);
	}
	flushSection();
	let text = out.join('\n');

	// top matter
	const flaggedIds = new Set(manifest.map((m) => m.id));
	const unflagged = ranked.filter((r) => !flaggedIds.has(r.id));
	const intro = `> **Second pass added 2026-09-29.** Every image evaluation below now has a Jev (TypeSafe System One) evaluation beside it. First-pass text is unchanged. Method, all 61 scores and caveats: [jev-review/REPORT.md](../jev-review/REPORT.md). **How accurate was the first pass? ${Math.round(acc.jev.total)}/100** (range ${Math.round(acc.jev.total)}–${Math.round(acc.consensus.total)} against a blind pixel-grader check).
>
> How to read the new columns: *Jev tier* = **Issue** (the Jev classifier says severe and the Jev scorer flags a dimension), **Watch** (one of the two flags it, or classifier says moderate), **Clean** (neither). *Overall (0-100)* = mean of the standalone score (image on its own) and the in-place score (every place it sits on the page, half mean, half worst view); higher is better; 50 is "acceptable" on the rubric. The first pass gave priority tiers only, no numeric scores.

`;
	text = text.replace('# Portfolio image review\n\n', '# Portfolio image review\n\n' + intro);

	const tbl = (rows) => rows.join('\n');
	const extra = [
		'',
		'## Second pass: images the first pass did not flag',
		'',
		`The first pass flagged 22 of 61 assets. Jev rates ${unflagged.filter((r) => r.overall.tier === 'Issue').length} of the other 39 as **Issue**, ${unflagged.filter((r) => r.overall.tier === 'Watch').length} as Watch, ${unflagged.filter((r) => r.overall.tier === 'Clean').length} as Clean. Where blind pixel graders also looked, their grade is shown; on the ${unflagged.filter((r) => r.overall.tier === 'Issue' && adj[r.id]).length} unflagged Jev-Issue assets they graded, ${unflagged.filter((r) => r.overall.tier === 'Issue' && adj[r.id] && Math.max(SEV[adj[r.id].standalone], SEV[adj[r.id].in_place]) <= 1).length} came out minor/none, so treat the Issue rows as "look here first", not as confirmed defects. See REPORT.md.`,
		'',
		'| ID | Project / file | Jev tier | Overall | Standalone / in place | Jev main problem | Jev fix kind | Blind pixel grade (standalone / in place) |',
		'| --- | --- | --- | --- | --- | --- | --- | --- |',
		...unflagged.map((r) => {
			const a = adj[r.id];
			const file = r.file.replace('reference-assets/', '');
			return `| ${r.id} | ${r.project ?? '—'}: [${file}](../${r.file}) | **${r.overall.tier}** | ${int(r.overall.composite)} | ${int(r.standalone.composite)} / ${int(r.inplace.composite)} | ${r.standalone.primary_issue.label.replaceAll('_', ' ')} | ${r.standalone.remedy.label} | ${a ? `${a.standalone} / ${a.in_place}` : 'not graded'} |`;
		}),
		'',
	];
	text = text.replace(/\n(The parent audit folder retains)/, '\n' + extra.join('\n') + '\n$1');
	return text;
}

// ---------------- CSV ----------------
function parseCsv(s) {
	const rows = [];
	let row = [], f = '', q = false;
	for (let i = 0; i < s.length; i++) {
		const c = s[i];
		if (q) {
			if (c === '"' && s[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c;
		} else if (c === '"') q = true;
		else if (c === ',') { row.push(f); f = ''; }
		else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
		else if (c !== '\r') f += c;
	}
	if (f !== '' || row.length) { row.push(f); rows.push(row); }
	return rows;
}
const csvq = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;

const SECOND_COLS = ['jev_tier', 'jev_overall_0_100', 'jev_standalone_0_100', 'jev_in_place_0_100', 'jev_standalone_severity', 'jev_in_place_severity', 'jev_main_problem', 'jev_fix_kind_standalone', 'jev_fix_kind_in_place', 'jev_weakest_dimension', 'jev_reads_first_pass_fix_as', 'jev_fact_check', 'blind_pixel_grade', 'first_pass_vs_jev'];
function secondCells(id) {
	const r = byId[id];
	const m = mById[id];
	const cs = claimSummary(id);
	const a = adj[id];
	return [
		r.overall.tier,
		int(r.overall.composite),
		int(r.standalone.composite),
		int(r.inplace.composite),
		`${r.standalone.severity.label}${r.standalone.severity.decision === 'reject' ? ' (too uncertain)' : ''}`,
		inplaceSev(r),
		r.standalone.primary_issue.label,
		r.standalone.remedy.label,
		r.inplace.dominant_remedy ?? 'none',
		`${r.standalone.min_dim.dim} ${int((r.standalone.min_dim.level / 4) * 100)}`,
		m ? recKind[id].choice : '',
		claimText(cs),
		a ? `standalone ${a.standalone}; in place ${a.in_place}` : '',
		agreement(m, r),
	];
}
function buildCsv() {
	const rows = parseCsv(base('flagged-downloads/findings.csv'));
	const head = rows[0];
	const idIdx = head.indexOf('id');
	const out = [[...head, ...SECOND_COLS]];
	for (const row of rows.slice(1)) out.push([...row, ...secondCells(Number(row[idIdx]))]);
	return out.map((r) => r.map(csvq).join(',')).join('\n') + '\n';
}
function buildAllCsv() {
	const cols = ['id', 'project', 'file', 'native_px', 'first_pass_group', 'first_pass_priority', 'first_pass_issue', ...SECOND_COLS, 'jev_rank_of_61_worst_first'];
	const lines = [cols.map(csvq).join(',')];
	for (const r of results) {
		const m = mById[r.id];
		lines.push([r.id, r.project ?? '', r.file, `${r.native.w}x${r.native.h}`, m ? m.group : 'unflagged', m ? m.priority : '', m ? m.issue : '', ...secondCells(r.id), rank[r.id]].map(csvq).join(','));
	}
	return lines.join('\n') + '\n';
}

// ---------------- manifest ----------------
function buildManifest() {
	return (
		JSON.stringify(
			manifest.map((m) => {
				const r = byId[m.id];
				const a = adj[m.id];
				const w = worstView(r);
				return {
					...m,
					second_pass: {
						engine: 'jev-1.13.0 (TypeSafe System One), 2026-09-29',
						tier: r.overall.tier,
						overall_0_100: r.overall.composite,
						standalone_0_100: r.standalone.composite,
						in_place_0_100: r.inplace.composite,
						rank_of_61_worst_first: rank[m.id],
						standalone_severity: r.standalone.severity,
						main_problem: r.standalone.primary_issue,
						fix_kind_standalone: r.standalone.remedy,
						fix_kind_in_place: r.inplace.dominant_remedy,
						first_pass_recommendation_read_as: { label: recKind[m.id].choice, confidence: recKind[m.id].confidence },
						weakest_dimension: r.standalone.min_dim,
						worst_in_place_view: { file: w.file, page: w.page, viewport: w.viewport, composite: w.composite, severity: w.severity },
						fact_check: claimSummary(m.id),
						blind_pixel_grade: a ? { standalone: a.standalone, in_place: a.in_place, evidence: a.evidence } : null,
						agreement: agreement(m, r),
					},
				};
			}),
			null,
			2,
		) + '\n'
	);
}

// ---------------- COVERAGE ----------------
function buildCoverage() {
	const md = base('COVERAGE.md');
	const facts = J('facts.json');
	const vpOf = { '1440': 'desktop', '1920': 'wide', '768': 'tablet', '390': 'mobile', '320': 'small-mobile' };
	const lines = md.split('\n');
	const out = [];
	let cols = null;
	for (const line of lines) {
		if (line.startsWith('| Page')) {
			cols = line.split('|').slice(1, -1).map((c) => c.trim());
			out.push(line);
			continue;
		}
		if (cols && /^\| \S/.test(line) && !line.startsWith('| ---')) {
			const cells = line.split('|').slice(1, -1).map((c) => c.trim());
			const slug = cells[0] === 'home' ? 'home' : cells[0].replace(/\/$/, '').replace('/', '--');
			const next = cells.map((c, i) => {
				if (i === 0) return c;
				const vp = vpOf[cols[i]];
				const views = results.flatMap((r) => r.inplace.views.filter((v) => v.page === slug && v.viewport === vp));
				if (views.length) {
					const w = views.reduce((a, b) => (b.composite < a.composite ? b : a));
					return `${c} · Jev: ${views.length} in-place views, worst ${int(w.composite)}/100 (${w.severity.decision === 'reject' ? 'severity too uncertain' : w.severity.label})`;
				}
				const measured = facts.filter((f) => f.placements.some((p) => p.page === slug && p.viewport === vp)).length;
				return measured ? `${c} · Jev: ${measured} images measured, not re-viewed` : `${c} · Jev: no visible photo measured`;
			});
			out.push('| ' + next.join(' | ') + ' |');
			continue;
		}
		if (line.startsWith('| ---')) {
			out.push(line);
			continue;
		}
		out.push(line);
	}
	let text = out.join('\n').replace(/\s+$/, '\n');
	text += `
## Second pass (Jev) coverage, added 2026-09-29

- Every cell above keeps the first pass's "Reviewed" and adds what the second pass did at that page and size.
- **In-place views** (desktop 1440 and mobile 390 only): 146 element screenshots of the 61 assets where they sit on the live site (up to two placements per asset per viewport: the primary one and the most-cropped one), each described blind by a vision agent and scored by Jev (five in-place scores plus severity and fix-kind classifiers). "worst NN/100" is the lowest in-place composite among those views on that page; 50 is "acceptable" on the rubric.
- **Measured, not re-viewed**: 1920, 768 and 320 wide were re-measured from \`inventory.json\` (rendered size, fit, crop loss, file actually loaded) for all 61 assets, but no new pixels were viewed at those sizes. That is a coverage gap versus the first pass's "Reviewed".
- "no visible photo measured": the inventory recorded no visible image from the 61 assets on that page at that size (the portrait on About, Experience and Capabilities was hidden, 0x0, in the recorded pass).
- Details: [jev-review/REPORT.md](jev-review/REPORT.md).
`;
	return text;
}

fs.writeFileSync(path.join(audit, 'flagged-downloads/README.md'), buildReadme());
fs.writeFileSync(path.join(audit, 'flagged-downloads/findings.csv'), buildCsv());
fs.writeFileSync(path.join(audit, 'flagged-downloads/manifest.json'), buildManifest());
fs.writeFileSync(path.join(audit, 'COVERAGE.md'), buildCoverage());
fs.writeFileSync(path.join(audit, 'all-assets-side-by-side.csv'), buildAllCsv());
console.log('reports written');
