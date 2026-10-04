# Old-snapshot image review (Jev)

Snapshot: commit `60c6578` (2024-02-08), the last commit on or before 2026-01-29 (8 months before 2026-09-29; history has no commits between 2024-02-08 and 2026-09-25). Static HTML/Bootstrap site; 68 showcase images under `Images/` plus `img/team/1.jpg` (UI chrome excluded).

Same method as the current-site second pass (`audit-photos/jev-review`), **standalone half only**: code-measured facts (`facts.mjs`, thresholds unchanged) -> blind vision-agent observation (`observations/standalone/`) -> Jev score/choice/noul answers + severity and remedy classifiers (`jev/standalone/`) -> `compose.mjs` (same weights, flag level 1.5, tier rules). **No in-place views**: the 2024 site was not served or captured, so nothing here says how an image looked on a page. GIFs are judged on frame 1 only. Observers could not open assets 22 and 66 (over 20 MB) at native size and described downscaled copies; their sharpness statements are correspondingly weak.

## Summary

- Tiers: **15 Issue**, 36 Watch, 17 Clean of 68. Mean composite 67.3/100 (50 = "acceptable" on the rubric).
- Comparison, current site's standalone half (same rubric and rules, 61 different assets, `../../../../audit-photos/jev-review/results.json` in the main checkout): 16 Issue / 36 Watch / 9 Clean, mean 63.9. Different asset sets and no in-place half here, so read this as context, not a regression measure.
- Jev severity: {"moderate":40,"severe":21,"none":7}; primary issue: {"poor_framing_or_dead_space":31,"artifacts_or_overlays":16,"low_resolution":2,"low_contrast_or_dark":12,"other":4,"unreadable_text":1,"busy_background":2}.
- Remedy among Issue/Watch: {"recrop-or-recapture":44,"gentle-ai-touchup":6,"replace":1}.

## Per-project rollup

