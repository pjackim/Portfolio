// Jev question set for the second-pass photo review.
//
// Design (docs.typesafe.ai: composite-scoring, jaggedness, choice, score, verify):
//  - Code measures (facts.json) and vision agents describe (observations/*.json); Jev only judges.
//  - Jev is literal and cannot do arithmetic, so numbers become words here (size classes, buckets,
//    "hides 73% of the image") before they reach the model.
//  - One small state per call; one narrow judgment per question; independent questions share a call.
//  - Score levels are concrete, stand-alone situations (0 = worst ... 4 = best), mapped to 0-100 in code.
//  - Policy (weights, verdict mapping) lives in code, not in the model.

export const WEIGHTS_STANDALONE = {
	resolution_headroom: 0.15,
	text_legibility: 0.15,
	subject_clarity: 0.15,
	framing: 0.15,
	contrast_exposure: 0.1,
	artifact_cleanliness: 0.15,
	scan_first_impact: 0.15,
};

export const WEIGHTS_INPLACE = {
	text_legibility_here: 0.25,
	crop_framing_here: 0.25,
	resolution_here: 0.2,
	overlay_intrusion: 0.1,
	glance_here: 0.2,
};

/** Model level (0..4, fractional) -> 0..100. */
export const to100 = (score) => Math.round((score / 4) * 1000) / 10;

export function weighted(scores100, weights) {
	let sum = 0;
	let w = 0;
	for (const [k, wt] of Object.entries(weights)) {
		if (typeof scores100[k] === 'number') {
			sum += scores100[k] * wt;
			w += wt;
		}
	}
	return w ? Math.round((sum / w) * 10) / 10 : null;
}

const ORDER = (a) => a; // levels are written best-last, index = score

const SCORE_LEVELS = {
	resolution_headroom: ORDER([
		'Far too few pixels or very soft: detail is mushy or blocky even at the file\'s native size',
		'Small or soft: visible softness or coarse pixels at native size; would look weak enlarged or on high-density screens',
		'Adequate: acceptable at native size but with little headroom for enlargement',
		'Good: sharp at native size with reasonable headroom',
		'Excellent: crisp with ample pixels; holds up when enlarged',
	]),
	text_legibility: ORDER([
		'None of the text a viewer is meant to read can be read',
		'Only a few large words are readable; most meaningful text is illegible',
		'The main text is readable but secondary text is hard to read',
		'All meaningful text is readable with slight effort',
		'All text is crisp and effortless to read',
	]),
	subject_clarity: ORDER([
		'A viewer cannot tell what the image shows',
		'Vague: the subject is faint or ambiguous',
		'The subject is identifiable with some effort',
		'The subject is clear',
		'The subject is immediately obvious and striking',
	]),
	framing: ORDER([
		'The subject is cut off or mostly missing, and/or most of the frame is dead space',
		'Noticeable cut-off content or large empty areas weaken the subject',
		'Acceptable: some wasted space or a slightly tight crop',
		'Well framed: the subject is complete with sensible margins',
		'Excellent framing: every part of the frame earns its place',
	]),
	contrast_exposure: ORDER([
		'The subject merges into the background (nearly black or blown out); parts cannot be told apart',
		'Weak separation between subject and background; hard to distinguish parts',
		'Adequate, with some low-contrast areas',
		'Good separation between subject and background',
		'Excellent: clear, balanced tones and strong separation',
	]),
	artifact_cleanliness: ORDER([
		'Severe artifacts dominate: debug overlays, watermarks, cursors, or heavy compression damage',
		'Prominent artifacts that a visitor would notice immediately',
		'Minor artifacts noticeable only on a close look',
		'Nearly clean: only trace artifacts',
		'Clean: no artifacts, overlays or leftover interface residue',
	]),
	scan_first_impact: ORDER([
		'A two-second glance conveys nothing clear',
		'A vague impression only',
		'Some specific takeaway',
		'A clear, specific takeaway about the work',
		'An instant, specific and appealing takeaway about the work',
	]),
	text_legibility_here: ORDER([
		'None of the meaningful text can be read at this on-page size',
		'Only a few large words can be read; most meaningful text is illegible at this size',
		'The main text is readable at this size but secondary text is not',
		'All meaningful text is readable with slight effort at this size',
		'All text is crisp and effortless to read at this size',
	]),
	crop_framing_here: ORDER([
		'Most of the meaningful content is cut off; what remains is an anonymous fragment',
		'A large share of meaningful content is lost or squeezed; the subject is weakened',
		'Some content is cut off or letterboxed, but the main subject remains',
		'Nearly everything important is visible; only edges are lost',
		'Everything important is visible and well framed in this slot',
	]),
	resolution_here: ORDER([
		'Visibly blurry or blocky at this size because the image is enlarged well beyond its pixels',
		'Noticeably soft at this size',
		'Slightly soft but acceptable at this size',
		'Sharp at this size',
		'Very crisp at this size with pixels to spare',
	]),
	overlay_intrusion: ORDER([
		'Page elements drawn over the image hide key content',
		'Overlays cover a noticeable part of the important content',
		'Overlays are present but leave the important content readable',
		'Only minor overlays that do not touch important content',
		'No overlays, or none that matter',
	]),
	glance_here: ORDER([
		'A two-second glance at this placement conveys nothing clear',
		'A vague impression only',
		'Some specific takeaway',
		'A clear, specific takeaway about the work',
		'An instant, specific and appealing takeaway about the work',
	]),
};

