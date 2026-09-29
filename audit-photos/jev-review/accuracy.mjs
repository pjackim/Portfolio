// How accurate was the first pass? One 0-100 number; the component weights were fixed before scoring (the Jev tier rule, by contrast, was revised twice, see REPORT.md).
//   claims      30  fidelity of the first pass's stated facts (numeric+process checked by code, semantic by jev_verify)
//                   claims = 0.30 numeric + 0.10 process + 0.60 semantic (semantic weighted most: numeric/process
//                   claims are mostly restated measurements from the same browser tool)
//   overlap@22  20  first pass flagged 22 files; overlap with the 22 lowest Jev overall scores
//   precision   15  of the 22 flagged: Jev Issue = 1, Watch = 0.5, Clean = 0
//   recall      15  of Jev's Issue-tier assets: share the first pass flagged
//   ranking     20  Spearman rho between first-pass ordinal (high3 medium2 candidate1 unflagged0) and Jev severity
//                   (negative overall score); max(0, rho), so "no better than chance" scores 0, not 50
// Reference = Jev (as asked). Sensitivity = "consensus" reference where the blind pixel adjudication
// (adjudication/*.json, 36 assets chosen because first pass and Jev disagreed, plus controls) can veto Jev.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const J = (p) => JSON.parse(fs.readFileSync(path.join(dir, p), 'utf8'));
export const WEIGHTS = { claims: 30, overlap22: 20, precision: 15, recall: 15, ranking: 20 };
const SEV = { none: 0, minor: 1, moderate: 2, severe: 3 };

function ranks(xs) {
	const idx = xs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
	const r = Array(xs.length);
	for (let i = 0; i < idx.length; ) {
		let j = i;
		while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
		const avg = (i + j) / 2 + 1;
		for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
		i = j + 1;
	}
	return r;
}
function pearson(a, b) {
	const n = a.length;
	const ma = a.reduce((x, y) => x + y, 0) / n;
	const mb = b.reduce((x, y) => x + y, 0) / n;
	let num = 0, da = 0, db = 0;
	for (let i = 0; i < n; i++) {
		num += (a[i] - ma) * (b[i] - mb);
		da += (a[i] - ma) ** 2;
		db += (b[i] - mb) ** 2;
	}
	return num / Math.sqrt(da * db);
}
const spearman = (a, b) => pearson(ranks(a), ranks(b));

export function firstPass() {
	const man = J('../flagged-downloads/manifest.json');
	const ord = {};
	const flagged = new Set();
	for (const m of man) {
		flagged.add(m.id);
		ord[m.id] = m.group === 'confirmed' ? (m.priority === 'high' ? 3 : 2) : 1;
	}
	return { man, flagged, ord };
}

export function claimsScore() {
	const claims = J('claims.json');
	const rate = (kind) => {
		const cs = claims.filter((c) => c.kind === kind && c.verdict && c.verdict !== 'cannot-check');
		return { n: cs.length, holds: cs.filter((c) => c.verdict === 'holds').length };
	};
	const numeric = rate('numeric');
	const process_ = rate('process');
	const ver = J('jev/claims-verify.json').filter((v) => v.raw);
	const ps = ver.flatMap((v) => v.raw.claims.map((c) => c.p));
	const reads = ver.flatMap((v) => v.raw.claims.map((c) => c.read));
	const semantic = {
		n: ps.length,
		mean_p: ps.reduce((a, b) => a + b, 0) / ps.length,
		yes: reads.filter((r) => r === 'yes').length,
		uncertain: reads.filter((r) => r === 'uncertain').length,
		no: reads.filter((r) => r === 'no').length,
	};
	const value = 0.3 * (numeric.holds / numeric.n) + 0.1 * (process_.holds / process_.n) + 0.6 * semantic.mean_p;
	return { numeric, process: process_, semantic, value };
}

export function score(tierOf, compositeOf, ids) {
	const { flagged, ord } = firstPass();
	const tiers = Object.fromEntries(ids.map((id) => [id, tierOf(id)]));
	const worst22 = new Set([...ids].sort((a, b) => compositeOf(a) - compositeOf(b)).slice(0, 22));
	const overlap = [...flagged].filter((id) => worst22.has(id)).length;
	const flaggedArr = [...flagged];
	const precision = flaggedArr.reduce((s, id) => s + (tiers[id] === 'Issue' ? 1 : tiers[id] === 'Watch' ? 0.5 : 0), 0) / flaggedArr.length;
	const issue = ids.filter((id) => tiers[id] === 'Issue');
	const recall = issue.filter((id) => flagged.has(id)).length / issue.length;
	const rho = spearman(ids.map((id) => ord[id] ?? 0), ids.map((id) => -compositeOf(id)));
	return {
		overlap22: { n: overlap, of: 22, value: overlap / 22 },
		precision: { value: precision },
		recall: { n: issue.filter((id) => flagged.has(id)).length, of: issue.length, value: recall },
		ranking: { rho, value: Math.max(0, rho) },
		issueCount: issue.length,
	};
}

export function run() {
	const res = J('results.json');
	const ids = res.map((r) => r.id);
	const byId = Object.fromEntries(res.map((r) => [r.id, r]));
	const adj = {};
	for (const f of fs.readdirSync(path.join(dir, 'adjudication'))) {
		const a = J('adjudication/' + f);
		adj[a.id] = a;
	}
	const claims = claimsScore();
	const jevRef = score((id) => byId[id].overall.tier, (id) => byId[id].overall.composite, ids);
	const total = (s) =>
		WEIGHTS.claims * claims.value + WEIGHTS.overlap22 * s.overlap22.value + WEIGHTS.precision * s.precision.value + WEIGHTS.recall * s.recall.value + WEIGHTS.ranking * s.ranking.value;
	// consensus: blind pixel graders may veto Jev on assets they graded
	const consensusTier = (id) => {
		const t = byId[id].overall.tier;
		const a = adj[id];
		if (!a) return t;
		const worst = Math.max(SEV[a.standalone], SEV[a.in_place]);
		if (t === 'Issue') return worst >= 2 ? 'Issue' : 'Watch';
		if (t === 'Watch') return worst <= 1 ? 'Clean' : 'Watch';
		return t;
	};
	// composite for consensus ranking: pull an asset's score toward the graders' verdict (mean of Jev overall and grader-implied score)
	const graderScore = (a) => 100 - (Math.max(SEV[a.standalone], SEV[a.in_place]) / 3) * 100 * 0.6 - 20; // none=80, minor=60, moderate=40, severe=20
	const consensusComposite = (id) => (adj[id] ? (byId[id].overall.composite + graderScore(adj[id])) / 2 : byId[id].overall.composite);
	const consRef = score(consensusTier, consensusComposite, ids);
	return { claims, weights: WEIGHTS, jev: { ...jevRef, total: total(jevRef) }, consensus: { ...consRef, total: total(consRef) }, adjudicated: Object.keys(adj).length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const out = run();
	fs.writeFileSync(path.join(dir, 'accuracy.json'), JSON.stringify(out, null, 1));
	console.log(JSON.stringify(out, null, 1));
}