| Project                | Images | Mean | Worst      | Issue | Watch | Clean |
| ---------------------- | ------ | ---- | ---------- | ----- | ----- | ----- |
| aes                    | 1      | 68.9 | 68.9 (#37) | 0     | 1     | 0     |
| alvin                  | 4      | 74.1 | 65.2 (#3)  | 3     | 0     | 1     |
| ant-game               | 10     | 64.4 | 41.8 (#13) | 3     | 7     | 0     |
| arch-linux             | 3      | 74.8 | 68 (#38)   | 0     | 2     | 1     |
| correlation-visualizer | 5      | 72.0 | 64.3 (#43) | 1     | 2     | 2     |
| cs314                  | 8      | 64.1 | 56.1 (#46) | 1     | 5     | 2     |
| forest-hack            | 3      | 62.1 | 59.9 (#15) | 2     | 0     | 1     |
| fovhack                | 5      | 55.3 | 46.1 (#57) | 0     | 5     | 0     |
| go-green               | 4      | 89.3 | 84.1 (#20) | 0     | 0     | 4     |
| hardpoint              | 3      | 64.9 | 56.4 (#61) | 1     | 1     | 1     |
| hero-trivia            | 4      | 67.9 | 62.8 (#64) | 0     | 3     | 1     |
| lost-city              | 3      | 61.6 | 57.6 (#22) | 2     | 1     | 0     |
| nodes                  | 2      | 71.0 | 69.4 (#26) | 0     | 1     | 1     |
| over-the-rainbow       | 1      | 56.3 | 56.3 (#27) | 0     | 1     | 0     |
| paradox                | 5      | 57.1 | 29.3 (#30) | 2     | 2     | 1     |
| self                   | 2      | 72.3 | 68.8 (#67) | 0     | 1     | 1     |
| spectre                | 4      | 80.7 | 73.2 (#33) | 0     | 3     | 1     |
| team                   | 1      | 49.2 | 49.2 (#68) | 0     | 1     | 0     |

## Issue tier (Jev classifier says severe AND the scorer flags a dimension)

| #   | File                                   | Pixels    | Overall | Flagged dimensions                                                                       | Primary issue              | Remedy              | What the blind observer saw                                                                                                                                                                                                    |
| --- | -------------------------------------- | --------- | ------- | ---------------------------------------------------------------------------------------- | -------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 30  | Paradox/paradox2.png                   | 1917x1078 | 29.3    | resolution headroom, framing, contrast exposure, artifact cleanliness, scan first impact | poor_framing_or_dead_space | recrop-or-recapture | The banner strip occupies a narrow horizontal band at the vertical centre; large empty flat grey areas above and below; logo in the centre of the band, text to its right.                                                     |
| 29  | Paradox/paradox1.png                   | 1917x1078 | 30      | resolution headroom, framing, contrast exposure, artifact cleanliness, scan first impact | poor_framing_or_dead_space | recrop-or-recapture | The banner strip occupies a narrow horizontal band at the vertical centre; large empty flat grey areas above and below; logo sits in the centre of the band, text to its right.                                                |
| 13  | Ant Game/Ant Rig/ant_rig1.png          | 1904x980  | 41.8    | resolution headroom, framing, contrast exposure, artifact cleanliness                    | poor_framing_or_dead_space | recrop-or-recapture | Ant centered with controls extending below; wide viewport with large empty grey margins left and right and below.                                                                                                              |
| 14  | Ant Game/Ant Rig/ant_rig2.png          | 1909x977  | 46.2    | resolution headroom, framing, contrast exposure, artifact cleanliness                    | artifacts_or_overlays      | recrop-or-recapture | Ant centered in a wide viewport; large empty grey margins; skeleton overlays across body.                                                                                                                                      |
| 46  | cs314/database.gif                     | 967x911   | 56.1    | framing, artifact cleanliness                                                            | poor_framing_or_dead_space | recrop-or-recapture | Portrait-ish; header at top, search bar, trip row, then large empty white area filling most of the frame; map button bottom right; right edge cuts off search buttons.                                                         |
| 61  | hardpoint/hpt-thumbnail.jpg            | 1920x1080 | 56.4    | framing                                                                                  | poor_framing_or_dead_space | recrop-or-recapture | Blocks frame left and right; yellow grid patch sits at centre; sky occupies a thin top strip; lower half is empty floor and foreground blocks.                                                                                 |
| 22  | Lost City/city_creep.png               | 2880x1800 | 57.6    | contrast exposure                                                                        | low_contrast_or_dark       | recrop-or-recapture | Full-frame forest; figure sits right of centre, standing on mossy rocks; text box in upper left; cobblestone path and utility pole occupy the right edge and bottom right corner. Nothing cut off except the pole at the edge. |
| 15  | Forest Hack/ESP.png                    | 1709x1021 | 59.9    | artifact cleanliness                                                                     | artifacts_or_overlays      | recrop-or-recapture | Menu column occupies left quarter; character right of centre; stick diagonal in right foreground; status ring at lower right; dense foliage top.                                                                               |
| 7   | Ant Game/Ant Model/ant3.png            | 1174x806  | 63.9    | framing                                                                                  | poor_framing_or_dead_space | recrop-or-recapture | Model fills most of frame; head at upper left, abdomen at lower right, legs cut off at left and bottom edges; thin horizontal line near top edge.                                                                              |
| 23  | Lost City/forest.png                   | 2880x1800 | 65      | contrast exposure                                                                        | low_contrast_or_dark       | gentle-ai-touchup   | Full-frame forest; figure right of centre standing on a mossy mound; text box upper left; small name label bottom right corner. No empty space; subject not cropped.                                                           |
| 3   | Alvin/nug.png                          | 1364x1288 | 65.2    | text legibility, framing                                                                 | poor_framing_or_dead_space | recrop-or-recapture | Crop fills frame with leaves and buds diagonal from upper right to lower left; dark empty area at lower right; red hoodie cut off at left edge.                                                                                |
| 16  | Forest Hack/Screenshot_1.png           | 1916x1075 | 65.7    | artifact cleanliness                                                                     | artifacts_or_overlays      | recrop-or-recapture | Menu panel left third; stick vertical near centre; foliage above; title bar strip at top; HUD text lower left.                                                                                                                 |
| 2   | Alvin/Alvin.png                        | 8426x4473 | 72.6    | framing                                                                                  | poor_framing_or_dead_space | recrop-or-recapture | Emblem sits in right half; roughly left 40% of the canvas is empty dark space; margins above and below; nothing cut off.                                                                                                       |
| 4   | Alvin/zoom.png                         | 2242x1341 | 72.9    | framing                                                                                  | poor_framing_or_dead_space | recrop-or-recapture | Leaves arc across the upper half; letters and chipmunk head cut off at bottom edge; dark band at top; left and right edges cut through the wreath.                                                                             |
| 42  | correlation_visualizer/credentials.png | 756x206   | 77.7    | framing                                                                                  | poor_framing_or_dead_space | replace             | Landscape strip; dark rounded rectangle centred with white margin all around; text sits left-centre with empty dark space at right.                                                                                            |

## Watch tier

| #   | File                                    | Pixels    | Overall | Severity | Flagged dimensions                                 | Primary issue              | Remedy              |
| --- | --------------------------------------- | --------- | ------- | -------- | -------------------------------------------------- | -------------------------- | ------------------- |
| 57  | fovhack/screenshot-gameplay.jpg         | 514x917   | 46.1    | severe   | resolution headroom, framing, artifact cleanliness | artifacts_or_overlays      | recrop-or-recapture |
| 68  | img/team/1.jpg                          | 300x300   | 49.2    | moderate | resolution headroom, framing, contrast exposure    | poor_framing_or_dead_space | gentle-ai-touchup   |
| 55  | fovhack/fov_preview.png                 | 1669x854  | 49.8    | moderate | resolution headroom, framing, artifact cleanliness | poor_framing_or_dead_space | recrop-or-recapture |
| 58  | fovhack/screenshot-overview.jpg         | 1920x1080 | 53.7    | moderate | framing, artifact cleanliness                      | artifacts_or_overlays      | recrop-or-recapture |
| 27  | Over The Rainbow/over_the_rainbow.png   | 1920x1080 | 56.3    | moderate | resolution headroom, framing                       | poor_framing_or_dead_space | recrop-or-recapture |
| 50  | cs314/itinerary.png                     | 901x959   | 58.7    | moderate | framing                                            | poor_framing_or_dead_space | recrop-or-recapture |
| 49  | cs314/iterative_design.gif              | 982x927   | 58.9    | moderate | -                                                  | artifacts_or_overlays      | recrop-or-recapture |
| 5   | Ant Game/Ant Model/ant1.png             | 1274x772  | 59.8    | severe   | artifact cleanliness                               | artifacts_or_overlays      | recrop-or-recapture |
| 54  | fovhack/fov_demo.gif                    | 1280x655  | 61.3    | moderate | resolution headroom                                | artifacts_or_overlays      | gentle-ai-touchup   |
| 24  | Lost City/website.gif                   | 906x948   | 62.2    | moderate | artifact cleanliness                               | artifacts_or_overlays      | recrop-or-recapture |
| 64  | hero_trivia/hero_trivia_gameplay.gif    | 1168x920  | 62.8    | severe   | artifact cleanliness                               | artifacts_or_overlays      | recrop-or-recapture |
| 53  | cs314/website.gif                       | 906x948   | 63.3    | moderate | artifact cleanliness                               | artifacts_or_overlays      | recrop-or-recapture |
| 43  | correlation_visualizer/googlesearch.png | 714x219   | 64.3    | severe   | -                                                  | low_contrast_or_dark       | recrop-or-recapture |
| 56  | fovhack/screenshot-cosmetic.jpg         | 833x962   | 65.8    | moderate | -                                                  | low_contrast_or_dark       | gentle-ai-touchup   |
| 28  | Paradox/exileLogo.png                   | 800x800   | 66.3    | moderate | resolution headroom                                | low_contrast_or_dark       | gentle-ai-touchup   |
| 63  | hero_trivia/Hero_Trivia_2.png           | 1894x949  | 66.5    | moderate | artifact cleanliness                               | artifacts_or_overlays      | recrop-or-recapture |
| 41  | correlation_visualizer/Software.png     | 1578x1015 | 67.1    | moderate | framing                                            | poor_framing_or_dead_space | recrop-or-recapture |
| 12  | Ant Game/Ant Model/texture4.png         | 1394x934  | 67.3    | moderate | framing                                            | poor_framing_or_dead_space | recrop-or-recapture |
| 8   | Ant Game/Ant Model/ant4.png             | 617x781   | 67.4    | moderate | -                                                  | low_resolution             | recrop-or-recapture |
| 48  | cs314/interopt.gif                      | 982x927   | 67.7    | moderate | artifact cleanliness                               | artifacts_or_overlays      | recrop-or-recapture |
| 51  | cs314/map.png                           | 901x959   | 67.9    | moderate | framing                                            | artifacts_or_overlays      | recrop-or-recapture |
| 38  | arch linux/bottom.png                   | 1920x1077 | 68      | moderate | -                                                  | low_contrast_or_dark       | recrop-or-recapture |
| 67  | self/canyonSelfie.JPG                   | 1242x2208 | 68.8    | moderate | resolution headroom                                | low_resolution             | gentle-ai-touchup   |
| 37  | aes/Screenshot_1.png                    | 762x920   | 68.9    | moderate | framing                                            | poor_framing_or_dead_space | recrop-or-recapture |
| 26  | Nodes/transparant_bracelet.png          | 1920x1080 | 69.4    | moderate | framing                                            | poor_framing_or_dead_space | recrop-or-recapture |
| 9   | Ant Game/Ant Model/texture1.png         | 1108x917  | 70.2    | moderate | framing                                            | poor_framing_or_dead_space | recrop-or-recapture |
| 62  | hero_trivia/Hero_Trivia_1.png           | 1894x949  | 70.6    | moderate | -                                                  | artifacts_or_overlays      | recrop-or-recapture |
| 11  | Ant Game/Ant Model/texture3.png         | 1390x933  | 72.4    | severe   | framing                                            | poor_framing_or_dead_space | recrop-or-recapture |
| 60  | hardpoint/hpt-action2.jpg               | 1920x1080 | 72.4    | moderate | framing                                            | poor_framing_or_dead_space | recrop-or-recapture |
| 40  | arch linux/trim.png                     | 487x1009  | 72.9    | moderate | framing                                            | poor_framing_or_dead_space | recrop-or-recapture |
| 33  | Spectre/black_bg.png                    | 2560x1440 | 73.2    | moderate | framing                                            | poor_framing_or_dead_space | recrop-or-recapture |
| 6   | Ant Game/Ant Model/ant2.png             | 1180x781  | 73.5    | moderate | framing                                            | poor_framing_or_dead_space | recrop-or-recapture |
| 31  | Paradox/paradox3.png                    | 1920x1080 | 77.1    | moderate | framing                                            | poor_framing_or_dead_space | recrop-or-recapture |
| 34  | Spectre/centered_bg.png                 | 3840x2160 | 80.1    | none     | framing                                            | poor_framing_or_dead_space | recrop-or-recapture |
| 10  | Ant Game/Ant Model/texture2.png         | 1379x933  | 81.1    | none     | framing                                            | poor_framing_or_dead_space | recrop-or-recapture |
| 36  | Spectre/white_bg.png                    | 1920x1080 | 82.2    | moderate | framing                                            | poor_framing_or_dead_space | recrop-or-recapture |

## Clean

21 Go Green/original.jpg (93.2); 19 Go Green/brochure.png (90.1); 18 Go Green/Brochure.png (89.9); 35 Spectre/logo_white.png (87.2); 1 Alvin/Alvin - Copy.png (85.5); 20 Go Green/brochure_text.png (84.1); 39 arch linux/screenshot1.png (83.4); 32 Paradox/red_paradox.png (82.9); 45 correlation_visualizer/trap2.png (80.7); 66 self/IMG_6540.jpg (75.7); 52 cs314/optimize.gif (74.5); 25 Nodes/node_diagram.png (72.6); 65 hero_trivia/hero_trivia_variety.gif (71.9); 44 correlation_visualizer/trap1.png (70.1); 47 cs314/file.png (66.1); 59 hardpoint/hpt-action1.jpg (65.8); 17 Forest Hack/UX.png (60.6)

## Caveats

- Scores are Jev's literal read of a vision agent's description plus measured buckets; they rank assets, they do not prove a defect.
- Assets referenced by no HTML page: #18, #24, #29, #50, #54, #63, #66, #68.
- Reproduce (from this folder): `node assets.mjs && node facts.mjs`, observation agents, Jev run (eval body in the session, mirrors `run-jev.body.js`), `node compose.mjs && node report.mjs`.