const SCORE_INSTRUCTIONS = {
	resolution_headroom:
		'Judging only the image file itself (not where it is displayed), does it have enough pixel detail and clean rendering to hold up as a showcase image? Use `file_pixels`, `file_sharpness` and `observation.sharpness_and_artifacts`.',
	text_legibility:
		'How legible is the text a viewer is meant to read in this image at the file\'s native size? Use `observation.text_readable`.',
	subject_clarity:
		'How clearly does the image show what the subject or work is? Use `observation.depicts` and `observation.scan_first_read`.',
	framing:
		'How well does the frame use its area: subject complete, sensible margins, little dead space? Use `observation.composition` and `empty_bands`.',
	contrast_exposure:
		'How well does the subject separate from its background in brightness and colour? Use `observation.tone_and_contrast`, `file_exposure` and `file_contrast`.',
	artifact_cleanliness:
		'How free is the image of artifacts, overlays, watermarks, cursors and compression damage? Use `observation.sharpness_and_artifacts`.',
	scan_first_impact:
		'If a visitor glances at this image for about two seconds, how specific and appealing is what they take away? Use `observation.scan_first_read`.',
	text_legibility_here:
		'At the size this placement is shown, how legible is the text a viewer is meant to read? Use `observation.readable_here`, `placement.shown_size` and `placement.resolution`.',
	crop_framing_here:
		'In this placement, how much of the image\'s important content survives the fit and crop? Use `placement.crop`, `placement.shape` and `observation.visible_vs_full`.',
	resolution_here:
		'At the size this placement is shown, how sharp does the image look? Use `placement.resolution` and `placement.shown_size`.',
	overlay_intrusion:
		'How much do page elements drawn over the image (play buttons, labels, gradients, captions) intrude on its important content? Use `observation.overlays_or_intrusions`.',
	glance_here:
		'If a visitor glances at this placement for about two seconds, how specific and appealing is what they take away? Use `observation.at_a_glance`.',
};

const score = (id) => ({
	type: 'score',
	instructions: SCORE_INSTRUCTIONS[id],
	criteria: SCORE_LEVELS[id],
});

