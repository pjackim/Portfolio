# Featured ranking: technical merit and page marketability (2026-10-04)

**Scope:** every non-design project (14 of 21; the seven design-only projects are out of scope). Re-ranks the `featured` list and its `order`.
**Branch audited:** `content/rank-featured-by-merit` on `master` @ `5ce2fae`
**Evidence:** light-theme captures at 390 and 1280 px of the home page, `/work/` and every project page, plus each project's source repo where one exists locally.

## Result

Six projects are featured, in this order: **BodyCam External, Mordhau, Credential Correlation Visualizer, ArcExploit, TongueTickle, The Forest**. Six fills the bento exactly (the lead, two large cells, one row of three), and the scores fall off a cliff after the first three and go flat after the sixth. Trip Planner, Hardpoint, AES-256 and the draft Inline Completion Agent Framework leave the featured list; they stay on `/work/`.

## Method

1. **Four independent assessments per project.** Two technical assessors measured the source repo themselves (lines of code, subsystems, tests, commit history; projects with no local repo were scored from the page, its media and the legacy site, at lower confidence) and scored **complexity** and **impressiveness** (1–10, with anchors). Two page assessors scored **marketability** (first glance, scanability, visuals, narrative, polish) from the screenshots and the page source, for a lazy scanner who reads little and clicks nothing.
2. **One adversarial reconciler per project** re-measured at least two of the technical assessors' claims, opened the screenshots, settled any disagreement of 2+ points, and wrote the final scorecard.
3. **A three-judge panel** (security hiring manager, senior engineer, design lead and fast scanner) saw every final scorecard and ranked all 14 independently, then picked a feature set.

**Composite** = 0.5 × merit + 0.5 × marketability, where merit = 0.4 × complexity + 0.6 × impressiveness. A very complex project communicated poorly is penalised as much as a polished page for thin work. The published order is identical at 70/30 and at 30/70 merit-to-marketability weightings, except that at 30/70 ArcExploit and TongueTickle (5.02) draw level with Credential Correlation (5.00). **Borda** is the panel's rank points (14 minus rank, summed over three judges); **Votes** is how many judges put the project in their feature set.

## Scores

| Composite rank | Project                                   | Complexity | Impressiveness | Marketability | Merit | Composite | Borda | Votes | Now                   | Was     |
| -------------: | ----------------------------------------- | ---------: | -------------: | ------------: | ----: | --------: | ----: | ----: | --------------------- | ------- |
|              1 | BodyCam External                          |          8 |            7.8 |           7.5 |  7.88 |  **7.69** |    39 |   3/3 | **featured, order 1** | order 1 |
|              2 | Mordhau — Runtime Memory Patching         |          5 |            5.2 |             6 |  5.12 |  **5.56** |    36 |   3/3 | **featured, order 2** | order 3 |
|              3 | Credential Correlation Visualizer         |          5 |              5 |             5 |     5 |     **5** |    33 |   3/3 | **featured, order 3** | order 2 |
|              4 | ArcExploit                                |        4.5 |            3.5 |           5.5 |   3.9 |   **4.7** |    29 |   2/3 | **featured, order 4** | —       |
|              5 | TongueTickle                              |        4.5 |            3.5 |           5.5 |   3.9 |   **4.7** |    26 |   1/3 | **featured, order 5** | —       |
|              6 | Hardpoint Game Mode                       |        3.5 |            4.5 |             5 |   4.1 |  **4.55** |    23 |   1/3 | not featured          | order 6 |
|              7 | The Forest — Mono Injection               |          4 |              4 |             5 |     4 |   **4.5** |    24 |   2/3 | **featured, order 6** | order 5 |
|              8 | Trip Planner                              |        3.5 |              3 |             5 |   3.2 |   **4.1** |    16 |   0/3 | not featured          | order 4 |
|              9 | Arch Linux                                |          3 |              3 |             5 |     3 |     **4** |     9 |   0/3 | not featured          | —       |
|             10 | Hero Trivia                               |          3 |            2.8 |             5 |  2.88 |  **3.94** |     6 |   0/3 | not featured          | —       |
|             11 | Inline Completion Agent Framework (draft) |        5.5 |            4.5 |             2 |   4.9 |  **3.45** |    17 |   0/3 | not featured          | order 8 |
|             12 | AES-256 Encryptor                         |          3 |            2.5 |             4 |   2.7 |  **3.35** |     3 |   0/3 | not featured          | order 7 |
|             13 | Quality (draft)                           |          5 |              4 |             2 |   4.4 |   **3.2** |    12 |   0/3 | not featured          | —       |
|             14 | LichessApp (draft)                        |          2 |            1.8 |             4 |  1.88 |  **2.94** |     0 |   0/3 | not featured          | —       |

