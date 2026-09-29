# Jev second pass on the photo audit

Date: 2026-09-29. Engine: Jev `jev-1.13.0` (TypeSafe System One) through the `jev_ask` (Score, Noul, Choice), `jev_classify` and `jev_verify` tools. Reports edited in place: `flagged-downloads/README.md`, `findings.csv`, `manifest.json`, `../COVERAGE.md`; new: `../all-assets-side-by-side.csv`. The first-pass text is unchanged (baseline is git commit `53b6042`); every image evaluation now has the Jev evaluation beside it.

## Headline: how accurate was the first pass?

**53 / 100** measured against Jev (as asked). Against a stricter reference where blind pixel graders can veto Jev, **60 / 100**. Read it as "about 55, ±5": the first pass's facts were sound, but it found only part of what Jev sees and ranked it only weakly like Jev does.

| Component (weight fixed before scoring) | What it measures | Result | Points |
| --- | --- | --- | --- |
| Claims (30) | The first pass's own statements: 86 numeric (86 hold), 26 coverage/process (26 hold, 7 cannot be checked from files; 9 of the process claims come from the README intro and closing paragraphs and are attached to no README line), 65 descriptive checked by `jev_verify` (34 supported, 23 uncertain, 8 not supported; mean p 0.69). Weighted 0.30 / 0.10 / 0.60 | 81% | 24.3 |
| Overlap of worst 22 (20) | First pass flagged 22 files; how many are among Jev's 22 lowest overall scores | 8/22 | 7.3 |
| Precision (15) | Of the 22 flagged: Jev Issue = 1, Watch = ½, Clean = 0 | 70% | 10.6 |
| Recall (15) | Of Jev's 24 Issue-tier assets, share the first pass flagged | 11/24 = 46% | 6.9 |
| Ranking (20) | Spearman ρ between first-pass tier (high 3, medium 2, candidate 1, unflagged 0) and Jev severity; max(0, ρ) | ρ = 0.22 | 4.3 |
| **Total** | | | **53.4** |

Sensitivity: with blind pixel graders able to veto Jev on the 36 assets they graded, overlap 11/22, precision 59%, recall 11/17, ρ 0.34, total 59.7. Implementation: `accuracy.mjs`, output `accuracy.json`.

## What the second pass found

