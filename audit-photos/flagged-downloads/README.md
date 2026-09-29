# Portfolio image review

Reviewed the live [portfolio](https://pjackim.github.io/Portfolio/) on September 29, 2026. Downloaded **22 flagged files: 14 confirmed presentation/source issues and 8 lower-priority review candidates**. Files are unmodified copies of the deployed WebP assets, named by project. Some need a layout change rather than replacement.

## Coverage

- All 20 linked HTML pages: home, Work, About, Experience, Capabilities, and 15 published projects.
- Five full-site passes: 1440x1000 at 1x, 1920x1080 at 1x, 768x1024 at 2x, 390x844 at 3x, and 320x740 at 2x.
- Second image-focused pass through all 15 project pages at all five sizes; all 15 Work carousel slides and all seven capability filters exercised at each size.
- 61 distinct deployed image/poster assets inspected (responsive renditions and repeated placements grouped). All 26 expandable figures opened at desktop and mobile sizes. Contact portrait and mobile contact dialog checked.
- All 100 initial page visits returned HTTP 200; no broken visible images found.
- Browser: Chromium with emulated viewport/density, light theme and reduced motion for stable comparisons. This is not a physical-device or cross-browser test. Video poster appearance was reviewed, not entire video playback. External social destinations and resume document are outside this portfolio-photo review.

## Highest priority

1. AES homepage crop discards about 73% of the image height.
2. Mordhau has only 514px-wide sources, incomplete framing and background text interference.
3. Trip Planner's portrait cover loses about 41% of its height in the landscape carousel.
4. Ant Game's video poster is extremely dark and has debug/desktop overlays.
5. Paradox's old banner has excessive baked-in margins and very low contrast.

## Confirmed issues

| ID  | Project / file                                                                                           | Priority | Issue                                        | Original pixels |
| --- | -------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------- | --------------- |
| 6   | [aes-256: cover.webp](confirmed/06--aes-256--cover.webp)                                                 | high     | Layout crop + unreadable overview            | 1280x720        |
| 2   | [mordhau: cover.webp](confirmed/02--mordhau--cover.webp)                                                 | high     | Low resolution + source crop                 | 514x321         |
| 22  | [mordhau: gameplay-toggles.webp](confirmed/22--mordhau--gameplay-toggles.webp)                           | high     | Low resolution + poor contrast               | 514x244         |
| 3   | [trip-planner: cover.webp](confirmed/03--trip-planner--cover.webp)                                       | high     | Portrait source cropped in landscape slot    | 901x959         |
| 54  | [ant-game: yt-MBJ0LGR1R4o.webp](confirmed/54--ant-game--yt-MBJ0LGR1R4o.webp)                             | high     | Very dark video poster + capture artifacts   | 1280x720        |
| 58  | [paradox: zexilemodz-banner.webp](confirmed/58--paradox--zexilemodz-banner.webp)                         | high     | Dark artwork + baked-in empty margins        | 1917x1078       |
| 1   | [credential-correlation: cover.webp](confirmed/01--credential-correlation--cover.webp)                   | medium   | Homepage crop + low-contrast screenshot      | 1280x720        |
| 21  | [credential-correlation: gui-visualizer.webp](confirmed/21--credential-correlation--gui-visualizer.webp) | medium   | Low-contrast text                            | 1578x1015       |
| 4   | [the-forest: cover.webp](confirmed/04--the-forest--cover.webp)                                           | medium   | Homepage crop removes interface context      | 1709x1021       |
| 12  | [arch-linux: cover.webp](confirmed/12--arch-linux--cover.webp)                                           | medium   | Cover crop trims desktop panels              | 1919x1077       |
| 30  | [the-forest: menu-panels.webp](confirmed/30--the-forest--menu-panels.webp)                               | medium   | Busy background + small menu text            | 905x554         |
| 35  | [aes-256: aes-source-code.webp](confirmed/35--aes-256--aes-source-code.webp)                             | medium   | Poor source framing + unreadable mobile text | 762x920         |
| 45  | [ant-game: sculpt-three-quarter.webp](confirmed/45--ant-game--sculpt-three-quarter.webp)                 | medium   | Source crop + editor residue                 | 1274x772        |
| 37  | [hero-trivia: puzzle-variety.webp](confirmed/37--hero-trivia--puzzle-variety.webp)                       | medium   | Mobile playback button covers poster text    | 1168x920        |

## Lower-priority candidates

These are optional improvements, not claims that every small image is defective. High-density pixel shortfall alone does not prove visible blur.

| ID  | Project / file                                                                                                                    | Reason to review                       | Original pixels |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------------- |
| 17  | [credential-correlation: password-checker-search.webp](review-candidate/17--credential-correlation--password-checker-search.webp) | Limited retina resolution              | 714x219         |
| 18  | [credential-correlation: dummy-credentials.webp](review-candidate/18--credential-correlation--dummy-credentials.webp)             | Limited retina resolution              | 756x206         |
| 19  | [credential-correlation: checker-rated-strong.webp](review-candidate/19--credential-correlation--checker-rated-strong.webp)       | Small source + fine text               | 625x212         |
| 20  | [credential-correlation: checker-crack-time.webp](review-candidate/20--credential-correlation--checker-crack-time.webp)           | Small supporting text                  | 768x383         |
| 23  | [trip-planner: trip-manager.webp](review-candidate/23--trip-planner--trip-manager.webp)                                           | Dense UI at phone size                 | 901x959         |
| 34  | [hardpoint: yt-EdJRI.webp](review-candidate/34--hardpoint--yt-EdJRI.webp)                                                         | Debug overlay in poster                | 1280x720        |
| 44  | [arch-linux: launcher-panel.webp](review-candidate/44--arch-linux--launcher-panel.webp)                                           | Narrow source + fine text              | 487x1009        |
| 55  | [go-green: brochure-with-text.webp](review-candidate/55--go-green--brochure-with-text.webp)                                       | Embedded paragraph too small on phones | 1920x1080       |

## Per-image evidence and recommended action

### 6. aes-256 — Layout crop + unreadable overview

At 1440px the homepage puts a 1280x720 desktop capture into a 1150x177 strip: about 73% of its height is discarded. It becomes an anonymous dark strip. The case-study poster also has very small code.

**Action:** Give this card more height or use a dedicated thumbnail showing one meaningful result.

[Downloaded original](confirmed/06--aes-256--cover.webp) · [Rendered evidence](evidence/06--home-desktop--6.png) · [Live page](https://pjackim.github.io/Portfolio/work/aes-256/)

### 2. mordhau — Low resolution + source crop

The 514x321 source already cuts through the top slider/label and leaves most of the frame empty. The Work carousel enlarges it to about 644x402 at 1440px. Phone/retina rendering has even less pixel headroom.

**Action:** Recapture the complete menu at higher resolution and frame the controls tightly.

[Downloaded original](confirmed/02--mordhau--cover.webp) · [Rendered evidence](evidence/02--desktop--mordhau.png) · [Live page](https://pjackim.github.io/Portfolio/work/mordhau/)

### 22. mordhau — Low resolution + poor contrast

Only 514x244. Background patch-note text shows through the gameplay menu and competes with its labels; the capture also ends tightly at the controls. This is visible in the original, not caused by responsive CSS.

**Action:** Recapture at 2x or higher with a clean background and the full menu visible.

[Downloaded original](confirmed/22--mordhau--gameplay-toggles.webp) · [Rendered evidence](evidence/22--desktop--22.png) · [Live page](https://pjackim.github.io/Portfolio/work/mordhau/)

### 3. trip-planner — Portrait source cropped in landscape slot

The Work carousel uses cover fitting on a 901x959 portrait screenshot, cutting away about 41% of its height in a 16:10 slot. The mobile homepage cuts off the app header/footer. Conversely, the desktop homepage shows it only about 131x140, too small to read.

**Action:** Use contain consistently, enlarge the thumbnail area, or provide a separate landscape cover.

[Downloaded original](confirmed/03--trip-planner--cover.webp) · [Rendered evidence](evidence/03--desktop--trip-planner.png) · [Live page](https://pjackim.github.io/Portfolio/work/trip-planner/)

### 54. ant-game — Very dark video poster + capture artifacts

The ant is almost a silhouette against the ground. The original includes development/performance text and an Activate Windows watermark. The scene is hard to identify on desktop and mobile.

**Action:** Choose a brighter gameplay frame and record/export without desktop or debug overlays.

[Downloaded original](confirmed/54--ant-game--yt-MBJ0LGR1R4o.webp) · [Rendered evidence](evidence/54--desktop--54.png) · [Live page](https://pjackim.github.io/Portfolio/work/ant-game/)

### 58. paradox — Dark artwork + baked-in empty margins

The visible banner occupies only a narrow middle band of a 1917x1078 file. Dark empty areas consume most of the image, while the logo and channel name have very low contrast. On phones the actual banner becomes a tiny dark strip.

**Action:** Export the actual banner bounds and improve subject/text contrast; keep the full archived export separately if needed.

[Downloaded original](confirmed/58--paradox--zexilemodz-banner.webp) · [Rendered evidence](evidence/58--desktop--58.png) · [Live page](https://pjackim.github.io/Portfolio/work/paradox/)

### 1. credential-correlation — Homepage crop + low-contrast screenshot

The homepage desktop cover crops the visualizer vertically, trimming interface/annotation content. The source is a full desktop/video frame with small colored labels over a translucent, busy background; it reads poorly as a thumbnail.

**Action:** Use a dedicated, high-contrast cover with a tighter focus on the comparison.

[Downloaded original](confirmed/01--credential-correlation--cover.webp) · [Rendered evidence](evidence/01--home-desktop--1.png) · [Live page](https://pjackim.github.io/Portfolio/work/credential-correlation/)

### 21. credential-correlation — Low-contrast text

The large visualizer image retains small red, green and blue labels over a translucent desktop background. Even the expanded image has weak contrast; reducing it to phone width makes the annotations difficult to read.

**Action:** Capture the app with an opaque background and larger labels, or split it into focused explanatory images.

[Downloaded original](confirmed/21--credential-correlation--gui-visualizer.webp) · [Rendered evidence](evidence/21--desktop--lightbox--21.png) · [Live page](https://pjackim.github.io/Portfolio/work/credential-correlation/)

### 4. the-forest — Homepage crop removes interface context

The desktop homepage renders this 1709x1021 image around 563x177, retaining only about 53% of its height. Parts of the menu and HUD are cut off even though the project is about that interface. The full project image is much better framed.

**Action:** Use a taller card or a separate crop that retains the menu being demonstrated.

[Downloaded original](confirmed/04--the-forest--cover.webp) · [Rendered evidence](evidence/04--home-desktop--4.png) · [Live page](https://pjackim.github.io/Portfolio/work/the-forest/)

### 12. arch-linux — Cover crop trims desktop panels

The source is approximately 16:9, but the Work carousel and project hero use 16:10 cover fitting. The left launcher/avatar and text get cut at the left edge. This is a presentation crop, not a low-resolution original.

**Action:** Use contain for desktop screenshots or supply a 16:10 cover with both edge panels inside the safe area.

[Downloaded original](confirmed/12--arch-linux--cover.webp) · [Rendered evidence](evidence/12--desktop--12.png) · [Live page](https://pjackim.github.io/Portfolio/work/arch-linux/)

### 30. the-forest — Busy background + small menu text

The Forest menu panels are composited over detailed, dark foliage. Small text has weak separation from the scene, particularly at 390px and 320px. The 905px source also has limited retina headroom.

**Action:** Recapture with a quiet background or opaque panels and larger UI text.

[Downloaded original](confirmed/30--the-forest--menu-panels.webp) · [Rendered evidence](evidence/30--mobile--30.png) · [Live page](https://pjackim.github.io/Portfolio/work/the-forest/)

### 35. aes-256 — Poor source framing + unreadable mobile text

The code capture begins partway through a data table and ends at an incomplete function near the lower/right edge. Most of the frame is hexadecimal data; meaningful code becomes tiny on phones. Native inspection confirms the source framing.

**Action:** Export a complete relevant function at a larger font, or render selectable code instead of an image.

[Downloaded original](confirmed/35--aes-256--aes-source-code.webp) · [Rendered evidence](evidence/35--mobile--35.png) · [Live page](https://pjackim.github.io/Portfolio/work/aes-256/)

### 45. ant-game — Source crop + editor residue

The three-quarter sculpt overview cuts off a lower leg at the bottom edge and retains editor gizmo/cursor residue at the right. The original file has the same framing.

**Action:** Zoom out slightly and export a clean viewport render with the whole model inside the frame.

[Downloaded original](confirmed/45--ant-game--sculpt-three-quarter.webp) · [Rendered evidence](evidence/45--desktop--45.png) · [Live page](https://pjackim.github.io/Portfolio/work/ant-game/)

### 37. hero-trivia — Mobile playback button covers poster text

On 390px and 320px layouts the Play button covers the right end of the clue at the bottom of the puzzle poster. The underlying 1168x920 file is adequately sized; this is an overlay problem.

**Action:** Move the control outside the clue area or choose a poster with a reserved control area.

[Downloaded original](confirmed/37--hero-trivia--puzzle-variety.webp) · [Rendered evidence](evidence/37--mobile--37.png) · [Live page](https://pjackim.github.io/Portfolio/work/hero-trivia/)

### 17. credential-correlation — Limited retina resolution

714x219 search-results capture, rendered about 702px wide on the 2x tablet. Small result URLs are soft at reduced phone sizes. It is readable on normal desktop and is not a broken image.

**Action:** Recapture at higher pixel density if this supporting screenshot is retained.

[Downloaded original](review-candidate/17--credential-correlation--password-checker-search.webp) · [Rendered evidence](evidence/17--tablet--17.png) · [Live page](https://pjackim.github.io/Portfolio/work/credential-correlation/)

### 18. credential-correlation — Limited retina resolution

756x206 text image rendered about 631px wide on the 2x tablet. The short line is still readable, but the asset has little high-density headroom.

**Action:** Prefer a styled selectable text example or a higher-density capture.

[Downloaded original](review-candidate/18--credential-correlation--dummy-credentials.webp) · [Rendered evidence](evidence/18--tablet--18.png) · [Live page](https://pjackim.github.io/Portfolio/work/credential-correlation/)

### 19. credential-correlation — Small source + fine text

625x212 screenshot; some secondary labels are faint and small. It is readable at normal desktop scale but cannot provide 2x detail at its tablet display width.

**Action:** Recapture the checker result at higher density and larger text.

[Downloaded original](review-candidate/19--credential-correlation--checker-rated-strong.webp) · [Rendered evidence](evidence/19--tablet--19.png) · [Live page](https://pjackim.github.io/Portfolio/work/credential-correlation/)

### 20. credential-correlation — Small supporting text

768x383 screenshot. The main result remains legible, but small explanatory copy is hard to read on phones and the source is undersized for 2x tablet rendering.

**Action:** Recapture with larger copy or crop to the relevant result and reproduce its explanation as page text.

[Downloaded original](review-candidate/20--credential-correlation--checker-crack-time.webp) · [Rendered evidence](evidence/20--mobile--20.png) · [Live page](https://pjackim.github.io/Portfolio/work/credential-correlation/)

### 23. trip-planner — Dense UI at phone size

The trip-manager modal contains a long list of very small text. At roughly 308px displayed width on mobile it is difficult to read. The full-size source is better; this is mainly presentation/readability.

**Action:** Use a tighter detail screenshot or annotate the save/load controls; retain the complete view in the lightbox.

[Downloaded original](review-candidate/23--trip-planner--trip-manager.webp) · [Rendered evidence](evidence/23--mobile--23.png) · [Live page](https://pjackim.github.io/Portfolio/work/trip-planner/)

### 34. hardpoint — Debug overlay in poster

The Hardpoint poster contains a prominent PHYSX CPU overlay in the upper left and a large foreground weapon. Its resolution is acceptable, but a cleaner frame would present the game mode better.

**Action:** Select a clean capture-zone/scoring frame without the debug overlay.

[Downloaded original](review-candidate/34--hardpoint--yt-EdJRI.webp) · [Rendered evidence](evidence/34--desktop--34.png) · [Live page](https://pjackim.github.io/Portfolio/work/hardpoint/)

### 44. arch-linux — Narrow source + fine text

487x1009 portrait launcher capture. It is only about 340px wide on desktop and has small quote/menu text; 2x/3x displays expose its limited source resolution.

**Action:** Recapture at higher density or focus on one panel; keep the full screenshot as secondary detail.

[Downloaded original](review-candidate/44--arch-linux--launcher-panel.webp) · [Rendered evidence](evidence/44--mobile--44.png) · [Live page](https://pjackim.github.io/Portfolio/work/arch-linux/)

### 55. go-green — Embedded paragraph too small on phones

The source is 1920x1080 and is not intrinsically low resolution. Its paragraph is packed into a small corner, so it becomes illegible at 343px and 276px displayed widths.

**Action:** Add a readable text transcription or a separate close-up of the paragraph.

[Downloaded original](review-candidate/55--go-green--brochure-with-text.webp) · [Rendered evidence](evidence/55--mobile--55.png) · [Live page](https://pjackim.github.io/Portfolio/work/go-green/)

## Other observations

- At 320px, every tested page reports horizontal overflow. Work measured 337px document width for a 320px viewport. Treat this as a separate narrow-screen layout issue rather than evidence of corrupt photos.
- Hero Trivia background blur, the Arch Linux pixel-art wallpaper, deliberate ant detail close-ups and smoke/cloud effects were not automatically classified as bad resolution.
- The portrait, logo exports, most renders and scenic images had no material image-quality defect identified at these sizes. Dense diagrams/screenshots still benefit from their full-size links.
- Contact sheets are overview aids and may resize thumbnails. Use the original file and individual evidence screenshot to judge sharpness.

The parent audit folder retains all 100 page screenshots, full asset inventory, 61 reference downloads, image/viewport measurements, all lightbox captures, and repeatable browser scripts. Website source files were not edited.