// Two-step classification (hierarchical, docs: hierarchical-classification): first HOW SERIOUS,
// then WHAT KIND OF FIX. v1 asked for one action among fine/minor/touchup/recrop/replace and Jev
// chose "recrop-or-recapture" for 39 of 61 assets, never "fine" (an action-menu bias), so severity
// is now asked on its own and the remedy only matters when severity >= moderate. The v1 answers
// are kept in jev/v1-standalone-action-classify/.
// v2: concrete anchors per level, and classification runs on a LEAN state (no code-measured
// exposure/contrast buckets): with the buckets in state Jev read "dark"/"low contrast" as defects even
// when the observation said the image had strong separation (asset 56, a fine waterfall photo, came back
// "moderate"). Docs: jaggedness -> large/irrelevant state costs accuracy; literal reading.
export const SEVERITY_OPTIONS = {
	none: 'The image works as a showcase image: subject clear, well framed, readable where it needs to be. Any listed flaws are trivial.',
	minor: 'One small flaw that most visitors would not register.',
	moderate:
		'A clear weakness, such as soft or small text, mediocre framing or contrast, that a careful visitor would notice, but the image still shows the work.',
	severe:
		'A serious weakness most visitors would notice immediately, such as an unidentifiable subject, a mostly empty or cut-off frame, unreadable essential text, or a prominent overlay, that undermines what the image is there to show.',
};

export const REMEDY_OPTIONS_STANDALONE = {
	'gentle-ai-touchup':
		'The main problem is in the pixels (softness, noise, compression damage, low contrast or exposure) and gently enhancing the existing pixels could fix it without changing what the image shows.',
	'recrop-or-recapture':
		'The main problem is framing, dead space, cut-off content, leftover interface/debug overlays baked into the pixels, or content too small to read; only a new crop or a new capture would fix it.',
	replace: 'The image is fundamentally unusable or unrepresentative of the work; a different image is needed.',
};

export const REMEDY_OPTIONS_INPLACE = {
	'gentle-ai-touchup':
		'The image looks bad in this placement because of softness, noise, compression damage, low contrast or exposure that gently enhancing the existing pixels could fix.',
	'recrop-or-recapture':
		'The image itself needs a new crop or a new capture (content cut off, too much dead space, unreadable content, baked-in overlays).',
	'layout-fix':
		'The image file is fine but this placement crops, sizes or overlays it badly; the page layout (fit, size, aspect ratio, sizes attribute, overlay position) should change, not the picture.',
	replace: 'This image is unusable in this placement; a different image is needed.',
};

const PRIMARY_ISSUE = {
	none: 'No notable issue.',
	low_resolution: 'Too few pixels or soft/blurry rendering.',
	unreadable_text: 'Text or fine detail that matters is too small or too faint to read.',
	poor_framing_or_dead_space: 'Subject cut off, badly framed, or large empty/dead areas.',
	low_contrast_or_dark: 'Very dark, washed out, or the subject blends into the background.',
	artifacts_or_overlays: 'Debug overlays, watermarks, cursors, compression damage or leftover interface residue.',
	busy_background: 'A cluttered or distracting background competes with the subject.',
	other: 'Some other issue.',
};

const NOULS_STANDALONE = {
	is_defective_for_showcase: {
		type: 'noul',
		instructions:
			'Would most portfolio visitors notice a problem with this image within a few seconds, without zooming in? Use `observation`, `file_pixels`, `file_sharpness`, `file_exposure` and `empty_bands`.',
		criteria: {
			true: 'Most visitors would notice a quality problem (soft, dark, cut off, cluttered, unreadable, or full of artifacts) at a glance.',
			false: 'Most visitors would see a presentable image; any flaws need a close look.',
		},
	},
	fixable_by_gentle_ai_touchup: {
		type: 'noul',
		instructions:
			'Could the image\'s main problem be fixed by gently enhancing the existing pixels (denoise, sharpen, light upscaling, exposure or contrast) without changing what it depicts or inventing content? If the image has no problem, answer no.',
		criteria: {
			true: 'Yes: the main problem is in pixel quality and enhancement would visibly help.',
			false: 'No: there is no pixel-quality problem, or the problem is framing, missing content, or overlays that enhancement cannot fix.',
		},
	},
	needs_new_capture_or_recrop: {
		type: 'noul',
		instructions:
			'Is the image\'s main problem content that is cut off, missing, too small, or baked-in framing, such that only a new capture or a different crop would solve it?',
		criteria: {
			true: 'Yes: only a new crop or new capture would solve the main problem.',
			false: 'No: there is no such problem, or enhancing the existing pixels would solve it.',
		},
	},
};

