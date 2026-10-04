// Combine Jev outputs into per-asset second-pass results (results.json).
// Policy lives here, in code (docs: composite-scoring, confidence-routing). Run: node audit-photos/jev-review/compose.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WEIGHTS_STANDALONE, WEIGHTS_INPLACE, to100, weighted } from './rubric.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const J = (p) => JSON.parse(fs.readFileSync(path.join(dir, p), 'utf8'));
const pad = (n) => String(n).padStart(2, '0');

// A dimension "flags" when its expected level rounds to level 0 or 1, i.e. the two weakest rubric anchors
// (level 2 is worded "acceptable/adequate" in every rubric). Threshold = midpoint between levels 1 and 2.
export const FLAG_LEVEL = 1.5;
// Classifier flag = severity 'moderate' or 'severe' ("a careful visitor would notice"). Tier (current mapping; revised twice, see below):
//   Issue = classifier says 'severe' AND the scorer flags a dimension in the same context (the two Jev instruments
//           agree on a serious problem; closest analogue of the first pass's confirmed high/medium findings)
//   Watch = classifier moderate/severe or scorer flag, but not the two together (analogue of 'review candidates')
//   Clean = neither flags
// History (the accuracy component weights were fixed before scoring; this tier rule was NOT): v4a tried
// Issue = classifier>=moderate AND scorer flag (reported 48 of 61 Issue; the v4a answers were not kept, the same rule on the
// final data gives 49), which was raised to 'severe' (28) and then given a confidence gate (24) after inspecting asset #13.
// The blind pixel-grader check was added afterwards because Jev alone over-flagged against pixels (asset #13).
const SEVERE_CLASSES = new Set(['moderate', 'severe']);

const r1 = (x) => Math.round(x * 10) / 10;

function dims(answers, ids) {
	const out = {};
	for (const id of ids) {
		const a = answers[id];
		out[id] = { level: a.score, score100: to100(a.score), confidence: a.confidence };
	}
	return out;
}
function minDim(d) {
	let best = null;
	for (const [k, v] of Object.entries(d)) if (!best || v.level < best.level) best = { dim: k, level: v.level, confidence: v.confidence };
	return best;
}
// Confidence gate (docs: confidence-routing): a classifier answer Jev itself marks decision='reject' (too uncertain,
// confidence below ~0.4) is not acted on, so it contributes no flag. Added after asset 13 (a fine ant render whose
// limbs run off the frame) came back severity 'moderate' at confidence 0.38.
const usable = (sev) => (sev.decision === 'reject' ? null : sev.choice);
function tier(scorerFlag, severityLabel) {
	if (severityLabel === 'severe' && scorerFlag) return 'Issue';
	return scorerFlag || SEVERE_CLASSES.has(severityLabel) ? 'Watch' : 'Clean';
}
const TIER_RANK = { Clean: 0, Watch: 1, Issue: 2 };
const maxTier = (a, b) => (TIER_RANK[a] >= TIER_RANK[b] ? a : b);

export function compose() {
	const facts = J('facts.json');
	const results = [];
	for (const f of facts) {
		const id = f.id;
		const s = J(`jev/standalone/${pad(id)}.json`);
		const ip = J(`jev/inplace/${pad(id)}.json`);
		const sd = dims(s.answers, s.scoreIds);
		const S = weighted(Object.fromEntries(Object.entries(sd).map(([k, v]) => [k, v.score100])), WEIGHTS_STANDALONE);
		const sMin = minDim(sd);
		const sScorerFlag = sMin.level < FLAG_LEVEL;
		const sClsFlag = SEVERE_CLASSES.has(usable(s.severity));
		const standalone = {
			composite: S,
			dims: sd,
			min_dim: sMin,
			severity: { label: s.severity.choice, confidence: s.severity.confidence, decision: s.severity.decision },
			remedy: { label: s.remedy.choice, confidence: s.remedy.confidence, decision: s.remedy.decision },
			primary_issue: { label: s.answers.primary_issue.choice, confidence: s.answers.primary_issue.confidence },
			p_defective_at_a_glance: s.answers.is_defective_for_showcase.noul,
			p_fixable_by_gentle_ai_touchup: s.answers.fixable_by_gentle_ai_touchup.noul,
			p_needs_new_capture_or_recrop: s.answers.needs_new_capture_or_recrop.noul,
			scorer_flag: sScorerFlag,
			classifier_flag: sClsFlag,
			tier: tier(sScorerFlag, usable(s.severity)),
		};
		const views = ip.views.map((v) => {
			const d = dims(v.answers, v.scoreIds);
			const P = weighted(Object.fromEntries(Object.entries(d).map(([k, x]) => [k, x.score100])), WEIGHTS_INPLACE);
			const m = minDim(d);
			const scorerFlag = m.level < FLAG_LEVEL;
			const clsFlag = SEVERE_CLASSES.has(usable(v.severity));
			return {
				file: v.file,
				page: v.page,
				viewport: v.viewport,
				role: v.role,
				composite: P,
				dims: d,
				min_dim: m,
				severity: { label: v.severity.choice, confidence: v.severity.confidence, decision: v.severity.decision },
				remedy: { label: v.remedy.choice, confidence: v.remedy.confidence, decision: v.remedy.decision },
				p_defective_here: v.answers.is_defective_here.noul,
				p_page_layout_is_the_cause: v.answers.page_layout_is_the_cause.noul,
				scorer_flag: scorerFlag,
				classifier_flag: clsFlag,
				tier: tier(scorerFlag, usable(v.severity)),
			};
		});
		const comps = views.map((v) => v.composite);
		const Pmean = r1(comps.reduce((a, b) => a + b, 0) / comps.length);
		const worst = views.reduce((a, b) => (b.composite < a.composite ? b : a));
		const Pmin = worst.composite;
		const P = r1(0.5 * Pmean + 0.5 * Pmin);
		const inplace = {
			composite: P,
			mean_view: Pmean,
			worst_view: Pmin,
			worst_view_file: worst.file,
			worst_view_page: `${worst.page} @ ${worst.viewport}`,
			views_total: views.length,
			views_flagged_issue: views.filter((v) => v.tier === 'Issue').length,
			tier: views.reduce((t, v) => maxTier(t, v.tier), 'Clean'),
			views,
		};
		// dominant in-place remedy among views tiered Issue/Watch (mode), else null
		const cnt = {};
		for (const v of views.filter((v) => v.tier !== 'Clean')) cnt[v.remedy.label] = (cnt[v.remedy.label] || 0) + 1;
		inplace.dominant_remedy = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
		const overall = r1(0.5 * S + 0.5 * P);
		results.push({
			id,
			file: f.file,
			project: f.project,
			native: f.native,
			overall: { composite: overall, tier: maxTier(standalone.tier, inplace.tier) },
			standalone,
			inplace,
		});
	}
	return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const res = compose();
	fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify(res, null, 1));
	const t = {};
	for (const r of res) t[r.overall.tier] = (t[r.overall.tier] || 0) + 1;
	console.log('assets', res.length, 'overall tiers', t);
}
