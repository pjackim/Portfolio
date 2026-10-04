---
# Sources: ../TongueTickle (local repo, no remote) — README.md, docs/OVERAL_INTENT.md (purpose only;
#   the audience paragraph is deliberately not used), docs/PROVIDERS.md,
# PLAN/00-foundations.md, PLAN/STATUS.md, ISSUE_BACKLOG.md, pyproject.toml,
#   docs/superpowers/specs/2026-07-02-grok-auto-express-design.md,
# backend/tonguetickle/{app,config,cost,daemon,hotkey,player,local_tts,launcher}.py,
#   backend/tonguetickle/providers/{base,registry,_http,qwen,grok,openai_tts,local}.py,
# frontend/{index.html,app.js,styles.css}, tests/; git history 2026-07-02 → 2026-09-27 (29 commits,
#   all m0rt; 22 carry a Claude co-author or Claude-Session trailer).
# Verification run 2026-09-29 (Windows 11, Python 3.14.2, scratch export of HEAD 260eec2, source
#   untouched): 207 tests collected, 207 passed; offline SAPI voice rendered a valid WAV via POST
#   /api/tts with no keys.
# Claim-level sources: provider order, fallback and 'always available offline voice' ← README.md
#   (TTS Providers), providers/registry.py; Qwen3-TTS 'counts as configured only while its /health
#   answers' ← README.md (Running Qwen3-TTS locally); auto-express (Grok LLM adds tags, preview
#   before Speak, presets) ← docs/superpowers/specs/2026-07-02-grok-auto-express-design.md;
#   'mocks only' for the Qwen3-TTS, Grok and OpenAI network paths, and 'no installer or release'
#   ← the earlier page's status section, checked against PLAN/STATUS.md and the repo (no release
#   tooling).
# Author statements: Parker's prompts (Claude Code prompt history, project TongueTickle) on
#   2026-07-02 (auto-express request, hotkey bug reports, real Grok test) and 2026-09-27 (provider
#   order, locally hosted Qwen3-TTS).
#   Exact words (history.jsonl): July 2026: "implement two features for grok voice under listen:
#   auto-moments, auto-delivery" and "bug: when using my hot key, the first word or first few words seem
#   to get cut off in the audio"; September 2026: "we will assume locally hosted qwen3-tts" and
#   "1. Qwen3-TTS 2. Grok Voice API 3. OpenAI Voice API".
# Period: git dates 2026-07-02 → 2026-09-27; the July 2 'Initial commit' snapshotted earlier work
#   (filesystem and session logs put the first code at 2026-06-30, not used for the period).
# Deliberately omitted: the removed earlier cloud provider's name (author asked for it scrubbed),
#   the private claude.ai design-project URLs, and the mp3-vs-winsound hotkey defect (found by
#   inspection and a winsound probe, not an author statement).
# media: cover.webp ← ../TongueTickle web UI (frontend/), captured 2026-09-29 on
#   127.0.0.1 from a scratch copy, Listen screen dark theme with a sample sentence typed in
#   (owner-made, sole author Parker Jackim, fetched 2026-09-29)
# media: listen-speak-loop.mp4 (+ .webm, .poster.webp) ← ../TongueTickle web UI
#   (frontend/), screen recording of the unmodified UI on 127.0.0.1 with the offline Echo voice
#   (owner-made, sole author Parker Jackim, fetched 2026-09-29)
# media: voice-library-light.webp ← ../TongueTickle web UI (frontend/), Voices
#   screen captured 2026-09-29 on 127.0.0.1 with the window taller than default and the hard-coded
#   uses/likes stats hidden (owner-made, sole author Parker Jackim, fetched 2026-09-29)
# media: listen-grok-expression-tags.webp ← ../TongueTickle web UI (frontend/), Listen screen with
#   the Grok voice Ara selected and the expression bar open, captured 2026-09-29 on 127.0.0.1 from a
#   scratch copy with no keys; Speak and Auto-express not pressed (owner-made, sole author Parker
#   Jackim, fetched 2026-09-29)
# media: provider-settings-dark.webp ← ../TongueTickle web UI (frontend/),
#   Settings screen captured 2026-09-29 on 127.0.0.1 with no keys saved (owner-made, sole author
#   Parker Jackim, fetched 2026-09-29)
# media: flow-and-provider-registry.webp ← diagram authored for the portfolio from
#   ../TongueTickle README.md, docs/PROVIDERS.md and providers/registry.py
#   (owner-made, only documented facts, fetched 2026-09-29)
title: 'TongueTickle: Read Anything Aloud'
summary: 'Highlight text in any Windows app, press a hotkey, and hear it read aloud. Needs no account: a free Windows voice is the fallback.'
tldr: 'A Windows app that reads selected text aloud when you press a hotkey, in an AI voice you set up or a free Windows voice. Built with Claude Code; the AI voices are only tested against simulated replies, and there is no installer yet.'
year: 2026
period: 'July–September 2026'
group: software
capabilities: [engineering-practice, languages]
stack: [Python, FastAPI, httpx, pynput, JavaScript, pytest, Windows SAPI5, uv]
cover: ./cover.webp
coverAlt: "TongueTickle's dark Listen screen: a text box above an orange Speak button."
featured: true
order: 5
showOnHome: true
draft: false
highlights:
  - 'Highlight text in any app, press a hotkey, hear it read aloud.'
  - 'Uses your chosen voice, else the next one set up, else a free Windows voice.'
  - 'One click adds laughs, pauses and whispers; preview before it speaks.'
