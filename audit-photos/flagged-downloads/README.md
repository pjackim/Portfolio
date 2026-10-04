# Portfolio image review

> **Second pass added 2026-09-29.** Every image evaluation below now has a Jev (TypeSafe System One) evaluation beside it. First-pass text is unchanged. Method, all 61 scores and caveats: [jev-review/REPORT.md](../jev-review/REPORT.md). **How accurate was the first pass? 53/100** (range 53–60 against a blind pixel-grader check).
>
> How to read the new columns: *Jev tier* = **Issue** (the Jev classifier says severe and the Jev scorer flags a dimension), **Watch** (one of the two flags it, or classifier says moderate), **Clean** (neither). *Overall (0-100)* = mean of the standalone score (image on its own) and the in-place score (every place it sits on the page, half mean, half worst view); higher is better; 50 is "acceptable" on the rubric. The first pass gave priority tiers only, no numeric scores.

Reviewed the live [portfolio](https://pjackim.github.io/Portfolio/) on September 29, 2026. Downloaded **22 flagged files: 14 confirmed presentation/source issues and 8 lower-priority review candidates**. Files are unmodified copies of the deployed WebP assets, named by project. Some need a layout change rather than replacement.

## Coverage

- All 20 linked HTML pages: home, Work, About, Experience, Capabilities, and 15 published projects.
  - *Second pass:* 2/2 checkable statements hold.
- Five full-site passes: 1440x1000 at 1x, 1920x1080 at 1x, 768x1024 at 2x, 390x844 at 3x, and 320x740 at 2x.
  - *Second pass:* 6/6 checkable statements hold.
- Second image-focused pass through all 15 project pages at all five sizes; all 15 Work carousel slides and all seven capability filters exercised at each size.
  - *Second pass:* 2/2 checkable statements hold; 1 cannot be checked from the saved files.
- 61 distinct deployed image/poster assets inspected (responsive renditions and repeated placements grouped). All 26 expandable figures opened at desktop and mobile sizes. Contact portrait and mobile contact dialog checked.
  - *Second pass:* 2/2 checkable statements hold; 2 cannot be checked from the saved files.
- All 100 initial page visits returned HTTP 200; no broken visible images found.
  - *Second pass:* 3/3 checkable statements hold.
- Browser: Chromium with emulated viewport/density, light theme and reduced motion for stable comparisons. This is not a physical-device or cross-browser test. Video poster appearance was reviewed, not entire video playback. External social destinations and resume document are outside this portfolio-photo review.
  - *Second pass:* 3 cannot be checked from the saved files.

## Highest priority

1. AES homepage crop discards about 73% of the image height. — *Jev:* #6 Issue, overall 44, rank 3 of 61.
2. Mordhau has only 514px-wide sources, incomplete framing and background text interference. — *Jev:* #2 Issue, overall 51, rank 4 of 61; #22 Issue, overall 61, rank 17 of 61.
3. Trip Planner's portrait cover loses about 41% of its height in the landscape carousel. — *Jev:* #3 Issue, overall 68, rank 32 of 61.
4. Ant Game's video poster is extremely dark and has debug/desktop overlays. — *Jev:* #54 Issue, overall 40, rank 1 of 61.
5. Paradox's old banner has excessive baked-in margins and very low contrast. — *Jev:* #58 Issue, overall 43, rank 2 of 61.

## Confirmed issues

| ID  | Project / file                                                                                           | Priority | Issue                                        | Original pixels | Jev tier | Jev overall (0-100) | Jev standalone / in place | Jev main problem |
| --- | -------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------- | --------------- | --- | --- | --- | --- |
| 6   | [aes-256: cover.webp](confirmed/06--aes-256--cover.webp)                                                 | high     | Layout crop + unreadable overview            | 1280x720 | **Issue** | 44 | 50 / 39 | unreadable text |
| 2   | [mordhau: cover.webp](confirmed/02--mordhau--cover.webp)                                                 | high     | Low resolution + source crop                 | 514x321 | **Issue** | 51 | 46 / 55 | poor framing or dead space |
| 22  | [mordhau: gameplay-toggles.webp](confirmed/22--mordhau--gameplay-toggles.webp)                           | high     | Low resolution + poor contrast               | 514x244 | **Issue** | 61 | 48 / 74 | poor framing or dead space |
| 3   | [trip-planner: cover.webp](confirmed/03--trip-planner--cover.webp)                                       | high     | Portrait source cropped in landscape slot    | 901x959 | **Issue** | 68 | 68 / 68 | artifacts or overlays |
| 54  | [ant-game: yt-MBJ0LGR1R4o.webp](confirmed/54--ant-game--yt-MBJ0LGR1R4o.webp)                             | high     | Very dark video poster + capture artifacts   | 1280x720 | **Issue** | 40 | 28 / 52 | low contrast or dark |
| 58  | [paradox: zexilemodz-banner.webp](confirmed/58--paradox--zexilemodz-banner.webp)                         | high     | Dark artwork + baked-in empty margins        | 1917x1078 | **Issue** | 43 | 29 / 58 | poor framing or dead space |
| 1   | [credential-correlation: cover.webp](confirmed/01--credential-correlation--cover.webp)                   | medium   | Homepage crop + low-contrast screenshot      | 1280x720 | **Issue** | 59 | 64 / 54 | low contrast or dark |
| 21  | [credential-correlation: gui-visualizer.webp](confirmed/21--credential-correlation--gui-visualizer.webp) | medium   | Low-contrast text                            | 1578x1015 | **Watch** | 67 | 65 / 69 | poor framing or dead space |
| 4   | [the-forest: cover.webp](confirmed/04--the-forest--cover.webp)                                           | medium   | Homepage crop removes interface context      | 1709x1021 | **Issue** | 57 | 56 / 57 | artifacts or overlays |
| 12  | [arch-linux: cover.webp](confirmed/12--arch-linux--cover.webp)                                           | medium   | Cover crop trims desktop panels              | 1919x1077 | **Watch** | 67 | 80 / 54 | unreadable text |
| 30  | [the-forest: menu-panels.webp](confirmed/30--the-forest--menu-panels.webp)                               | medium   | Busy background + small menu text            | 905x554 | **Watch** | 72 | 68 / 76 | low contrast or dark |
| 35  | [aes-256: aes-source-code.webp](confirmed/35--aes-256--aes-source-code.webp)                             | medium   | Poor source framing + unreadable mobile text | 762x920 | **Watch** | 73 | 66 / 80 | poor framing or dead space |
| 45  | [ant-game: sculpt-three-quarter.webp](confirmed/45--ant-game--sculpt-three-quarter.webp)                 | medium   | Source crop + editor residue                 | 1274x772 | **Issue** | 65 | 58 / 73 | artifacts or overlays |
| 37  | [hero-trivia: puzzle-variety.webp](confirmed/37--hero-trivia--puzzle-variety.webp)                       | medium   | Mobile playback button covers poster text    | 1168x920 | **Watch** | 75 | 75 / 76 | busy background |

## Lower-priority candidates

These are optional improvements, not claims that every small image is defective. High-density pixel shortfall alone does not prove visible blur.

| ID  | Project / file                                                                                                                    | Reason to review                       | Original pixels | Jev tier | Jev overall (0-100) | Jev standalone / in place | Jev main problem |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------------- | --- | --- | --- | --- |
| 17  | [credential-correlation: password-checker-search.webp](review-candidate/17--credential-correlation--password-checker-search.webp) | Limited retina resolution              | 714x219 | **Clean** | 73 | 66 / 80 | low contrast or dark |
| 18  | [credential-correlation: dummy-credentials.webp](review-candidate/18--credential-correlation--dummy-credentials.webp)             | Limited retina resolution              | 756x206 | **Issue** | 80 | 70 / 91 | poor framing or dead space |
| 19  | [credential-correlation: checker-rated-strong.webp](review-candidate/19--credential-correlation--checker-rated-strong.webp)       | Small source + fine text               | 625x212 | **Watch** | 75 | 66 / 84 | other |
| 20  | [credential-correlation: checker-crack-time.webp](review-candidate/20--credential-correlation--checker-crack-time.webp)           | Small supporting text                  | 768x383 | **Clean** | 74 | 68 / 81 | low contrast or dark |
| 23  | [trip-planner: trip-manager.webp](review-candidate/23--trip-planner--trip-manager.webp)                                           | Dense UI at phone size                 | 901x959 | **Watch** | 72 | 66 / 78 | poor framing or dead space |
| 34  | [hardpoint: yt-EdJRI.webp](review-candidate/34--hardpoint--yt-EdJRI.webp)                                                         | Debug overlay in poster                | 1280x720 | **Issue** | 55 | 50 / 60 | artifacts or overlays |
| 44  | [arch-linux: launcher-panel.webp](review-candidate/44--arch-linux--launcher-panel.webp)                                           | Narrow source + fine text              | 487x1009 | **Watch** | 70 | 55 / 85 | poor framing or dead space |
| 55  | [go-green: brochure-with-text.webp](review-candidate/55--go-green--brochure-with-text.webp)                                       | Embedded paragraph too small on phones | 1920x1080 | **Watch** | 72 | 74 / 71 | low contrast or dark |

## Per-image evidence and recommended action

### 6. aes-256 — Layout crop + unreadable overview

At 1440px the homepage puts a 1280x720 desktop capture into a 1150x177 strip: about 73% of its height is discarded. It becomes an anonymous dark strip. The case-study poster also has very small code.

**Action:** Give this card more height or use a dedicated thumbnail showing one meaningful result.

[Downloaded original](confirmed/06--aes-256--cover.webp) · [Rendered evidence](evidence/06--home-desktop--6.png) · [Live page](https://pjackim.github.io/Portfolio/work/aes-256/)

**Second pass (Jev) beside the first pass**

| | First pass | Jev second pass |
| --- | --- | --- |
| Verdict | **high**: Layout crop + unreadable overview | **Issue** · overall 44/100 · rank 3 of 61 (1 = worst) |
| Score | none given (priority tier only) | standalone 50 · in place 39 (worst view: home @ desktop, 26) |
| Severity (classifier) | — | standalone moderate (review, conf 0.54); in place severe (worst of 4 confident of 4 views) |
| Main problem | Layout crop + unreadable overview | unreadable text (standalone, conf 0.72) |
| Fix | Give this card more height or use a dedicated thumbnail showing one meaningful result. — Jev reads this as **layout-fix** (conf 0.77) | standalone: recrop-or-recapture (conf 0.99) · in place: recrop-or-recapture |
| Weakest dimensions | — | standalone: resolution 33 · text 51 · subject 74 · framing 41 · contrast 72 · artifacts 20 · glance impact 65 → weakest **artifacts** 20 |
| Fact check of the paragraph above | — | numeric 6/6 hold · descriptive 0 supported, 2 uncertain, 0 not supported. Not fully supported: “The AES cover becomes an anonymous dark strip on the homepage.” (uncertain, p=0.66); “The AES case-study poster has very small code.” (uncertain, p=0.61) |
| Tier agreement (severity tier only) |  | agree |


### 2. mordhau — Low resolution + source crop

The 514x321 source already cuts through the top slider/label and leaves most of the frame empty. The Work carousel enlarges it to about 644x402 at 1440px. Phone/retina rendering has even less pixel headroom.

**Action:** Recapture the complete menu at higher resolution and frame the controls tightly.

[Downloaded original](confirmed/02--mordhau--cover.webp) · [Rendered evidence](evidence/02--desktop--mordhau.png) · [Live page](https://pjackim.github.io/Portfolio/work/mordhau/)

**Second pass (Jev) beside the first pass**

| | First pass | Jev second pass |
| --- | --- | --- |
| Verdict | **high**: Low resolution + source crop | **Issue** · overall 51/100 · rank 4 of 61 (1 = worst) |
| Score | none given (priority tier only) | standalone 46 · in place 55 (worst view: work @ desktop, 47) |
| Severity (classifier) | — | standalone severe (accept, conf 1); in place severe (worst of 3 confident of 4 views) |
| Main problem | Low resolution + source crop | poor framing or dead space (standalone, conf 0.99) |
| Fix | Recapture the complete menu at higher resolution and frame the controls tightly. — Jev reads this as **recrop-or-recapture** (conf 1) | standalone: recrop-or-recapture (conf 0.99) · in place: recrop-or-recapture |
| Weakest dimensions | — | standalone: resolution 39 · text 88 · subject 50 · framing 1 · contrast 50 · artifacts 59 · glance impact 37 → weakest **framing** 1 |
| Fact check of the paragraph above | — | numeric 7/7 hold · descriptive 2 supported, 1 uncertain, 0 not supported. Not fully supported: “Mordhau cover has incomplete framing.” (uncertain, p=0.67) |
| Blind pixel grade (third opinion) | — | standalone severe · in place severe (inplace/02--mobile--2.png): Crop of settings sliders cut off at top, remainder empty black. Mobile row thumbnail is unreadable dark blob; no identifiable subject. |
| Tier agreement (severity tier only) |  | agree |


### 22. mordhau — Low resolution + poor contrast

Only 514x244. Background patch-note text shows through the gameplay menu and competes with its labels; the capture also ends tightly at the controls. This is visible in the original, not caused by responsive CSS.

**Action:** Recapture at 2x or higher with a clean background and the full menu visible.

[Downloaded original](confirmed/22--mordhau--gameplay-toggles.webp) · [Rendered evidence](evidence/22--desktop--22.png) · [Live page](https://pjackim.github.io/Portfolio/work/mordhau/)

**Second pass (Jev) beside the first pass**

| | First pass | Jev second pass |
| --- | --- | --- |
| Verdict | **high**: Low resolution + poor contrast | **Issue** · overall 61/100 · rank 17 of 61 (1 = worst) |
| Score | none given (priority tier only) | standalone 48 · in place 74 (worst view: work--mordhau @ mobile, 73) |
| Severity (classifier) | — | standalone severe (accept, conf 0.95); in place moderate (worst of 1 confident of 2 views) |
| Main problem | Low resolution + poor contrast | poor framing or dead space (standalone, conf 0.55) |
| Fix | Recapture at 2x or higher with a clean background and the full menu visible. — Jev reads this as **recrop-or-recapture** (conf 1) | standalone: recrop-or-recapture (conf 0.96) · in place: recrop-or-recapture |
| Weakest dimensions | — | standalone: resolution 24 · text 57 · subject 76 · framing 20 · contrast 64 · artifacts 36 · glance impact 67 → weakest **framing** 20 |
| Fact check of the paragraph above | — | numeric 3/3 hold · descriptive 3 supported, 1 uncertain, 0 not supported. Not fully supported: “The Mordhau gameplay-toggles capture ends tightly at the controls.” (uncertain, p=0.37) |
| Tier agreement (severity tier only) |  | agree |


### 3. trip-planner — Portrait source cropped in landscape slot

The Work carousel uses cover fitting on a 901x959 portrait screenshot, cutting away about 41% of its height in a 16:10 slot. The mobile homepage cuts off the app header/footer. Conversely, the desktop homepage shows it only about 131x140, too small to read.

**Action:** Use contain consistently, enlarge the thumbnail area, or provide a separate landscape cover.

[Downloaded original](confirmed/03--trip-planner--cover.webp) · [Rendered evidence](evidence/03--desktop--trip-planner.png) · [Live page](https://pjackim.github.io/Portfolio/work/trip-planner/)

**Second pass (Jev) beside the first pass**

| | First pass | Jev second pass |
| --- | --- | --- |
| Verdict | **high**: Portrait source cropped in landscape slot | **Issue** · overall 68/100 · rank 32 of 61 (1 = worst) |
| Score | none given (priority tier only) | standalone 68 · in place 68 (worst view: work @ desktop, 61) |
| Severity (classifier) | — | standalone moderate (too uncertain, conf 0.47); in place severe (worst of 1 confident of 4 views) |
| Main problem | Portrait source cropped in landscape slot | artifacts or overlays (standalone, conf 0.88) |
| Fix | Use contain consistently, enlarge the thumbnail area, or provide a separate landscape cover. — Jev reads this as **layout-fix** (conf 0.99) | standalone: recrop-or-recapture (conf 1) · in place: layout-fix |
| Weakest dimensions | — | standalone: resolution 58 · text 87 · subject 92 · framing 34 · contrast 96 · artifacts 43 · glance impact 78 → weakest **framing** 34 |
| Fact check of the paragraph above | — | numeric 9/9 hold · descriptive 0 supported, 1 uncertain, 1 not supported. Not fully supported: “The mobile homepage cuts off the Trip Planner app header/footer.” (uncertain, p=0.48); “The Trip Planner cover at about 131x140 on the desktop homepage is too small to read.” (no, p=0.1) |
| Tier agreement (severity tier only) |  | agree |


### 54. ant-game — Very dark video poster + capture artifacts

The ant is almost a silhouette against the ground. The original includes development/performance text and an Activate Windows watermark. The scene is hard to identify on desktop and mobile.

**Action:** Choose a brighter gameplay frame and record/export without desktop or debug overlays.

[Downloaded original](confirmed/54--ant-game--yt-MBJ0LGR1R4o.webp) · [Rendered evidence](evidence/54--desktop--54.png) · [Live page](https://pjackim.github.io/Portfolio/work/ant-game/)

**Second pass (Jev) beside the first pass**

| | First pass | Jev second pass |
| --- | --- | --- |
| Verdict | **high**: Very dark video poster + capture artifacts | **Issue** · overall 40/100 · rank 1 of 61 (1 = worst) |
| Score | none given (priority tier only) | standalone 28 · in place 52 (worst view: work--ant-game @ mobile, 48) |
| Severity (classifier) | — | standalone severe (accept, conf 1); in place severe (worst of 2 confident of 2 views) |
| Main problem | Very dark video poster + capture artifacts | low contrast or dark (standalone, conf 0.48) |
| Fix | Choose a brighter gameplay frame and record/export without desktop or debug overlays. — Jev reads this as **recrop-or-recapture** (conf 0.89) | standalone: recrop-or-recapture (conf 0.9) · in place: recrop-or-recapture |
| Weakest dimensions | — | standalone: resolution 23 · text 56 · subject 42 · framing 19 · contrast 1 · artifacts 4 · glance impact 40 → weakest **contrast** 1 |
| Fact check of the paragraph above | — | numeric 3/3 hold · descriptive 5 supported, 1 uncertain, 0 not supported. Not fully supported: “The scene is hard to identify on desktop and mobile.” (uncertain, p=0.73) |
| Blind pixel grade (third opinion) | — | standalone moderate · in place moderate (inplace/54--mobile--1.png): Very dark frame; ant silhouette barely visible, tiny debug text and Activate Windows watermark. Large Play button covers scene in mobile. |
| Tier agreement (severity tier only) |  | agree |


### 58. paradox — Dark artwork + baked-in empty margins

The visible banner occupies only a narrow middle band of a 1917x1078 file. Dark empty areas consume most of the image, while the logo and channel name have very low contrast. On phones the actual banner becomes a tiny dark strip.

**Action:** Export the actual banner bounds and improve subject/text contrast; keep the full archived export separately if needed.

[Downloaded original](confirmed/58--paradox--zexilemodz-banner.webp) · [Rendered evidence](evidence/58--desktop--58.png) · [Live page](https://pjackim.github.io/Portfolio/work/paradox/)

**Second pass (Jev) beside the first pass**

| | First pass | Jev second pass |
| --- | --- | --- |
| Verdict | **high**: Dark artwork + baked-in empty margins | **Issue** · overall 43/100 · rank 2 of 61 (1 = worst) |
| Score | none given (priority tier only) | standalone 29 · in place 58 (worst view: work--paradox @ mobile, 56) |
| Severity (classifier) | — | standalone severe (accept, conf 0.98); in place severe (worst of 2 confident of 2 views) |
| Main problem | Dark artwork + baked-in empty margins | poor framing or dead space (standalone, conf 0.85) |
| Fix | Export the actual banner bounds and improve subject/text contrast; keep the full archived export separately if needed. — Jev reads this as **recrop-or-recapture** (conf 0.99) | standalone: recrop-or-recapture (conf 0.87) · in place: recrop-or-recapture |
| Weakest dimensions | — | standalone: resolution 24 · text 50 · subject 37 · framing 3 · contrast 20 · artifacts 41 · glance impact 24 → weakest **framing** 3 |
| Fact check of the paragraph above | — | numeric 4/4 hold · descriptive 4 supported, 1 uncertain, 0 not supported. Not fully supported: “On phones the actual Paradox banner becomes a tiny dark strip.” (uncertain, p=0.71) |
| Blind pixel grade (third opinion) | — | standalone severe · in place severe (inplace/58--mobile--1.png): Banner is a thin strip in a mostly empty grey letterbox; logo and text tiny and very dark, illegible in the frame. |
| Tier agreement (severity tier only) |  | agree |


### 1. credential-correlation — Homepage crop + low-contrast screenshot

The homepage desktop cover crops the visualizer vertically, trimming interface/annotation content. The source is a full desktop/video frame with small colored labels over a translucent, busy background; it reads poorly as a thumbnail.

**Action:** Use a dedicated, high-contrast cover with a tighter focus on the comparison.

[Downloaded original](confirmed/01--credential-correlation--cover.webp) · [Rendered evidence](evidence/01--home-desktop--1.png) · [Live page](https://pjackim.github.io/Portfolio/work/credential-correlation/)

**Second pass (Jev) beside the first pass**

| | First pass | Jev second pass |
| --- | --- | --- |
| Verdict | **medium**: Homepage crop + low-contrast screenshot | **Issue** · overall 59/100 · rank 13 of 61 (1 = worst) |
| Score | none given (priority tier only) | standalone 64 · in place 54 (worst view: work--credential-correlation @ mobile, 50) |
| Severity (classifier) | — | standalone moderate (review, conf 0.66); in place severe (worst of 4 confident of 4 views) |
| Main problem | Homepage crop + low-contrast screenshot | low contrast or dark (standalone, conf 0.56) |
| Fix | Use a dedicated, high-contrast cover with a tighter focus on the comparison. — Jev reads this as **replace** (conf 0.96) | standalone: recrop-or-recapture (conf 0.82) · in place: recrop-or-recapture |
| Weakest dimensions | — | standalone: resolution 57 · text 73 · subject 80 · framing 72 · contrast 55 · artifacts 42 · glance impact 67 → weakest **artifacts** 42 |
| Fact check of the paragraph above | — | numeric 3/3 hold · descriptive 1 supported, 3 uncertain, 0 not supported. Not fully supported: “The Credential Correlation cover source is a full desktop/video frame.” (uncertain, p=0.74); “The cover has small colored labels over a translucent, busy background.” (uncertain, p=0.28); “The cover reads poorly as a thumbnail.” (uncertain, p=0.67) |
| Tier agreement (severity tier only) |  | agree |


### 21. credential-correlation — Low-contrast text

The large visualizer image retains small red, green and blue labels over a translucent desktop background. Even the expanded image has weak contrast; reducing it to phone width makes the annotations difficult to read.

**Action:** Capture the app with an opaque background and larger labels, or split it into focused explanatory images.

[Downloaded original](confirmed/21--credential-correlation--gui-visualizer.webp) · [Rendered evidence](evidence/21--desktop--lightbox--21.png) · [Live page](https://pjackim.github.io/Portfolio/work/credential-correlation/)

**Second pass (Jev) beside the first pass**

| | First pass | Jev second pass |
| --- | --- | --- |
| Verdict | **medium**: Low-contrast text | **Watch** · overall 67/100 · rank 29 of 61 (1 = worst) |
| Score | none given (priority tier only) | standalone 65 · in place 69 (worst view: work--credential-correlation @ mobile, 67) |
| Severity (classifier) | — | standalone moderate (review, conf 0.54); in place moderate (worst of 2 confident of 2 views) |
| Main problem | Low-contrast text | poor framing or dead space (standalone, conf 0.52) |
| Fix | Capture the app with an opaque background and larger labels, or split it into focused explanatory images. — Jev reads this as **recrop-or-recapture** (conf 0.92) | standalone: recrop-or-recapture (conf 1) · in place: recrop-or-recapture |
| Weakest dimensions | — | standalone: resolution 68 · text 79 · subject 78 · framing 30 · contrast 51 · artifacts 74 · glance impact 72 → weakest **framing** 30 |
| Fact check of the paragraph above | — | numeric 2/2 hold · descriptive 1 supported, 2 uncertain, 0 not supported. Not fully supported: “The visualizer image retains small red, green and blue labels over a translucent desktop background.” (uncertain, p=0.36); “Even the expanded (lightbox) visualizer image has weak contrast.” (uncertain, p=0.36) |
| Blind pixel grade (third opinion) | — | standalone moderate · in place moderate (inplace/21--mobile--1.png): Dark dim visualizer; red/magenta annotations low-contrast; last caption cut off at bottom ('occurs in both'). On mobile monospace text is small and soft. |
| Tier agreement (severity tier only) |  | partly (Jev rates it less serious) |


### 4. the-forest — Homepage crop removes interface context

The desktop homepage renders this 1709x1021 image around 563x177, retaining only about 53% of its height. Parts of the menu and HUD are cut off even though the project is about that interface. The full project image is much better framed.

**Action:** Use a taller card or a separate crop that retains the menu being demonstrated.

[Downloaded original](confirmed/04--the-forest--cover.webp) · [Rendered evidence](evidence/04--home-desktop--4.png) · [Live page](https://pjackim.github.io/Portfolio/work/the-forest/)

**Second pass (Jev) beside the first pass**

| | First pass | Jev second pass |
| --- | --- | --- |
| Verdict | **medium**: Homepage crop removes interface context | **Issue** · overall 57/100 · rank 8 of 61 (1 = worst) |
| Score | none given (priority tier only) | standalone 56 · in place 57 (worst view: home @ desktop, 51) |
| Severity (classifier) | — | standalone severe (accept, conf 0.99); in place moderate (worst of 1 confident of 4 views) |
| Main problem | Homepage crop removes interface context | artifacts or overlays (standalone, conf 1) |
| Fix | Use a taller card or a separate crop that retains the menu being demonstrated. — Jev reads this as **layout-fix** (conf 0.44) | standalone: recrop-or-recapture (conf 0.99) · in place: layout-fix |
| Weakest dimensions | — | standalone: resolution 87 · text 52 · subject 91 · framing 42 · contrast 28 · artifacts 9 · glance impact 75 → weakest **artifacts** 9 |
| Fact check of the paragraph above | — | numeric 5/5 hold · descriptive 2 supported, 0 uncertain, 0 not supported |
| Tier agreement (severity tier only) |  | agree |


### 12. arch-linux — Cover crop trims desktop panels

The source is approximately 16:9, but the Work carousel and project hero use 16:10 cover fitting. The left launcher/avatar and text get cut at the left edge. This is a presentation crop, not a low-resolution original.

**Action:** Use contain for desktop screenshots or supply a 16:10 cover with both edge panels inside the safe area.

[Downloaded original](confirmed/12--arch-linux--cover.webp) · [Rendered evidence](evidence/12--desktop--12.png) · [Live page](https://pjackim.github.io/Portfolio/work/arch-linux/)

**Second pass (Jev) beside the first pass**

| | First pass | Jev second pass |
| --- | --- | --- |
| Verdict | **medium**: Cover crop trims desktop panels | **Watch** · overall 67/100 · rank 30 of 61 (1 = worst) |
| Score | none given (priority tier only) | standalone 80 · in place 54 (worst view: work--arch-linux @ desktop, 51) |
| Severity (classifier) | — | standalone moderate (review, conf 0.57); in place moderate (worst of 2 confident of 2 views) |
| Main problem | Cover crop trims desktop panels | unreadable text (standalone, conf 0.88) |
| Fix | Use contain for desktop screenshots or supply a 16:10 cover with both edge panels inside the safe area. — Jev reads this as **layout-fix** (conf 0.85) | standalone: recrop-or-recapture (conf 0.84) · in place: recrop-or-recapture |
| Weakest dimensions | — | standalone: resolution 89 · text 51 · subject 91 · framing 99 · contrast 75 · artifacts 68 · glance impact 89 → weakest **text** 51 |
| Fact check of the paragraph above | — | numeric 6/6 hold · descriptive 2 supported, 0 uncertain, 0 not supported |
| Blind pixel grade (third opinion) | — | standalone minor · in place moderate (inplace/12--mobile--1.png): Full desktop wallpaper: central painting clear, side widgets/text tiny but legible. In place, cover-crop cuts left panel (avatar, name, quote clipped) and right edge; mobile crop worst. |
| Tier agreement (severity tier only) |  | partly (Jev rates it less serious) |


### 30. the-forest — Busy background + small menu text

The Forest menu panels are composited over detailed, dark foliage. Small text has weak separation from the scene, particularly at 390px and 320px. The 905px source also has limited retina headroom.

**Action:** Recapture with a quiet background or opaque panels and larger UI text.

[Downloaded original](confirmed/30--the-forest--menu-panels.webp) · [Rendered evidence](evidence/30--mobile--30.png) · [Live page](https://pjackim.github.io/Portfolio/work/the-forest/)

**Second pass (Jev) beside the first pass**

| | First pass | Jev second pass |
| --- | --- | --- |
| Verdict | **medium**: Busy background + small menu text | **Watch** · overall 72/100 · rank 41 of 61 (1 = worst) |
| Score | none given (priority tier only) | standalone 68 · in place 76 (worst view: work--the-forest @ mobile, 74) |
| Severity (classifier) | — | standalone moderate (review, conf 0.64); in place no confident read |
| Main problem | Busy background + small menu text | low contrast or dark (standalone, conf 0.99) |
| Fix | Recapture with a quiet background or opaque panels and larger UI text. — Jev reads this as **recrop-or-recapture** (conf 0.98) | standalone: gentle-ai-touchup (conf 0.25) · in place: none needed |
| Weakest dimensions | — | standalone: resolution 53 · text 90 · subject 84 · framing 72 · contrast 47 · artifacts 52 · glance impact 74 → weakest **contrast** 47 |
| Fact check of the paragraph above | — | numeric 3/3 hold · descriptive 0 supported, 1 uncertain, 1 not supported. Not fully supported: “The Forest menu panels are composited over detailed, dark foliage.” (no, p=0.17); “Small text in the Forest menu panels has weak separation from the scene, particularly at 390px and 320px.” (uncertain, p=0.28) |
| Blind pixel grade (third opinion) | — | standalone minor · in place minor (inplace/30--desktop--1.png): Game menu panels over dark forest: labels legible, cyan accents clear, but overall dim low contrast. In place small text on desktop still readable. |
| Tier agreement (severity tier only) |  | partly (Jev rates it less serious) |


### 35. aes-256 — Poor source framing + unreadable mobile text

The code capture begins partway through a data table and ends at an incomplete function near the lower/right edge. Most of the frame is hexadecimal data; meaningful code becomes tiny on phones. Native inspection confirms the source framing.

**Action:** Export a complete relevant function at a larger font, or render selectable code instead of an image.

[Downloaded original](confirmed/35--aes-256--aes-source-code.webp) · [Rendered evidence](evidence/35--mobile--35.png) · [Live page](https://pjackim.github.io/Portfolio/work/aes-256/)

**Second pass (Jev) beside the first pass**

| | First pass | Jev second pass |
| --- | --- | --- |
| Verdict | **medium**: Poor source framing + unreadable mobile text | **Watch** · overall 73/100 · rank 45 of 61 (1 = worst) |
| Score | none given (priority tier only) | standalone 66 · in place 80 (worst view: work--aes-256 @ mobile, 80) |
| Severity (classifier) | — | standalone moderate (too uncertain, conf 0.43); in place no confident read |
| Main problem | Poor source framing + unreadable mobile text | poor framing or dead space (standalone, conf 0.75) |
| Fix | Export a complete relevant function at a larger font, or render selectable code instead of an image. — Jev reads this as **other** (conf 0.47) | standalone: recrop-or-recapture (conf 0.99) · in place: none needed |
| Weakest dimensions | — | standalone: resolution 59 · text 95 · subject 84 · framing 26 · contrast 75 · artifacts 62 · glance impact 68 → weakest **framing** 26 |
| Fact check of the paragraph above | — | numeric 2/2 hold · descriptive 3 supported, 2 uncertain, 0 not supported. Not fully supported: “The AES code capture ends at an incomplete function near the lower/right edge.” (uncertain, p=0.65); “Meaningful code in the AES capture becomes tiny on phones.” (uncertain, p=0.68) |
| Blind pixel grade (third opinion) | — | standalone minor · in place moderate (inplace/35--desktop--1.png): Tall code screenshot mostly hex table, ends mid-function signature. In place on desktop it is shrunk with tiny unreadable code in narrow box; mobile better. |
| Tier agreement (severity tier only) |  | partly (Jev rates it less serious) |


### 45. ant-game — Source crop + editor residue

The three-quarter sculpt overview cuts off a lower leg at the bottom edge and retains editor gizmo/cursor residue at the right. The original file has the same framing.

**Action:** Zoom out slightly and export a clean viewport render with the whole model inside the frame.

[Downloaded original](confirmed/45--ant-game--sculpt-three-quarter.webp) · [Rendered evidence](evidence/45--desktop--45.png) · [Live page](https://pjackim.github.io/Portfolio/work/ant-game/)

**Second pass (Jev) beside the first pass**

| | First pass | Jev second pass |
| --- | --- | --- |
| Verdict | **medium**: Source crop + editor residue | **Issue** · overall 65/100 · rank 27 of 61 (1 = worst) |
| Score | none given (priority tier only) | standalone 58 · in place 73 (worst view: work--ant-game @ mobile, 72) |
| Severity (classifier) | — | standalone severe (review, conf 0.53); in place no confident read |
| Main problem | Source crop + editor residue | artifacts or overlays (standalone, conf 0.94) |
| Fix | Zoom out slightly and export a clean viewport render with the whole model inside the frame. — Jev reads this as **recrop-or-recapture** (conf 1) | standalone: recrop-or-recapture (conf 1) · in place: none needed |
| Weakest dimensions | — | standalone: resolution 64 · subject 88 · framing 26 · contrast 69 · artifacts 28 · glance impact 76 → weakest **framing** 26 |
| Fact check of the paragraph above | — | numeric 2/2 hold · descriptive 2 supported, 0 uncertain, 1 not supported. Not fully supported: “The original file has the same framing as seen on the page.” (no, p=0.14) |
| Tier agreement (severity tier only) |  | agree |


### 37. hero-trivia — Mobile playback button covers poster text

On 390px and 320px layouts the Play button covers the right end of the clue at the bottom of the puzzle poster. The underlying 1168x920 file is adequately sized; this is an overlay problem.

**Action:** Move the control outside the clue area or choose a poster with a reserved control area.

[Downloaded original](confirmed/37--hero-trivia--puzzle-variety.webp) · [Rendered evidence](evidence/37--mobile--37.png) · [Live page](https://pjackim.github.io/Portfolio/work/hero-trivia/)

**Second pass (Jev) beside the first pass**

| | First pass | Jev second pass |
| --- | --- | --- |
| Verdict | **medium**: Mobile playback button covers poster text | **Watch** · overall 75/100 · rank 49 of 61 (1 = worst) |
| Score | none given (priority tier only) | standalone 75 · in place 76 (worst view: work--hero-trivia @ mobile, 74) |
| Severity (classifier) | — | standalone moderate (too uncertain, conf 0.15); in place no confident read |
| Main problem | Mobile playback button covers poster text | busy background (standalone, conf 0.16) |
| Fix | Move the control outside the clue area or choose a poster with a reserved control area. — Jev reads this as **layout-fix** (conf 0.5) | standalone: gentle-ai-touchup (conf 0.29) · in place: layout-fix |
| Weakest dimensions | — | standalone: resolution 53 · text 80 · subject 95 · framing 81 · contrast 84 · artifacts 53 · glance impact 82 → weakest **resolution** 53 |
| Fact check of the paragraph above | — | numeric 3/3 hold · descriptive 0 supported, 1 uncertain, 0 not supported. Not fully supported: “On 390px and 320px layouts the Play button covers the right end of the clue at the bottom of the puzzle poster.” (uncertain, p=0.45) |
| Blind pixel grade (third opinion) | — | standalone minor · in place moderate (inplace/37--mobile--1.png): Blurred comic backdrop but title, grid and clue readable. On mobile the PLAY button covers the right end of the clue text, truncating it. |
| Tier agreement (severity tier only) |  | partly (Jev rates it less serious) |


### 17. credential-correlation — Limited retina resolution

714x219 search-results capture, rendered about 702px wide on the 2x tablet. Small result URLs are soft at reduced phone sizes. It is readable on normal desktop and is not a broken image.

**Action:** Recapture at higher pixel density if this supporting screenshot is retained.

[Downloaded original](review-candidate/17--credential-correlation--password-checker-search.webp) · [Rendered evidence](evidence/17--tablet--17.png) · [Live page](https://pjackim.github.io/Portfolio/work/credential-correlation/)

**Second pass (Jev) beside the first pass**

| | First pass | Jev second pass |
| --- | --- | --- |
| Verdict | **candidate**: Limited retina resolution | **Clean** · overall 73/100 · rank 43 of 61 (1 = worst) |
| Score | none given (priority tier only) | standalone 66 · in place 80 (worst view: work--credential-correlation @ mobile, 77) |
| Severity (classifier) | — | standalone severe (too uncertain, conf 0.16); in place none (worst of 1 confident of 2 views) |
| Main problem | Limited retina resolution | low contrast or dark (standalone, conf 0.85) |
| Fix | Recapture at higher pixel density if this supporting screenshot is retained. — Jev reads this as **recrop-or-recapture** (conf 1) | standalone: recrop-or-recapture (conf 0.59) · in place: none needed |
| Weakest dimensions | — | standalone: resolution 46 · text 92 · subject 81 · framing 54 · contrast 49 · artifacts 67 · glance impact 68 → weakest **resolution** 46 |
| Fact check of the paragraph above | — | numeric 3/3 hold · descriptive 1 supported, 1 uncertain, 0 not supported. Not fully supported: “Small result URLs in the password-checker-search screenshot are soft at reduced phone sizes.” (uncertain, p=0.55) |
| Blind pixel grade (third opinion) | — | standalone minor · in place minor (inplace/17--desktop--1.png): Small, plain Google search-result crop; text legible, subject clear, little visual interest. Displayed fine in place with caption. |
| Tier agreement (severity tier only) |  | disagree (Jev sees no problem) |


### 18. credential-correlation — Limited retina resolution

756x206 text image rendered about 631px wide on the 2x tablet. The short line is still readable, but the asset has little high-density headroom.

**Action:** Prefer a styled selectable text example or a higher-density capture.

[Downloaded original](review-candidate/18--credential-correlation--dummy-credentials.webp) · [Rendered evidence](evidence/18--tablet--18.png) · [Live page](https://pjackim.github.io/Portfolio/work/credential-correlation/)

**Second pass (Jev) beside the first pass**

| | First pass | Jev second pass |
| --- | --- | --- |
| Verdict | **candidate**: Limited retina resolution | **Issue** · overall 80/100 · rank 58 of 61 (1 = worst) |
| Score | none given (priority tier only) | standalone 70 · in place 91 (worst view: work--credential-correlation @ desktop, 91) |
| Severity (classifier) | — | standalone severe (accept, conf 0.85); in place none (worst of 1 confident of 2 views) |
| Main problem | Limited retina resolution | poor framing or dead space (standalone, conf 0.98) |
| Fix | Prefer a styled selectable text example or a higher-density capture. — Jev reads this as **other** (conf 0.68) | standalone: recrop-or-recapture (conf 0.62) · in place: none needed |
| Weakest dimensions | — | standalone: resolution 45 · text 97 · subject 96 · framing 29 · contrast 89 · artifacts 65 · glance impact 75 → weakest **framing** 28 |
| Fact check of the paragraph above | — | numeric 4/4 hold · descriptive 1 supported, 0 uncertain, 0 not supported |
| Tier agreement (severity tier only) |  | partly (Jev rates it more serious) |


### 19. credential-correlation — Small source + fine text

625x212 screenshot; some secondary labels are faint and small. It is readable at normal desktop scale but cannot provide 2x detail at its tablet display width.

**Action:** Recapture the checker result at higher density and larger text.

[Downloaded original](review-candidate/19--credential-correlation--checker-rated-strong.webp) · [Rendered evidence](evidence/19--tablet--19.png) · [Live page](https://pjackim.github.io/Portfolio/work/credential-correlation/)

**Second pass (Jev) beside the first pass**

| | First pass | Jev second pass |
| --- | --- | --- |
| Verdict | **candidate**: Small source + fine text | **Watch** · overall 75/100 · rank 48 of 61 (1 = worst) |
| Score | none given (priority tier only) | standalone 66 · in place 84 (worst view: work--credential-correlation @ desktop, 83) |
| Severity (classifier) | — | standalone severe (review, conf 0.59); in place no confident read |
| Main problem | Small source + fine text | other (standalone, conf 0.17) |
| Fix | Recapture the checker result at higher density and larger text. — Jev reads this as **recrop-or-recapture** (conf 1) | standalone: recrop-or-recapture (conf 0.64) · in place: none needed |
| Weakest dimensions | — | standalone: resolution 45 · text 76 · subject 97 · framing 49 · contrast 53 · artifacts 53 · glance impact 82 → weakest **resolution** 45 |
| Fact check of the paragraph above | — | numeric 3/3 hold · descriptive 2 supported, 0 uncertain, 0 not supported |
| Blind pixel grade (third opinion) | — | standalone minor · in place minor (inplace/19--desktop--1.png): Checker screenshot readable: password, Strong, 1 years. Faint grey Upper case label and small labels; low-res but fine. Placement matches. |
| Tier agreement (severity tier only) |  | agree |


### 20. credential-correlation — Small supporting text

768x383 screenshot. The main result remains legible, but small explanatory copy is hard to read on phones and the source is undersized for 2x tablet rendering.

**Action:** Recapture with larger copy or crop to the relevant result and reproduce its explanation as page text.

[Downloaded original](review-candidate/20--credential-correlation--checker-crack-time.webp) · [Rendered evidence](evidence/20--mobile--20.png) · [Live page](https://pjackim.github.io/Portfolio/work/credential-correlation/)

**Second pass (Jev) beside the first pass**

| | First pass | Jev second pass |
| --- | --- | --- |
| Verdict | **candidate**: Small supporting text | **Clean** · overall 74/100 · rank 46 of 61 (1 = worst) |
| Score | none given (priority tier only) | standalone 68 · in place 81 (worst view: work--credential-correlation @ mobile, 80) |
| Severity (classifier) | — | standalone severe (too uncertain, conf 0.32); in place no confident read |
| Main problem | Small supporting text | low contrast or dark (standalone, conf 0.52) |
| Fix | Recapture with larger copy or crop to the relevant result and reproduce its explanation as page text. — Jev reads this as **recrop-or-recapture** (conf 0.98) | standalone: gentle-ai-touchup (conf 0.29) · in place: none needed |
| Weakest dimensions | — | standalone: resolution 47 · text 61 · subject 93 · framing 79 · contrast 51 · artifacts 57 · glance impact 82 → weakest **resolution** 47 |
| Fact check of the paragraph above | — | numeric 3/3 hold · descriptive 1 supported, 1 uncertain, 0 not supported. Not fully supported: “Small explanatory copy in the checker-crack-time screenshot is hard to read on phones.” (uncertain, p=0.66) |
| Blind pixel grade (third opinion) | — | standalone none · in place none (inplace/20--desktop--1.png): Clear high-contrast checker page: headline, password field and 53 million years all readable. Small subtext only trivial. Placement sharp. |
| Tier agreement (severity tier only) |  | disagree (Jev sees no problem) |


### 23. trip-planner — Dense UI at phone size

The trip-manager modal contains a long list of very small text. At roughly 308px displayed width on mobile it is difficult to read. The full-size source is better; this is mainly presentation/readability.

**Action:** Use a tighter detail screenshot or annotate the save/load controls; retain the complete view in the lightbox.

[Downloaded original](review-candidate/23--trip-planner--trip-manager.webp) · [Rendered evidence](evidence/23--mobile--23.png) · [Live page](https://pjackim.github.io/Portfolio/work/trip-planner/)

**Second pass (Jev) beside the first pass**

| | First pass | Jev second pass |
| --- | --- | --- |
| Verdict | **candidate**: Dense UI at phone size | **Watch** · overall 72/100 · rank 39 of 61 (1 = worst) |
| Score | none given (priority tier only) | standalone 66 · in place 78 (worst view: work--trip-planner @ desktop, 78) |
| Severity (classifier) | — | standalone moderate (review, conf 0.62); in place no confident read |
| Main problem | Dense UI at phone size | poor framing or dead space (standalone, conf 0.38) |
| Fix | Use a tighter detail screenshot or annotate the save/load controls; retain the complete view in the lightbox. — Jev reads this as **recrop-or-recapture** (conf 0.47) | standalone: recrop-or-recapture (conf 0.99) · in place: none needed |
| Weakest dimensions | — | standalone: resolution 54 · text 79 · subject 87 · framing 37 · contrast 84 · artifacts 53 · glance impact 75 → weakest **framing** 37 |
| Fact check of the paragraph above | — | numeric 3/3 hold · descriptive 0 supported, 2 uncertain, 1 not supported. Not fully supported: “The trip-manager modal contains a long list of very small text.” (uncertain, p=0.59); “The trip-manager text is difficult to read at about 308 px on mobile.” (no, p=0.07); “The full-size trip-manager source is better than the mobile rendering.” (uncertain, p=0.47) |
| Blind pixel grade (third opinion) | — | standalone minor · in place minor (inplace/23--mobile--1.png): Trip Manager modal readable, subject clear; background dimmed/cropped and last list item clipped, small badge text. Mobile shrinks list text slightly. |
| Tier agreement (severity tier only) |  | agree |


### 34. hardpoint — Debug overlay in poster

The Hardpoint poster contains a prominent PHYSX CPU overlay in the upper left and a large foreground weapon. Its resolution is acceptable, but a cleaner frame would present the game mode better.

**Action:** Select a clean capture-zone/scoring frame without the debug overlay.

[Downloaded original](review-candidate/34--hardpoint--yt-EdJRI.webp) · [Rendered evidence](evidence/34--desktop--34.png) · [Live page](https://pjackim.github.io/Portfolio/work/hardpoint/)

**Second pass (Jev) beside the first pass**

| | First pass | Jev second pass |
| --- | --- | --- |
| Verdict | **candidate**: Debug overlay in poster | **Issue** · overall 55/100 · rank 6 of 61 (1 = worst) |
| Score | none given (priority tier only) | standalone 50 · in place 60 (worst view: work--hardpoint @ mobile, 57) |
| Severity (classifier) | — | standalone severe (accept, conf 0.93); in place severe (worst of 2 confident of 2 views) |
| Main problem | Debug overlay in poster | artifacts or overlays (standalone, conf 0.99) |
| Fix | Select a clean capture-zone/scoring frame without the debug overlay. — Jev reads this as **recrop-or-recapture** (conf 0.96) | standalone: recrop-or-recapture (conf 0.99) · in place: layout-fix |
| Weakest dimensions | — | standalone: resolution 27 · text 50 · subject 96 · framing 47 · contrast 44 · artifacts 7 · glance impact 78 → weakest **artifacts** 7 |
| Fact check of the paragraph above | — | numeric 3/3 hold · descriptive 2 supported, 0 uncertain, 0 not supported |
| Tier agreement (severity tier only) |  | partly (Jev rates it more serious) |


### 44. arch-linux — Narrow source + fine text

487x1009 portrait launcher capture. It is only about 340px wide on desktop and has small quote/menu text; 2x/3x displays expose its limited source resolution.

**Action:** Recapture at higher density or focus on one panel; keep the full screenshot as secondary detail.

[Downloaded original](review-candidate/44--arch-linux--launcher-panel.webp) · [Rendered evidence](evidence/44--mobile--44.png) · [Live page](https://pjackim.github.io/Portfolio/work/arch-linux/)

**Second pass (Jev) beside the first pass**

| | First pass | Jev second pass |
| --- | --- | --- |
| Verdict | **candidate**: Narrow source + fine text | **Watch** · overall 70/100 · rank 36 of 61 (1 = worst) |
| Score | none given (priority tier only) | standalone 55 · in place 85 (worst view: work--arch-linux @ desktop, 85) |
| Severity (classifier) | — | standalone moderate (review, conf 0.69); in place none (worst of 1 confident of 2 views) |
| Main problem | Narrow source + fine text | poor framing or dead space (standalone, conf 0.49) |
| Fix | Recapture at higher density or focus on one panel; keep the full screenshot as secondary detail. — Jev reads this as **recrop-or-recapture** (conf 1) | standalone: recrop-or-recapture (conf 0.94) · in place: none needed |
| Weakest dimensions | — | standalone: resolution 28 · text 72 · subject 72 · framing 30 · contrast 79 · artifacts 54 · glance impact 58 → weakest **resolution** 28 |
| Fact check of the paragraph above | — | numeric 4/4 hold · descriptive 1 supported, 0 uncertain, 0 not supported |
| Blind pixel grade (third opinion) | — | standalone none · in place minor (inplace/44--desktop--1.png): Clear launcher UI, legible labels and quote at full size. On desktop it is a narrow panel in a wide grey frame, so text is small; mobile fine. |
| Tier agreement (severity tier only) |  | agree |


### 55. go-green — Embedded paragraph too small on phones

The source is 1920x1080 and is not intrinsically low resolution. Its paragraph is packed into a small corner, so it becomes illegible at 343px and 276px displayed widths.

**Action:** Add a readable text transcription or a separate close-up of the paragraph.

[Downloaded original](review-candidate/55--go-green--brochure-with-text.webp) · [Rendered evidence](evidence/55--mobile--55.png) · [Live page](https://pjackim.github.io/Portfolio/work/go-green/)

**Second pass (Jev) beside the first pass**

| | First pass | Jev second pass |
| --- | --- | --- |
| Verdict | **candidate**: Embedded paragraph too small on phones | **Watch** · overall 72/100 · rank 40 of 61 (1 = worst) |
| Score | none given (priority tier only) | standalone 74 · in place 71 (worst view: work--go-green @ mobile, 67) |
| Severity (classifier) | — | standalone moderate (review, conf 0.71); in place moderate (worst of 1 confident of 2 views) |
| Main problem | Embedded paragraph too small on phones | low contrast or dark (standalone, conf 0.62) |
| Fix | Add a readable text transcription or a separate close-up of the paragraph. — Jev reads this as **other** (conf 0.84) | standalone: gentle-ai-touchup (conf 0.74) · in place: layout-fix |
| Weakest dimensions | — | standalone: resolution 60 · text 69 · subject 97 · framing 87 · contrast 73 · artifacts 54 · glance impact 76 → weakest **artifacts** 54 |
| Fact check of the paragraph above | — | numeric 5/5 hold · descriptive 0 supported, 0 uncertain, 2 not supported. Not fully supported: “The Go Green brochure paragraph is packed into a small corner.” (no, p=0.1); “The Go Green brochure paragraph is illegible at 343 px and 276 px displayed widths.” (no, p=0.1) |
| Blind pixel grade (third opinion) | — | standalone minor · in place minor (inplace/55--mobile--1.png): Strong before/after image; text box is legible but large, covers lower third, with typos. Mobile text smaller but still readable. |
| Tier agreement (severity tier only) |  | agree |


## Other observations

- At 320px, every tested page reports horizontal overflow. Work measured 337px document width for a 320px viewport. Treat this as a separate narrow-screen layout issue rather than evidence of corrupt photos.
  - *Second pass:* 2/2 checkable statements hold.
- Hero Trivia background blur, the Arch Linux pixel-art wallpaper, deliberate ant detail close-ups and smoke/cloud effects were not automatically classified as bad resolution.
  - *Second pass:* 1/4 descriptive statements supported by Jev.
- The portrait, logo exports, most renders and scenic images had no material image-quality defect identified at these sizes. Dense diagrams/screenshots still benefit from their full-size links.
  - *Second pass:* 0/2 descriptive statements supported by Jev.
- Contact sheets are overview aids and may resize thumbnails. Use the original file and individual evidence screenshot to judge sharpness.
  - *Second pass:* 1 cannot be checked from the saved files.


## Second pass: images the first pass did not flag

The first pass flagged 22 of 61 assets. Jev rates 13 of the other 39 as **Issue**, 22 as Watch, 4 as Clean. Where blind pixel graders also looked, their grade is shown; on the 13 unflagged Jev-Issue assets they graded, 7 came out minor/none, so treat the Issue rows as "look here first", not as confirmed defects. See REPORT.md.

| ID | Project / file | Jev tier | Overall | Standalone / in place | Jev main problem | Jev fix kind | Blind pixel grade (standalone / in place) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 61 | paradox: [61--yt-a7VCZaQSSMg.D3Ut14wj.webp](../reference-assets/61--yt-a7VCZaQSSMg.D3Ut14wj.webp) | **Issue** | 51 | 50 / 52 | artifacts or overlays | recrop-or-recapture | minor / moderate |
| 8 | hero-trivia: [08--cover.Bnry21de.webp](../reference-assets/08--cover.Bnry21de.webp) | **Issue** | 55 | 71 / 40 | poor framing or dead space | gentle-ai-touchup | moderate / moderate |
| 31 | the-forest: [31--yt-lbqOiXaPm08.B-xSEU2l.webp](../reference-assets/31--yt-lbqOiXaPm08.B-xSEU2l.webp) | **Issue** | 58 | 61 / 55 | artifacts or overlays | recrop-or-recapture | minor / moderate |
| 24 | trip-planner: [24--full-demo.poster.Cag7VY.webp](../reference-assets/24--full-demo.poster.Cag7VY.webp) | **Watch** | 59 | 49 / 68 | artifacts or overlays | recrop-or-recapture | minor / minor |
| 25 | trip-planner: [25--iterative-design.poster.o.webp](../reference-assets/25--iterative-design.poster.o.webp) | **Watch** | 59 | 55 / 63 | artifacts or overlays | recrop-or-recapture | none / minor |
| 52 | ant-game: [52--rig-mesh.DaFjZIOx.webp](../reference-assets/52--rig-mesh.DaFjZIOx.webp) | **Watch** | 59 | 47 / 70 | artifacts or overlays | recrop-or-recapture | moderate / moderate |
| 27 | trip-planner: [27--interoperability.poster.DjylJH5q.webp](../reference-assets/27--interoperability.poster.DjylJH5q.webp) | **Issue** | 60 | 56 / 64 | artifacts or overlays | recrop-or-recapture | none / minor |
| 15 | lost-city: [15--cover.CjdAH56s.webp](../reference-assets/15--cover.CjdAH56s.webp) | **Issue** | 61 | 61 / 62 | low contrast or dark | recrop-or-recapture | minor / minor |
| 39 | over-the-rainbow: [39--yt-Oz2oDcXTusM.B-XTMnZA.webp](../reference-assets/39--yt-Oz2oDcXTusM.B-XTMnZA.webp) | **Issue** | 61 | 57 / 65 | poor framing or dead space | gentle-ai-touchup | minor / moderate |
| 53 | ant-game: [53--rig-joints.whQx6Ho.webp](../reference-assets/53--rig-joints.whQx6Ho.webp) | **Watch** | 61 | 51 / 71 | artifacts or overlays | recrop-or-recapture | not graded |
| 10 | over-the-rainbow: [10--cover.CXuBr3c.webp](../reference-assets/10--cover.CXuBr3c.webp) | **Watch** | 64 | 59 / 69 | poor framing or dead space | recrop-or-recapture | not graded |
| 46 | ant-game: [46--sculpt-thorax-closeup.CJ-l7JFi.webp](../reference-assets/46--sculpt-thorax-closeup.CJ-l7JFi.webp) | **Issue** | 65 | 51 / 78 | poor framing or dead space | recrop-or-recapture | minor / minor |
| 5 | hardpoint: [05--cover.Xc93p9ti.webp](../reference-assets/05--cover.Xc93p9ti.webp) | **Watch** | 65 | 70 / 59 | low contrast or dark | gentle-ai-touchup | minor / minor |
| 26 | trip-planner: [26--database-search.poster.BbI1xo22.webp](../reference-assets/26--database-search.poster.BbI1xo22.webp) | **Issue** | 65 | 61 / 69 | artifacts or overlays | recrop-or-recapture | none / minor |
| 28 | trip-planner: [28--tour-optimization.poster.B.webp](../reference-assets/28--tour-optimization.poster.B.webp) | **Issue** | 65 | 69 / 60 | busy background | recrop-or-recapture | none / moderate |
| 43 | arch-linux: [43--tiling-workspace.DyN4GlR9.webp](../reference-assets/43--tiling-workspace.DyN4GlR9.webp) | **Watch** | 65 | 65 / 66 | low contrast or dark | recrop-or-recapture | not graded |
| 16 | paradox: [16--cover.DwR4v-4e.webp](../reference-assets/16--cover.DwR4v-4e.webp) | **Watch** | 65 | 70 / 60 | poor framing or dead space | recrop-or-recapture | not graded |
| 29 | the-forest: [29--menus-in-game.Ejwtc6fN.webp](../reference-assets/29--menus-in-game.Ejwtc6fN.webp) | **Issue** | 65 | 64 / 67 | artifacts or overlays | recrop-or-recapture | minor / moderate |
| 9 | nodes: [09--cover.BxBm1-nh.webp](../reference-assets/09--cover.BxBm1-nh.webp) | **Watch** | 66 | 63 / 70 | poor framing or dead space | recrop-or-recapture | not graded |
| 13 | ant-game: [13--cover.BlJnV90M.webp](../reference-assets/13--cover.BlJnV90M.webp) | **Issue** | 67 | 72 / 62 | poor framing or dead space | recrop-or-recapture | none / none |
| 32 | hardpoint: [32--capture-zone-corridor.DIIIjFKp.webp](../reference-assets/32--capture-zone-corridor.DIIIjFKp.webp) | **Issue** | 69 | 56 / 82 | artifacts or overlays | recrop-or-recapture | minor / minor |
| 7 | credential-correlation: [07--parker-jackim.Bw6bR1uN.webp](../reference-assets/07--parker-jackim.Bw6bR1uN.webp) | **Watch** | 69 | 64 / 75 | low resolution | gentle-ai-touchup | not graded |
| 57 | lost-city: [57--forest-version.BqGISrTe.webp](../reference-assets/57--forest-version.BqGISrTe.webp) | **Issue** | 70 | 64 / 76 | low contrast or dark | recrop-or-recapture | minor / minor |
| 48 | ant-game: [48--textured-front-view.DSPa5V.webp](../reference-assets/48--textured-front-view.DSPa5V.webp) | **Watch** | 70 | 64 / 76 | poor framing or dead space | recrop-or-recapture | not graded |
| 14 | go-green: [14--cover.DFngPXon.webp](../reference-assets/14--cover.DFngPXon.webp) | **Watch** | 70 | 70 / 70 | low contrast or dark | gentle-ai-touchup | none / none |
| 40 | spectre: [40--atlas-wordmark-dark.BlyylcTF.webp](../reference-assets/40--atlas-wordmark-dark.BlyylcTF.webp) | **Watch** | 72 | 69 / 76 | poor framing or dead space | recrop-or-recapture | minor / minor |
| 50 | ant-game: [50--textured-side-dirt.BhGn1.webp](../reference-assets/50--textured-side-dirt.BhGn1.webp) | **Watch** | 73 | 70 / 77 | poor framing or dead space | recrop-or-recapture | not graded |
| 49 | ant-game: [49--textured-head-closeup.CWc.webp](../reference-assets/49--textured-head-closeup.CWc.webp) | **Watch** | 75 | 70 / 79 | poor framing or dead space | recrop-or-recapture | not graded |
| 38 | nodes: [38--bead-diagram.DiiadOaM.webp](../reference-assets/38--bead-diagram.DiiadOaM.webp) | **Watch** | 76 | 76 / 75 | poor framing or dead space | recrop-or-recapture | not graded |
| 51 | ant-game: [51--textured-side-forest.CruC59CP.webp](../reference-assets/51--textured-side-forest.CruC59CP.webp) | **Clean** | 76 | 77 / 74 | none | gentle-ai-touchup | not graded |
| 33 | hardpoint: [33--capture-zone-melee.Dl6v7Dfj.webp](../reference-assets/33--capture-zone-melee.Dl6v7Dfj.webp) | **Watch** | 76 | 70 / 82 | poor framing or dead space | recrop-or-recapture | not graded |
| 11 | spectre: [11--cover.rf1al80g.webp](../reference-assets/11--cover.rf1al80g.webp) | **Watch** | 77 | 81 / 73 | poor framing or dead space | recrop-or-recapture | not graded |
| 47 | ant-game: [47--sculpt-top-view.BNiyOCsm.webp](../reference-assets/47--sculpt-top-view.BNiyOCsm.webp) | **Watch** | 77 | 65 / 88 | low resolution | recrop-or-recapture | not graded |
| 42 | spectre: [42--specter-wordmark-light.BCVshs7i.webp](../reference-assets/42--specter-wordmark-light.BCVshs7i.webp) | **Watch** | 77 | 76 / 78 | poor framing or dead space | recrop-or-recapture | not graded |
| 36 | hero-trivia: [36--gameplay.poster.Ch1KDA9n.webp](../reference-assets/36--gameplay.poster.Ch1KDA9n.webp) | **Watch** | 78 | 73 / 84 | artifacts or overlays | recrop-or-recapture | not graded |
| 59 | paradox: [59--zexilemodz-logo.fIhurC86.webp](../reference-assets/59--zexilemodz-logo.fIhurC86.webp) | **Watch** | 80 | 74 / 86 | low resolution | gentle-ai-touchup | not graded |
| 60 | paradox: [60--paradox-logo.BE37VDrI.webp](../reference-assets/60--paradox-logo.BE37VDrI.webp) | **Clean** | 85 | 83 / 86 | poor framing or dead space | recrop-or-recapture | none / none |
| 41 | spectre: [41--octopus-logo.CHmkCzb7.webp](../reference-assets/41--octopus-logo.CHmkCzb7.webp) | **Clean** | 88 | 86 / 90 | other | gentle-ai-touchup | none / none |
| 56 | go-green: [56--reference-photo.WhmliRYR.webp](../reference-assets/56--reference-photo.WhmliRYR.webp) | **Clean** | 90 | 95 / 84 | low contrast or dark | gentle-ai-touchup | none / none |

The parent audit folder retains all 100 page screenshots, full asset inventory, 61 reference downloads, image/viewport measurements, all lightbox captures, and repeatable browser scripts. Website source files were not edited.