## Decisions

- **BodyCam External (lead).** Leads every axis by about three points: a hand-assembled `ProcessEvent` trampoline, structure-based discovery of engine globals, Blueprint bytecode patching, 26 offline checks, and four 1080p loops of something a visitor would assume is impossible. Unanimous.
- **Mordhau and Credential Correlation (large cells).** Unanimous for slots 2 and 3. Mordhau reads as reverse engineering from its stack strip alone; Credential Correlation has the sharpest security hook and is the only ML and big-data representative. Both are mid-tier on proof (no code or results visible), so they hold their place on audience fit rather than depth.
- **ArcExploit and TongueTickle (new).** They tie on composite (4.70). Both are finished, recent, verifiable (ArcExploit: 12k lines and a packaged exe; TongueTickle: 207 passing tests) and have real in-app covers. ArcExploit is thin technically (a drop wrapper plus timed macros) and never shows its payoff; TongueTickle is a consumer utility with no security signal, and one judge left it out for that reason. Both beat the projects they replace.
- **The Forest over Hardpoint (close call).** Hardpoint edges The Forest on composite by 0.05, which is noise. The Forest wins on panel Borda (24 vs 23) and votes (2 vs 1): a vivid cover and the build-it-then-teach-it story, against Hardpoint's grey cover, no repo link for its open-source claim and no loop. Swap them if you weigh a paid client commission over a teaching story.
- **Dropped from featured.** Trip Planner (team coursework, no stated personal contribution, small letterboxed cover), AES-256 (no verifiable source, dark illegible cover, lowest published scores), Hardpoint (above), and the draft Inline Completion Agent Framework. Inline Completion was `featured: true` while `draft: true` with a "Cover pending" placeholder; it is now `featured: false`, so un-drafting it can't silently put a placeholder in a featured cell. With a real cover and media the panel put it around rank 5–6, so it is the best candidate to feature once it is published.

## Drafts

`inline-completions`, `quality` and `lichess-app` are hidden drafts. They were scored on their current pages but cannot be featured; publishing is Parker's call. `quality` and `inline-completions` score 2/10 on marketability only because of "Cover pending" placeholders and missing media, and would move up several places with real media and links. `lichess-app` stays at the bottom either way.

## Flagged, not changed

Findings from the assessors that are content or fact decisions for Parker, outside a featured-list change:

