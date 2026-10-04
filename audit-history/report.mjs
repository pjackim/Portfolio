// Writes REPORT.md from results.json + observations. Run: node report.mjs
import fs from 'node:fs';
const R = JSON.parse(fs.readFileSync('results.json', 'utf8'));
const obs = (id) =>
  JSON.parse(
    fs.readFileSync(`observations/standalone/${String(id).padStart(2, '0')}.json`, 'utf8'),
  );
const mean = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
const cnt = (arr) => arr.reduce((m, k) => ((m[k] = (m[k] || 0) + 1), m), {});
const name = (r) => r.original.replace(/^Images\//, '');
const dimsTxt = (r) =>
  Object.entries(r.dims)
    .filter(([, v]) => v.level < 1.5)
    .map(([k]) => k.replaceAll('_', ' '))
    .join(', ') || '-';
const tiers = cnt(R.map((r) => r.tier));

let o = `# Old-snapshot image review (Jev)\n\n`;
o += `Snapshot: commit \`60c6578\` (2024-02-08), the last commit on or before 2026-01-29 (8 months before 2026-09-29; history has no commits between 2024-02-08 and 2026-09-25). Static HTML/Bootstrap site; ${R.length} showcase images under \`Images/\` plus \`img/team/1.jpg\` (UI chrome excluded).\n\n`;
o += `Same method as the current-site second pass (\`audit-photos/jev-review\`), **standalone half only**: code-measured facts (\`facts.mjs\`, thresholds unchanged) -> blind vision-agent observation (\`observations/standalone/\`) -> Jev score/choice/noul answers + severity and remedy classifiers (\`jev/standalone/\`) -> \`compose.mjs\` (same weights, flag level 1.5, tier rules). **No in-place views**: the 2024 site was not served or captured, so nothing here says how an image looked on a page. GIFs are judged on frame 1 only. Observers could not open assets 22 and 66 (over 20 MB) at native size and described downscaled copies; their sharpness statements are correspondingly weak.\n\n`;
o += `## Summary\n\n- Tiers: **${tiers.Issue ?? 0} Issue**, ${tiers.Watch ?? 0} Watch, ${tiers.Clean ?? 0} Clean of ${R.length}. Mean composite ${mean(R.map((r) => r.composite))}/100 (50 = "acceptable" on the rubric).\n`;
o += `- Comparison, current site's standalone half (same rubric and rules, 61 different assets, \`../../../../audit-photos/jev-review/results.json\` in the main checkout): 16 Issue / 36 Watch / 9 Clean, mean 63.9. Different asset sets and no in-place half here, so read this as context, not a regression measure.\n`;
o += `- Jev severity: ${JSON.stringify(cnt(R.map((r) => r.severity.label)))}; primary issue: ${JSON.stringify(cnt(R.map((r) => r.primary_issue.label)))}.\n`;
o += `- Remedy among Issue/Watch: ${JSON.stringify(cnt(R.filter((r) => r.tier !== 'Clean').map((r) => r.remedy.label)))}.\n\n`;

o += `## Per-project rollup\n\n| Project | Images | Mean | Worst | Issue | Watch | Clean |\n|---|---|---|---|---|---|---|\n`;
const projects = [...new Set(R.map((r) => r.project))];
for (const p of projects.sort()) {
  const rs = R.filter((r) => r.project === p);
  const t = cnt(rs.map((r) => r.tier));
  const w = rs.reduce((a, b) => (b.composite < a.composite ? b : a));
  o += `| ${p} | ${rs.length} | ${mean(rs.map((r) => r.composite))} | ${w.composite} (#${w.id}) | ${t.Issue ?? 0} | ${t.Watch ?? 0} | ${t.Clean ?? 0} |\n`;
}

o += `\n## Issue tier (Jev classifier says severe AND the scorer flags a dimension)\n\n| # | File | Pixels | Overall | Flagged dimensions | Primary issue | Remedy | What the blind observer saw |\n|---|---|---|---|---|---|---|---|\n`;
for (const r of R.filter((x) => x.tier === 'Issue').sort((a, b) => a.composite - b.composite)) {
  const ob = obs(r.id);
  o += `| ${r.id} | ${name(r)} | ${r.native.w}x${r.native.h} | ${r.composite} | ${dimsTxt(r)} | ${r.primary_issue.label} | ${r.remedy.label} | ${ob.composition.replaceAll('|', '/')} |\n`;
}

o += `\n## Watch tier\n\n| # | File | Pixels | Overall | Severity | Flagged dimensions | Primary issue | Remedy |\n|---|---|---|---|---|---|---|---|\n`;
for (const r of R.filter((x) => x.tier === 'Watch').sort((a, b) => a.composite - b.composite))
  o += `| ${r.id} | ${name(r)} | ${r.native.w}x${r.native.h} | ${r.composite} | ${r.severity.label} | ${dimsTxt(r)} | ${r.primary_issue.label} | ${r.remedy.label} |\n`;

o += `\n## Clean\n\n`;
o +=
  R.filter((x) => x.tier === 'Clean')
    .sort((a, b) => b.composite - a.composite)
    .map((r) => `${r.id} ${name(r)} (${r.composite})`)
    .join('; ') + '\n';

o += `\n## Caveats\n\n- Scores are Jev's literal read of a vision agent's description plus measured buckets; they rank assets, they do not prove a defect.\n- Assets referenced by no HTML page: ${
  R.filter((r) => !r.referenced_by.length)
    .map((r) => `#${r.id}`)
    .join(', ') || 'none'
}.\n- Reproduce (from this folder): \`node assets.mjs && node facts.mjs\`, observation agents, Jev run (eval body in the session, mirrors \`run-jev.body.js\`), \`node compose.mjs && node report.mjs\`.\n`;
fs.writeFileSync('REPORT.md', o);
console.log('wrote REPORT.md', o.length);
