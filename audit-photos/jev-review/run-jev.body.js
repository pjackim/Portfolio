// Body of an async function (params: tool, R, fs, MODE). Run through the eval helper; see README in REPORT.md.
// MODE: 'standalone' | 'inplace'. Writes jev/<MODE>/<NN>.json (state + raw answers). Idempotent per asset.
const base = 'C:/Users/m0rt/projects/Portfolio/audit-photos/jev-review/';
fs.mkdirSync(base + 'jev/' + MODE, { recursive: true });
const facts = JSON.parse(fs.readFileSync(base + 'facts.json', 'utf8'));
const pad = (n) => String(n).padStart(2, '0');
const usage = { in: 0, out: 0, cost: 0, req: 0 };
const errs = [];
const note = (x) => {
	const u = x.details.usage;
	usage.in += u.inputTokens;
	usage.out += u.outputTokens;
	usage.cost += u.costUsd;
	usage.req += u.requests;
};
async function call(fn, args, tag) {
	const r = await fn(args);
	if (r.hasError) {
		errs.push([tag, (r.text || '').slice(0, 200)]);
		return null;
	}
	note(r);
	return r.details;
}
async function pool(items, n, fn) {
	let i = 0;
	await Promise.all(
		Array.from({ length: n }, async () => {
			while (i < items.length) await fn(items[i++]);
		}),
	);
}

async function judge(b, sevInstr, remInstr, remOpts, tag) {
	const [a, sev, rem] = await Promise.all([
		call(tool.jev_ask, { state: b.state, questions: b.questions }, tag + ':ask'),
		call(tool.jev_classify, { text: b.lean, options: R.SEVERITY_OPTIONS, instructions: sevInstr }, tag + ':severity'),
		call(tool.jev_classify, { text: b.lean, options: remOpts, instructions: remInstr }, tag + ':remedy'),
	]);
	if (!a || !sev || !rem) return null;
	return { model: a.model, scoreIds: b.scoreIds, answers: a.result.answers, severity: sev.result, remedy: rem.result };
}

await pool(facts, 6, async (f) => {
	if (MODE === 'standalone') {
		const obs = JSON.parse(fs.readFileSync(base + `observations/standalone/${pad(f.id)}.json`, 'utf8'));
		const b = R.buildStandalone(f, obs);
		const j = await judge(b, R.SEVERITY_INSTRUCTIONS_STANDALONE, R.REMEDY_INSTRUCTIONS_STANDALONE, R.REMEDY_OPTIONS_STANDALONE, `S${f.id}`);
		if (j) fs.writeFileSync(base + `jev/standalone/${pad(f.id)}.json`, JSON.stringify({ id: f.id, state: b.state, ...j }, null, 1));
	} else {
		const sobs = JSON.parse(fs.readFileSync(base + `observations/standalone/${pad(f.id)}.json`, 'utf8'));
		const obs = JSON.parse(fs.readFileSync(base + `observations/inplace/${pad(f.id)}.json`, 'utf8'));
		const views = [];
		for (const v of obs.views) {
			const cap = v.file.split('/').pop();
			const p = f.placements.find((x) => x.capture === cap);
			if (!p) {
				errs.push([`I${f.id}`, 'no placement for ' + v.file]);
				continue;
			}
			const b = R.buildInPlace(f, p, v, sobs);
			const j = await judge(b, R.SEVERITY_INSTRUCTIONS_INPLACE, R.REMEDY_INSTRUCTIONS_INPLACE, R.REMEDY_OPTIONS_INPLACE, `I${f.id}:${cap}`);
			if (j) views.push({ file: v.file, page: p.page, viewport: p.viewport, role: p.role, state: b.state, ...j });
		}
		fs.writeFileSync(base + `jev/inplace/${pad(f.id)}.json`, JSON.stringify({ id: f.id, views }, null, 1));
	}
});
return { done: fs.readdirSync(base + 'jev/' + MODE).length, errs, usage };