- **Hardpoint:** "open-sourced on GitHub" has no link or repo anywhere on the page. Needs the repo URL or softer wording.
- **Credential Correlation:** `year: 2023` against a résumé that says Fall 2022; the page shows no score output or result.
- **BodyCam External:** no plain sentence says what is hard (attaching to a closed-source shipping build and hooking it safely); the gallery heading says "FIGURES 04" with eight figures.
- **ArcExploit:** the `offensive-security` tag and "exploit" framing read stronger than the code (input automation plus a Clumsy-style WinDivert drop wrapper), and the page never shows a duplicated item. Its four highlights now render, since highlights show only on featured pages.
- **TongueTickle:** the core promise (highlight text in another app, hear it) is never shown in motion.
- **The Forest:** "discovered basic network vulnerabilities" is sourced to the legacy site (`foresthack.html:97,139`), but the repo has no network code, so a reader who opens it won't find support. It also feeds `src/data/taxonomy.ts`.
- **AI co-authorship:** commit trailers show Claude co-authorship on 36% of BodyCam External, 76% of TongueTickle and 84% of Quality commits. It was not penalised in the scores (Parker's repos are meant to go public), but first-person copy such as "I built" is worth a wording check before the repos are linked.

## Per-project verdicts

### BodyCam External

The strongest project in the set: a genuinely deep, measured UE5 reverse-engineering codebase (complexity 8, impressiveness 7.8) shown with striking real demo footage on a clean, honest page (marketability 7.5), held back only by repeated imagery and the missing 'why this is hard' line. It deserves the top featured slot.

- **Best asset:** Real footage of a tool controlling a live Unreal Engine 5 game: the red-lit cover plus four 1080p loops (placing and recolouring a light, a map-click teleport, a zombie spawned in a mode that has none, a laser and outline built from real actors). It shows something a visitor would assume is impossible, and a deep, measured repo stands behind it (hand-assembled ProcessEvent trampoline, structure-based discovery of engine globals, Blueprint bytecode patching, minidump-driven crash triage, 26 passing offline checks). It is already the #1 hero slot on /work/.
- **Biggest gap:** The page never says what is hard. It shows what the tool does but does not say that an external Python process attaches to a running closed-source UE5 shipping build, finds the engine's internals by structure and injects its own code safely. 'Reverse engineering' is one chip. A skimming security hiring manager reads 'cool mod, built fast, may break' and not 'high-tier systems work'. One plain sentence or a small tool-game-hook diagram would fix this at no reading cost. The repeated, near-identical panel screenshots also use space that could show different capabilities.

### Mordhau — Runtime Memory Patching

A credible mid-weight solo game-hack that is honestly presented with real visuals, but it is unverifiable beneath the screenshots and its home tile and cover under-sell it: complexity 5, impressiveness 5.2, marketability 6.0.

- **Best asset:** A real, sold product. The cover alone proves a working in-process menu, skinned to match Mordhau's UI, with ten gameplay toggles, FOV 130 and TurncapX/Y sliders and a 9-slot armour-ID editor, running on the live game at Release Build #24 in Dec 2021. The plain TL;DR ('A cheat I wrote in 2021... and sold access to') is honest and also covers keys, UX and support.
- **Biggest gap:** Nothing shows or quantifies how it was built or how well it did. There is no code or repo, no patching or injection diagram, no offsets or patch-survival story, and no users or sales numbers. The wow moment, FOV widening and the fisheye gameplay frame, is below the fold behind a play button or buried as Fig 03, not on the cover or the home card.

### Credential Correlation Visualizer

A mid-tier project: sharp security hook and a distinctive visualizer over an unverifiable, results-free data and ML claim, so it scores 5 across the board and sits high at featured order 2 on the strength of the hook alone.

- **Best asset:** The hook: a password that simply repeats its username is rated 'Strong' (and '53 million years') by real online checkers, shown in the checkers' own screenshots, paired with a distinctive colour-arrow visualizer and a demo one tap away. A 120M-credential Spark and ML pipeline is named behind it.
- **Biggest gap:** The page never shows the build or its result. There is no score output, accuracy or validation, before/after run of the Strong-rated password through the visualizer, or data and pipeline visual. The impressive half (120M-record data engineering, featurization, model) is only text bullets. The one real screenshot is a dim cover that fails at card and phone sizes, repeated three times.

### ArcExploit

A polished, honestly presented game-dupe macro tool that is wide but shallow technically and never shows its payoff, so do not feature it ahead of research-grade work.

- **Best asset:** A real, finished, shipped artifact shown running over the actual game: an in-game recording with the status overlay flipping Online/NET DROP/RECONNECTED, a striking striped-wordmark control panel, and a clean, honest, fact-only page. 12K lines, a packaged exe, five routines plus record/replay.
- **Biggest gap:** No visible result and no signal of difficulty or security framing. A skimmer sees a game-cheat control panel and a limitations note, not evidence of packet-level or timing engineering. Underneath, the technical core is thin (a Clumsy-style drop wrapper plus hard-coded timing sequences, no research into why the dupe works), and the domain is an awkward fit for a security hiring audience.

### TongueTickle

A tidy, well-tested, honestly labelled consumer text-to-speech utility (complexity 4.5, impressiveness 3.5) with a competent but plain page (marketability 5.5), so it should not be among the featured projects.

- **Best asset:** A crisp, real dark cover of the actual app (the serif 'Hear anything on your screen, in a voice you chose.' headline with Ctrl+Shift+S key caps), a legible flow and provider-priority diagram that shows a graceful-degradation design ending in a free offline voice that needs no account, and an unusually honest 'Where it stands' section. Behind it sits a 207-test suite with a shared provider contract.
- **Biggest gap:** The core promise, highlighting text in any other app and hearing it, is never shown anywhere. Every visual is the TongueTickle window itself, the loop is silent and sparse, and the Grok auto-express feature is unreadable at page width. On top of that, the project is AI-heavy (76% of commits), unfinished and live-untested for its AI voices, and has no security relevance for the target audience.

### Hardpoint Game Mode

A real but modest 2021 paid game-mod gig, at the bottom of the featured set for technical depth, whose page is competent but undersold by a grey cover, no motion, no repo link and no proof of the adoption it claims.

- **Best asset:** A paid commission from a real competitive community for a networked game mode that, per Parker, shipped as open source and was used in leagues. The corridor and melee stills show the mechanic running with a live fight over a glowing zone, in full-resolution in-engine frames.
- **Biggest gap:** Nothing verifiable and nothing moving. There is no repo link, no named tournaments or leagues, and no clip of the point relocating or being contested, so the only evidence for the impressive claim is Parker's own sentence. Its domain (a game-mode mod) is also tangential to the security and systems work the audience values.

### The Forest — Mono Injection

A genuine but entry-level managed-code Unity game hack (4/4/5): its real in-game cover and teaching story make a fair mid-tier featured slot (currently order 5). The unsupported network-vulnerability claim and the empty or biographical captions should be fixed.

- **Best asset:** The teaching outcome: Parker turned his own hack codebase into an original beginner curriculum and taught students aged 18-20. It is on the page surface (TL;DR and Outcome), corroborated by the legacy page, the résumé and the home-page experience log, and the extensible menu framework was explicitly designed for learners. Paired with a real in-game cover showing the injected menu and ESP skeleton, it is a credible 'built it, then taught it' story.
- **Biggest gap:** The page shows no moving proof and no real depth. There is no loop or captioned demo of the ESP, fly mode or horde spawn, and no explanation of how the injection works. 'Basic network vulnerabilities' is a headline claim with no artifact, which is a credibility risk for a security audience. Pair that with a small, early, managed-only 1.6k-line codebase (3 commits, no tests, stubs), and a skimmer concludes 'early learning project' rather than evidence of strong RE skill.

### Trip Planner

An honest, tidy team-coursework page with one genuinely nice proof clip, but it is unverifiable, role-less and plain-covered, so it is a weak candidate for a top-4 featured slot.

- **Best asset:** The 7-second autoplay loop of a tangled 636,462 mi world trip collapsing into a single 86,942 mi loop (86% shorter, 7.3x) under a stated one-second requirement. It is real footage of a real result, and the TL;DR next to it is plain and honest.
- **Biggest gap:** There is no source repo, no stated individual contribution, and no verifiable depth. It is team coursework on inherited code that Parker's own resume marks reference-only. The page also leads with CMMI process and a small letterboxed map cover instead of the optimization payoff.

### Arch Linux

A genuinely attractive self-taught Linux desktop with a striking cover, but it is configuration of third-party tools (complexity 3, impressiveness 3), and the page is plain, repetitive and buried (marketability 5), so it should not be featured rather than the featured list.

- **Best asset:** A real, vivid, coherent screenshot of a hand-built three-monitor desktop (custom launcher, eww widgets, polybar, one palette) on a short, clean page with the repo one click away. It signals taste, initiative and a self-taught-from-zero arc to a scanner within seconds.
- **Biggest gap:** The page never says what was actually built: a bspwm tiling WM with sxhkd hotkeys, per-monitor eww widget panels, Python/Bash glue launching sticky widget windows, and a 3-monitor layout. It also never ties the project to Parker's later security and systems work, so a scanner leaves with 'a beginner themed Linux in 2020'. It is also invisible on /work/ and home, and the linked repo has a committed OpenWeatherMap key plus build and cache junk, which a security-focused reviewer could notice.

### Hero Trivia

A polished-looking but self-declared 2022 freelance React crossword prototype with no inspectable code or live demo: low complexity (3), modest impressiveness (2.8), and an honest but thin, hedge-heavy page (5) that should not be featured.

- **Best asset:** The cover and loops are real captures of a distinctive, themed game UI (glowing hint-word crossword over a blurred comic collage with a logo). The game's concept is clear in about two seconds on desktop, and the page is candid about its scope.
- **Biggest gap:** The page never shows what was clever or hard. It does not show how each puzzle's crossing layout is generated, what the comic data sets were or how big they were, or any outcome for the client. The visuals are one screen repeated, and there is no source or live demo to back the claims.

### Inline Completion Agent Framework (draft)

A well-structured but mainstream AI-tooling extension (complexity 5.5, impressiveness 4.5) whose page is a placeholder (marketability 2), so it should stay out of the featured set until real media exists and ranks below the security and injection projects even then.

- **Best asset:** A visibly careful safety design around AI file edits: ask-first permissions, a workspace path sandbox, a repeated-call loop guard, and snapshot-before-edit with native diff and one-command Revert All. This is real in the code (permissions.ts, checkpointService.ts) and is the one angle that speaks to a security-minded reader. It is built on a vendor-neutral, bring-your-own-key provider layer inside a type-clean, bundled VS Code extension.
- **Biggest gap:** There is no visible proof of the thing on the page. Show a real screen capture of ghost-text acceptance, the provider picker and the agent before/after diff with the Revert All action, replacing the 'Cover pending' slab. Behind that, the project is mainstream AI tooling with no security or systems core, early v0.0.1, built in about 3 days with AI help, and the best NES and FIM work is still uncommitted.

### AES-256 Encryptor

A charming, honestly framed teenage utility that works but is thin on provable engineering. It scores about 3 / 2.5 / 4 and is the weakest of the featured set, not a featured slot.

- **Best asset:** A real, working end-to-end demo, in the author's own recorded run, of a recursive encryptor walking a 13-directory, 55-file tree and printing 'Successfully Encrypted' per file. It is paired with an honest 'wrote this at 15' origin story that matches the home page's Age 15 timeline node.
- **Biggest gap:** There is no verifiable source (no repo, no tests, no history). The cipher appears vendored, key handling looks naive, and the date conflicts with the 2021 build timestamps. So the page rests on the author's age rather than on evidence of ability, and a security-literate reader will discount it.

### Quality (draft)

A rigorous but thin, AI-assisted 2-day wrapper (complexity 5, impressiveness 4) presented as an unpublished draft with a 'Cover pending' placeholder and zero visuals (marketability 2), so it should not be featured until it has a real terminal capture, a diagram and a repo link.

- **Best asset:** A real, verified tool for a timely problem. It gives AI coding agents one deterministic, schema-validated pass/fail instead of pages of scanner noise. The repo backs it with 274 tests, a Docker E2E suite (104/104 non-smoke claimed against real qlty, Svelte and Fallow), and a scripted agent fix-loop demo that converges. The page's candid 'Early alpha' section also builds engineer trust.
- **Biggest gap:** Nothing is shown. There is no terminal capture of the PASSED line versus a failing report, no diagram of the agent loop and CI gate, and a 'Cover pending' placeholder as the only image. The page is also a draft with no links. The repo's depth (tests, live E2E, MCP, diff coverage) never reaches a skimming visitor, and AI co-authorship is not addressed in the first-person authorship claim.

### LichessApp (draft)

A tidy, honest one-day Nativefier-plus-CSS skin whose page overstates two features and buries the product, so it should not be featured (or should stay hidden): complexity 2.0, impressiveness 1.8, marketability 4.0.

- **Best asset:** An honest, finished, personally used 2023 tool: a real full-resolution screenshot of the compact yellow/teal puzzle widget docked on Parker's own Arch/BSPWM desktop, with an MIT license and a straightforward description of a small hobby tool. The CSS grid and palette re-layout of a live site into a ~461x400 widget is tidy, if small, front-end craft.
- **Biggest gap:** Technical depth. About 229 lines of CSS/JS/shell on a generated Nativefier wrapper has no security or systems content, and the page's headline features (always-on-top, edge-hover scroll) do not exist as code. Communication-wise, the page never shows a tight widget crop or a before/after of stock Lichess against the compact window, and the figures are buried at the bottom.