media:
  - kind: image
    src: ./flow-and-provider-registry.webp
    pair: provider-registry
    alt: 'Diagram: a hotkey sends selected text to your chosen voice or the next one set up (Qwen3-TTS, Grok, OpenAI), with a free offline voice as the last resort.'
    wide: true
  - kind: video
    src: ./listen-speak-loop.mp4
    pair: web-ui
    alt: 'Silent loop of the Listen screen: a sentence is typed, Speak is pressed, and a player bar counts up as the free offline voice reads it.'
    caption: 'Free offline voice. This recording is silent.'
    autoplay: true
  - kind: image
    src: ./voice-library-light.webp
    alt: "TongueTickle's Voices screen in light theme: a searchable grid of six voice cards, each with a Use button."
    caption: 'Voice library. Only the free offline voice is set up here.'
    wide: false
  - kind: image
    src: ./provider-settings-dark.webp
    alt: "TongueTickle's Settings screen in dark theme: the Ctrl Shift S shortcut and a ranked list of voice services, the first marked 'Server offline'."
    wide: true
  - kind: image
    src: ./listen-grok-expression-tags.webp
    pair: grok-auto-express
    alt: "TongueTickle's Listen screen with an expression bar of clickable tags and an Auto-express button above a tagged sentence."
    wide: true
links:
  private: [repo]
legacyPaths: []
---

The hotkey is **Ctrl+Shift+S**. I'd rather listen to long docs than squint at them.

## How it speaks

<div data-pair="web-ui" data-side="right">

### Paste text, press Speak

No hotkey needed. Paste text into the app and press Speak. Pick a voice from the library with one click; online voices need your key.

</div>

<div data-pair="provider-registry" data-side="left">

### Free voice as a fallback

It starts with the voice you picked. If that isn't set up, it tries a speech model you run yourself (Qwen3-TTS), then online voices from Grok and OpenAI. If none is ready, a **free Windows voice** takes over.

</div>

<div data-pair="grok-auto-express" data-side="right">

### Add emotion automatically

In the app, pick a Grok voice and click once: an AI adds laughs, pauses and whispers to your text. You preview and edit before it speaks.

</div>

## Where it stands

I tested it on my own machine. I decided what it does and which voices it tries first, and I built it with Claude Code.

The free offline voice works with no keys. I tried Grok against the real service in July. After a September rewrite, Qwen3-TTS, Grok and OpenAI are tested only against simulated replies, not live services. No installer yet.