const NOULS_INPLACE = {
	is_defective_here: {
		type: 'noul',
		instructions:
			'In this placement, would a portfolio visitor perceive the image as low quality or poorly presented? Use `placement` and `observation`.',
		criteria: {
			true: 'A visitor would notice a quality or presentation problem here.',
			false: 'A visitor would see a well-presented image here.',
		},
	},
	page_layout_is_the_cause: {
		type: 'noul',
		instructions:
			'Is the main problem in this placement caused by how the page crops, sizes or overlays the image, rather than by the image file itself? If there is no problem, answer no.',
		criteria: {
			true: 'Yes: the crop, size or overlay in the layout is the main cause.',
			false: 'No: there is no problem, or the image file itself is the cause.',
		},
	},
};

// ---------- state builders (numbers -> words) ----------

const sizeClass = (w) =>
	w < 640 ? 'tiny (under 640px wide)' : w < 1000 ? 'small (under 1000px wide)' : w < 1600 ? 'medium (1000-1600px wide)' : 'large (1600px or wider)';

const shapeWords = (w, h) => {
	const r = w / h;
	return r > 4
		? 'a very wide, short strip'
		: r > 2.2
			? 'a wide banner'
			: r > 1.4
				? 'landscape'
				: r > 0.9
					? 'roughly square'
					: 'portrait';
};

// Source pixels per CSS pixel (density-independent). v1-v3 described the shortfall against DEVICE pixels, so
// every phone placement (dpr 3) read as "enlarged ~3x, visibly soft" and the in-place resolution score
// collapsed to ~0.5 for every asset, including a fine photo. Perception on the page depends on source
// pixels per CSS pixel; retina headroom is common, so it is named but not treated as a defect.
export function ppc(placement) {
	const su = placement.source_used;
	const r = placement.render;
	if (placement.fit === 'contain') return Math.max(su.w / r.w, su.h / r.h);
	if (placement.fit === 'cover') return Math.min(su.w / r.w, su.h / r.h);
	return su.w / r.w;
}
const densityWords = (p, dpr) =>
	p >= 2
		? 'well above one source pixel per CSS pixel (crisp, even on high-density screens)'
		: p >= 1.25
			? 'comfortably above one source pixel per CSS pixel (crisp on standard screens, close to crisp on high-density screens)'
			: p >= 0.9
				? `about one source pixel per CSS pixel (crisp on standard screens${dpr > 1 ? '; this is a ' + dpr + 'x screen, so slightly soft' : ''})`
				: p >= 0.6
					? 'fewer than one source pixel per CSS pixel (soft on every screen)'
					: 'far fewer than one source pixel per CSS pixel (the image is enlarged and visibly soft)';

const emptyBands = (m) => {
	const parts = Object.entries(m)
		.filter(([, v]) => v >= 15)
		.map(([k, v]) => `${k} ${Math.round(v)}% of the ${k === 'top' || k === 'bottom' ? 'height' : 'width'} is a near-uniform empty band`);
	return parts.length ? parts.join('; ') : 'none';
};

const hasText = (obs) => !/^\s*no text/i.test(obs.text_readable ?? '');