- **The first pass's evidence is accurate.** Every numeric claim reproduces from `inventory.json`/`facts.json` (crop %, rendered sizes, native sizes), all checkable coverage statements hold (20 pages, 5 sizes, 100 visits, 61 assets, sha256 of the 22 downloads). The weak spot is descriptive wording, where Jev could not fully support 31 of 65 claims; 6 of the 59 paragraph claims are "not supported" and split into two evidence gaps (C066 "131x140 is too small to read" and C123 "same framing as on the page" were not among the views captured; they are scored as failures, p 0.10 and 0.14, although they are gaps, not contradictions) and four disagreements about legibility/background: Go Green paragraph "illegible" at phone width (C167, C168; the 276 px width in C168 was measured, not re-viewed), Trip Planner dialog text "difficult to read" at 308 px (C152), and Forest menu panels "over detailed dark foliage" (C110). The second pass's observers read those screenshots at full dpr3 resolution and found the text small but readable; only a physical-phone check settles it. The six "Other observations" claims (C173-C178) were verified last (they are attached to no single asset): C173 Hero Trivia blur is deliberate, supported (p 0.95); C174 Arch Linux wallpaper, C175 ant close-ups and C176 smoke/cloud effects "not a resolution defect", uncertain (p 0.61, 0.45, 0.57); C177 "portrait, logo exports, most renders and scenic images had no material image-quality defect", not supported (p 0.05); C178 "dense diagrams benefit from full-size links", not supported (p 0.09; the evidence describes image quality only and says nothing about links, so this is a gap, not a contradiction). C177 is partly contradicted by Jev's own data: main problem "low resolution" for #47 (ant render close-up), #59 (Paradox logo) and #7 (portrait), all Watch, and #13, #45, #46 (renders) are Jev Issue.
- **The top of the first pass is right.** Jev's two worst assets are first-pass "high" (#54 Ant Game poster, #58 Paradox banner); #6, #2 follow. Nine of the 14 confirmed findings are Jev Issue (six of six "high"); the other five confirmed are Watch (Jev finds a problem, less severe). Blind pixel graders agree the "high" items are real for #2, #58 (severe) and #54 (moderate).
- **The first pass over-called its review candidates.** Of the 8 candidates, Jev rates 2 Issue, 4 Watch, 2 Clean (#17, #20), and blind graders put 7 flagged files at minor/none (#17, #19, #20, #23, #30, #44, #55: six of the eight candidates, plus confirmed #30). The README itself called the candidates optional; the second pass agrees.
- **The first pass missed some real weakness.** 13 unflagged assets are Jev Issue and were graded blind. Pixel graders back Jev on 6 (#8, #28, #29, #31, #39, #61: moderate or worse); on the other 7 (#13, #15, #26, #27, #32, #46, #57) they say minor/none, so Jev is probably over-strict there.
- **One concrete site defect the first pass did not name.** The AES home card (#6) loads a 480 px wide rendition into a 1150 px wide, 177 px tall slot on a 1440 px screen (`sizes` says `30rem` while the card is full width): the browser enlarges it about 2.4x, so beyond the 73% crop the image is also soft (`facts.json` placement `home / desktop / cover-card`, `source_used.w = 480`). The first pass cited only the 1280x720 source. A different cause: Mordhau's carousel file is natively 514 px (its srcset tops out at 514w) in a 644 px slot, not a `sizes` mismatch, and the first pass already flagged it (C027, C050).
- **Jev and blind graders disagree in a consistent direction.** On the 36 blind-graded assets, the first pass's high/medium flags match the graders' "moderate or worse" on 28/36; Jev's Issue tier on 24/36. Jev is stricter, mostly about "artifacts or overlays" and "framing" (taskbars, cursors, limbs running off the frame such as #13).

## How Jev was used (per docs.typesafe.ai)

Jev is text-only, literal, and cannot count or compare numbers; it degrades on large or irrelevant state. So code owns the workflow:

1. **Measure (code):** `facts.mjs` → `facts.json`: native size, sharpness, exposure, contrast, empty bands; for each of the 485 placements, rendered size, fit, crop loss, and the file the browser actually loaded (`inventory.json`, `carousels.json`). Most numbers are turned into words before Jev sees them; a few (`file_pixels`, shown size, crop note, empty-band percentages, the loaded-file width) still reach it as text.
2. **Describe (blind vision agents):** 61 standalone and 61 in-place observation files (146 element screenshots on the live site at desktop 1440 and mobile 390, up to two placements per asset per viewport). Agents were barred from the first-pass reports and only described, never graded.
3. **Judge (Jev):** per asset, one `jev_ask` with 6-7 Score questions (resolution headroom, text legibility, subject clarity, framing, contrast/exposure, artifact cleanliness, glance impact), 3 Noul questions and a Choice for the main issue; `jev_classify` for severity (none/minor/moderate/severe) and for fix kind (gentle AI touch-up / recrop-or-recapture / replace; in place also layout-fix). Per in-place view: 4-5 Scores (97 views have 5, 49 have 4: no text-legibility score when the observation says "no text"), 2 Nouls, severity and fix kind. `jev_verify` for the first pass's descriptive claims; `jev_classify` again to read each first-pass recommendation as a fix kind. Composite weights and tiers are code (`rubric.mjs`, `compose.mjs`).
4. **Tier rule (revised twice, see "What went wrong"; only the accuracy weights were fixed before scoring):** dimension flagged if its expected level < 1.5 (rounds to the two weakest anchors; level 2 is "acceptable" in every rubric). Classifier flag = severity moderate or severe, ignored when Jev marks the answer `reject` (too uncertain). **Issue** = classifier severe and scorer flag together; **Watch** = either, not both; **Clean** = neither.
5. **Third opinion:** 36 assets where first pass and Jev disagreed (plus controls) were graded blind from pixels alone (`adjudication/`). Selected for disagreement, so agreement rates on it are not population rates.

Jev calls: results for 61 + 61 asset files (standalone + in place); about 1,500 requests across all iterations, roughly US$0.07 in total (from the run ledger; no usage fields are stored in `jev/`).

## What went wrong on the way (kept so the numbers can be trusted)

- v1 asked one 5-way action question; Jev picked "recrop-or-recapture" for 47/61 (37 of them with decision `accept`) and never "fine". Fix: ask severity separately from fix kind (`jev/v1-standalone-action-classify/`).
- v2 severity with the full state (including code buckets like "dark", "low contrast") still marked 59/61 as needing work; a fine waterfall photo (#56) came back "moderate". Fix: classify on a lean state with concrete severity anchors (`jev/v2-standalone-full-state-classify/`).
- v3 described resolution shortfall against device pixels; every phone placement (dpr 3) then read "visibly blurry" for every asset. Fix: source pixels per CSS pixel (`jev/v3-inplace-device-ratio-wording/`).
- The first tier rule (classifier ≥ moderate and scorer flag) was first run as 48/61 "Issue" (that v4a answer set was not kept, so 48 cannot be reproduced; the same rule on the final data gives 49); tightened to severe (28), then to 24 after adding the confidence gate (asset #13, a fine render whose limbs leave the frame, had come back moderate at confidence 0.38).
- Thresholds and wording were calibrated on #56 (clearly fine) and #54/#2/#58 (clearly bad), never by tuning against first-pass flags; but #54, #2 and #58 are three of the first pass's six "high" findings (see Limits).

## Limits

- Jev never sees pixels. Everything it judges is a vision agent's description plus code measurements, and the observers were asked to describe defects, which biases toward negatives. Blind graders (same model family as the observers) were milder, so the true bar sits between Jev and them.
- Jev's in-place severity was `reject` (too uncertain) for 78 of 146 views and 22 of 61 standalone; those contribute no flag. Scores are still shown.
- In-place review covers desktop 1440 and mobile 390 visually. 1920, 768 and 320 were measured, not re-viewed.
- First-pass numeric claims all hold partly because the first pass and this one read the same browser measurements; that component measures fidelity, not independent truth.
- Tier thresholds are judgment calls; ranking metrics (overlap, ρ) do not depend on them.
- The calibration anchors #54, #2 and #58 are three of the first pass's six "high" findings, so agreement at the top of the list (overlap, ranking) is partly by construction.
- Asset #13 (a fine render whose limbs leave the frame) motivated the confidence gate, yet it is still Jev Issue through one in-place view (severity severe, decision accept, confidence 0.99); the gate did not change its tier. Its standalone read was moderate (confidence 0.38, reject).
- The claims total counts a 'not supported' verdict from an evidence gap as a failure, and the Agreement and precision rows compare tiers only, not the stated main problem (for example #18 "limited retina resolution" vs Jev "poor framing"). Recall counts the 8 optional review candidates as flagged.
- Not covered: `docs/audits/2026-09-27-project-cards.md` (a layout audit, finding F3 also calls the Mordhau cover mostly empty black, consistent with Jev's #2 result).

## All 61 assets, worst first

Overall = 0.5 × standalone + 0.5 × in place; in place = half mean of views, half worst view. 0-100, 50 = "acceptable". `*` = severity classifier too uncertain. The severity column is standalone-only, while the Jev tier also uses in-place severity. Blind grade = standalone / in place from pixels only.

| ID | Project | First pass | Jev tier | Overall | Standalone | In place | Standalone severity | Main problem | Blind grade |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 54 | ant-game | high | **Issue** | 40 | 28 | 52 | severe | low contrast or dark | moderate / moderate |
| 58 | paradox | high | **Issue** | 43 | 29 | 58 | severe | poor framing or dead space | severe / severe |
| 6 | aes-256 | high | **Issue** | 44 | 50 | 39 | moderate | unreadable text | — |
| 2 | mordhau | high | **Issue** | 51 | 46 | 55 | severe | poor framing or dead space | severe / severe |
| 61 | paradox | unflagged | **Issue** | 51 | 50 | 52 | severe | artifacts or overlays | minor / moderate |
| 34 | hardpoint | candidate | **Issue** | 55 | 50 | 60 | severe | artifacts or overlays | — |
| 8 | hero-trivia | unflagged | **Issue** | 55 | 71 | 40 | moderate | poor framing or dead space | moderate / moderate |
| 4 | the-forest | medium | **Issue** | 57 | 56 | 57 | severe | artifacts or overlays | — |
| 31 | the-forest | unflagged | **Issue** | 58 | 61 | 55 | severe | artifacts or overlays | minor / moderate |
| 24 | trip-planner | unflagged | **Watch** | 59 | 49 | 68 | severe* | artifacts or overlays | minor / minor |
| 25 | trip-planner | unflagged | **Watch** | 59 | 55 | 63 | moderate | artifacts or overlays | none / minor |
| 52 | ant-game | unflagged | **Watch** | 59 | 47 | 70 | severe* | artifacts or overlays | moderate / moderate |
| 1 | credential-correlation | medium | **Issue** | 59 | 64 | 54 | moderate | low contrast or dark | — |
| 27 | trip-planner | unflagged | **Issue** | 60 | 56 | 64 | moderate | artifacts or overlays | none / minor |
| 15 | lost-city | unflagged | **Issue** | 61 | 61 | 62 | severe | low contrast or dark | minor / minor |
| 39 | over-the-rainbow | unflagged | **Issue** | 61 | 57 | 65 | moderate | poor framing or dead space | minor / moderate |
| 22 | mordhau | high | **Issue** | 61 | 48 | 74 | severe | poor framing or dead space | — |
| 53 | ant-game | unflagged | **Watch** | 61 | 51 | 71 | moderate* | artifacts or overlays | — |
| 10 | over-the-rainbow | unflagged | **Watch** | 64 | 59 | 69 | moderate | poor framing or dead space | — |
| 46 | ant-game | unflagged | **Issue** | 65 | 51 | 78 | severe | poor framing or dead space | minor / minor |
| 5 | hardpoint | unflagged | **Watch** | 65 | 70 | 59 | moderate* | low contrast or dark | minor / minor |
| 26 | trip-planner | unflagged | **Issue** | 65 | 61 | 69 | severe | artifacts or overlays | none / minor |
| 28 | trip-planner | unflagged | **Issue** | 65 | 69 | 60 | severe* | busy background | none / moderate |
| 43 | arch-linux | unflagged | **Watch** | 65 | 65 | 66 | moderate | low contrast or dark | — |
| 16 | paradox | unflagged | **Watch** | 65 | 70 | 60 | moderate | poor framing or dead space | — |
| 29 | the-forest | unflagged | **Issue** | 65 | 64 | 67 | severe | artifacts or overlays | minor / moderate |
| 45 | ant-game | medium | **Issue** | 65 | 58 | 73 | severe | artifacts or overlays | — |
| 9 | nodes | unflagged | **Watch** | 66 | 63 | 70 | moderate | poor framing or dead space | — |
| 21 | credential-correlation | medium | **Watch** | 67 | 65 | 69 | moderate | poor framing or dead space | moderate / moderate |
| 12 | arch-linux | medium | **Watch** | 67 | 80 | 54 | moderate | unreadable text | minor / moderate |
| 13 | ant-game | unflagged | **Issue** | 67 | 72 | 62 | moderate* | poor framing or dead space | none / none |
| 3 | trip-planner | high | **Issue** | 68 | 68 | 68 | moderate* | artifacts or overlays | — |
| 32 | hardpoint | unflagged | **Issue** | 69 | 56 | 82 | severe | artifacts or overlays | minor / minor |
| 7 | credential-correlation | unflagged | **Watch** | 69 | 64 | 75 | moderate* | low resolution | — |
| 57 | lost-city | unflagged | **Issue** | 70 | 64 | 76 | severe | low contrast or dark | minor / minor |
| 44 | arch-linux | candidate | **Watch** | 70 | 55 | 85 | moderate | poor framing or dead space | none / minor |
| 48 | ant-game | unflagged | **Watch** | 70 | 64 | 76 | moderate* | poor framing or dead space | — |
| 14 | go-green | unflagged | **Watch** | 70 | 70 | 70 | moderate | low contrast or dark | none / none |
| 23 | trip-planner | candidate | **Watch** | 72 | 66 | 78 | moderate | poor framing or dead space | minor / minor |
| 55 | go-green | candidate | **Watch** | 72 | 74 | 71 | moderate | low contrast or dark | minor / minor |
| 30 | the-forest | medium | **Watch** | 72 | 68 | 76 | moderate | low contrast or dark | minor / minor |
| 40 | spectre | unflagged | **Watch** | 72 | 69 | 76 | severe* | poor framing or dead space | minor / minor |
| 17 | credential-correlation | candidate | **Clean** | 73 | 66 | 80 | severe* | low contrast or dark | minor / minor |
| 50 | ant-game | unflagged | **Watch** | 73 | 70 | 77 | moderate* | poor framing or dead space | — |
| 35 | aes-256 | medium | **Watch** | 73 | 66 | 80 | moderate* | poor framing or dead space | minor / moderate |
| 20 | credential-correlation | candidate | **Clean** | 74 | 68 | 81 | severe* | low contrast or dark | none / none |
| 49 | ant-game | unflagged | **Watch** | 75 | 70 | 79 | moderate* | poor framing or dead space | — |
| 19 | credential-correlation | candidate | **Watch** | 75 | 66 | 84 | severe | other | minor / minor |
| 37 | hero-trivia | medium | **Watch** | 75 | 75 | 76 | moderate* | busy background | minor / moderate |
| 38 | nodes | unflagged | **Watch** | 76 | 76 | 75 | moderate* | poor framing or dead space | — |
| 51 | ant-game | unflagged | **Clean** | 76 | 77 | 74 | none | none | — |
| 33 | hardpoint | unflagged | **Watch** | 76 | 70 | 82 | moderate* | poor framing or dead space | — |
| 11 | spectre | unflagged | **Watch** | 77 | 81 | 73 | none | poor framing or dead space | — |
| 47 | ant-game | unflagged | **Watch** | 77 | 65 | 88 | moderate* | low resolution | — |
| 42 | spectre | unflagged | **Watch** | 77 | 76 | 78 | moderate* | poor framing or dead space | — |
| 36 | hero-trivia | unflagged | **Watch** | 78 | 73 | 84 | moderate* | artifacts or overlays | — |
| 59 | paradox | unflagged | **Watch** | 80 | 74 | 86 | none | low resolution | — |
| 18 | credential-correlation | candidate | **Issue** | 80 | 70 | 91 | severe | poor framing or dead space | — |
| 60 | paradox | unflagged | **Clean** | 85 | 83 | 86 | none* | poor framing or dead space | none / none |
| 41 | spectre | unflagged | **Clean** | 88 | 86 | 90 | none | other | none / none |
| 56 | go-green | unflagged | **Clean** | 90 | 95 | 84 | none | low contrast or dark | none / none |

## Files

- `CONTRACT.md` data contract; `facts.mjs`/`facts.json`; `observations/standalone|inplace/`; `rubric.mjs` (question set, levels, weights); `run-jev.body.js` (Jev runner); `jev/` raw answers and exact states; `compose.mjs` → `results.json`; `claims.mjs`/`claims.json`, `jev/claims-verify.json`; `adjudication/`; `accuracy.mjs` → `accuracy.json`; `apply-reports.mjs` (rewrites the reports from the baseline commit); `report.mjs` (this file).
- Re-run: `node audit-photos/jev-review/compose.mjs && node audit-photos/jev-review/accuracy.mjs && node audit-photos/jev-review/apply-reports.mjs && node audit-photos/jev-review/report.mjs` (Jev calls themselves need a TypeSafe key and the agent's `jev_*` tools).
