// Combine Jev standalone outputs into results.json (standalone only; policy in code, as in the main repo's compose.mjs).
// Run: node compose.mjs
import fs from 'node:fs';
import path from 'node:path';
import { WEIGHTS_STANDALONE, weighted } from './rubric.mjs';

const dir = import.meta.dirname;
const J = (p) => JSON.parse(fs.readFileSync(path.join(dir, p), 'utf8'));
const pad = (n) => String(n).padStart(2, '0');

// Same policy as the current-site review: a dimension flags when its expected level < 1.5; the classifier flags on
// moderate/severe unless Jev itself rejects the answer (decision 'reject'); Issue = classifier severe AND scorer flag.
export const FLAG_LEVEL = 1.5;
const SEVERE_CLASSES = new Set(['moderate', 'severe']);
const usable = (sev) => (sev.decision === 'reject' ? null : sev.choice);
const tier = (scorerFlag, label) =>
  label === 'severe' && scorerFlag
    ? 'Issue'
    : scorerFlag || SEVERE_CLASSES.has(label)
      ? 'Watch'
      : 'Clean';

function dims(answers, ids) {
  const out = {};
  for (const id of ids) {
    const a = answers[id];
    out[id] = {
      level: a.score,
      score100: Math.round((a.score / 4) * 1000) / 10,
      confidence: a.confidence,
    };
  }
  return out;
}

const facts = J('facts.json');
const results = facts.map((f) => {
  const s = J(`jev/standalone/${pad(f.id)}.json`);
  const d = dims(s.answers, s.scoreIds);
  const composite = weighted(
    Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.score100])),
    WEIGHTS_STANDALONE,
  );
  const min = Object.entries(d).reduce(
    (b, [k, v]) => (!b || v.level < b.level ? { dim: k, level: v.level } : b),
    null,
  );
  const scorerFlag = min.level < FLAG_LEVEL;
  return {
    id: f.id,
    file: f.file,
    original: f.original,
    project: f.project,
    native: f.native,
    animated: f.animated,
    referenced_by: f.referenced_by,
    composite,
    dims: d,
    min_dim: min,
    severity: {
      label: s.severity.choice,
      confidence: s.severity.confidence,
      decision: s.severity.decision,
    },
    remedy: {
      label: s.remedy.choice,
      confidence: s.remedy.confidence,
      decision: s.remedy.decision,
    },
    primary_issue: {
      label: s.answers.primary_issue.choice,
      confidence: s.answers.primary_issue.confidence,
    },
    p_defective_at_a_glance: s.answers.is_defective_for_showcase.noul,
    p_fixable_by_gentle_ai_touchup: s.answers.fixable_by_gentle_ai_touchup.noul,
    p_needs_new_capture_or_recrop: s.answers.needs_new_capture_or_recrop.noul,
    scorer_flag: scorerFlag,
    classifier_flag: SEVERE_CLASSES.has(usable(s.severity)),
    tier: tier(scorerFlag, usable(s.severity)),
  };
});
fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify(results, null, 1));
const t = {};
for (const r of results) t[r.tier] = (t[r.tier] || 0) + 1;
console.log('assets', results.length, 'tiers', t);