export function buildStandalone(fact, obs) {
	const state = {
		project: fact.project,
		kind: obs.kind,
		file_pixels: `${fact.native.w} x ${fact.native.h} px, ${sizeClass(fact.native.w)}`,
		file_sharpness: fact.pixels.sharpness_bucket,
		file_exposure: fact.pixels.exposure_bucket,
		file_contrast: fact.pixels.contrast_bucket,
		empty_bands: emptyBands(fact.pixels.empty_margin_pct),
		observation: {
			depicts: obs.depicts,
			text_readable: obs.text_readable,
			composition: obs.composition,
			tone_and_contrast: obs.tone_and_contrast,
			sharpness_and_artifacts: obs.sharpness_and_artifacts,
			scan_first_read: obs.scan_first_read,
		},
	};
	const scoreIds = ['resolution_headroom', 'subject_clarity', 'framing', 'contrast_exposure', 'artifact_cleanliness', 'scan_first_impact'];
	if (hasText(obs)) scoreIds.splice(1, 0, 'text_legibility');
	const questions = {};
	for (const id of scoreIds) questions[id] = score(id);
	Object.assign(questions, NOULS_STANDALONE);
	questions.primary_issue = {
		type: 'choice',
		instructions: 'Which single issue most reduces this image\'s value as a showcase image? Use `observation` and the file facts.',
		criteria: PRIMARY_ISSUE,
	};
	const lean = { project: state.project, kind: state.kind, file_pixels: state.file_pixels, observation: state.observation };
	return { state, lean, questions, scoreIds };
}

export function buildInPlace(fact, placement, view, obs) {
	const state = {
		project: fact.project,
		image: { kind: obs.kind, depicts: obs.depicts, file_pixels: `${fact.native.w} x ${fact.native.h} px, ${sizeClass(fact.native.w)}` },
		placement: {
			viewport: placement.viewport,
			role: placement.role,
			context: view.context,
			shown_size: `${Math.round(placement.render.w)} x ${Math.round(placement.render.h)} css px (${shapeWords(placement.render.w, placement.render.h)})`,
			fit: placement.fit,
			crop: placement.crop_note,
			shape: `${shapeWords(placement.render.w, placement.render.h)} slot for ${shapeWords(fact.native.w, fact.native.h)} source`,
			resolution: `${densityWords(ppc(placement), placement.dpr)}; the browser loaded a ${placement.source_used.w} px wide file for a ${Math.round(placement.render.w)} CSS px wide slot`,
		},
		observation: {
			visible_vs_full: view.visible_vs_full,
			readable_here: view.readable_here,
			overlays_or_intrusions: view.overlays_or_intrusions,
			at_a_glance: view.at_a_glance,
		},
	};
	const scoreIds = ['crop_framing_here', 'resolution_here', 'overlay_intrusion', 'glance_here'];
	if (hasText(obs)) scoreIds.unshift('text_legibility_here');
	const questions = {};
	for (const id of scoreIds) questions[id] = score(id);
	Object.assign(questions, NOULS_INPLACE);
	return { state, lean: state, questions, scoreIds };
}

export const SEVERITY_INSTRUCTIONS_STANDALONE =
	'How serious is the most significant problem of this image for its job as a portfolio showcase image, judged on the file alone? If the observation lists no real problem, choose none.';
export const SEVERITY_INSTRUCTIONS_INPLACE =
	'How serious is the most significant problem of this placement, judged as the visitor sees it on the page? If the observation lists no real problem, choose none.';
export const REMEDY_INSTRUCTIONS_STANDALONE =
	'Assuming this image needs work, what kind of fix would address its main problem?';
export const REMEDY_INSTRUCTIONS_INPLACE =
	'Assuming this placement needs work, what kind of fix would address its main problem?';

/** severity + remedy -> verdict label used in the reports. */
export function verdict(severity, remedy) {
	if (severity === 'none') return 'fine';
	if (severity === 'minor') return 'minor-polish';
	return remedy;
}
export const NEEDS_WORK = (severity) => severity === 'moderate' || severity === 'severe';

export const WEIGHT_STANDALONE_IN_OVERALL = 0.5;
export const WEIGHT_INPLACE_IN_OVERALL = 0.5; // in-place = 0.5*mean(views) + 0.5*worst(view)
