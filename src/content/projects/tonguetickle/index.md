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
# Claim-level sources: 'kept config, cost-tracking, hotkey and offline-voice code, ported Qt-free' ←
#   PLAN/00-foundations.md (carry over Config and CostTracker) plus the module docstrings of hotkey.py
#   and local_tts.py ('ported/migrated from an earlier PyQt prototype', Qt removed); retry statuses
#   429/500/502/503/504, 3 attempts ← providers/_http.py (RETRY_STATUSES, DEFAULT_ATTEMPTS); silent
#   lead (300 ms, Grok WAV) and synchronous silent primer ← providers/grok.py (_pad_wav_lead),
#   player.py (_primer_wav, 150 ms; played before every Windows hotkey playback) and
#   tests/test_player.py; no repo source confirms the clipping is fully resolved, so the copy says
#   'address', not 'stop'.
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
title: 'TongueTickle — Hotkey Text-to-Speech'
summary: 'Select text in any app, press a global hotkey, and hear it spoken by a pluggable TTS provider, with a free offline Windows voice as the fallback.'
year: 2026
period: 'July–September 2026'
group: software
capabilities: [engineering-practice, languages]
stack: [Python, FastAPI, httpx, pynput, JavaScript, pytest, Windows SAPI5, uv]
cover: ./cover.webp
coverAlt: "TongueTickle's Listen screen in its dark theme: the headline 'Hear anything on your screen, in a voice you chose.', the Ctrl Shift S hotkey with the active voice Echo, and a text box with a sample sentence typed in above an orange Speak button."
featured: false
order: 100
showOnHome: true
draft: false
highlights:
  - 'Speaks any highlighted text from a global hotkey; a free offline Windows voice works with no API key.'
  - 'Ranked provider registry (Qwen3-TTS, Grok, OpenAI, offline voice); by default the highest-priority configured one speaks. A new provider is one module.'
  - 'Treats the self-hosted Qwen3-TTS server as configured only while its /health answers (1 s timeout, cached 10 s), so a down server falls through fast.'
  - 'Plays a 150 ms silent primer before hotkey audio on Windows and pads Grok WAVs with a 300 ms silent lead, to address clipped first words.'
  - 'Grok auto-express: an LLM adds speech tags per user-made preset, previewed before Speak, and a sanitizer strips any tag the model invents.'
media:
  - kind: image
    src: ./flow-and-provider-registry.webp
    pair: provider-registry
    alt: 'Diagram in two parts: a four-step flow (global hotkey, selected text, active provider, local playback), and a provider registry table listing Qwen3-TTS at priority 1, Grok Voice at 2, OpenAI Voice at 3 and the free offline voice at 100.'
    caption: 'How a hotkey press becomes speech, and the order providers are tried in.'
    wide: true
  - kind: video
    src: ./listen-speak-loop.mp4
    pair: web-ui
    alt: "Short silent loop of the TongueTickle Listen screen: the sentence 'Hear any text read aloud.' is typed into the box, Speak turns into Pause, and a player bar with animated bars counts up from 0:00 to 0:02 with the Echo voice before the text clears."
    caption: 'Recorded from the running app with the free offline Echo voice; the loop has no sound.'
    autoplay: true
  - kind: image
    src: ./voice-library-light.webp
    pair: voice-library
    alt: "TongueTickle's Voices screen in the light theme: search box, filter chips, provider tabs (All voices, Grok Voice, Offline voice), an active-voice strip for Echo, and a grid of six voice cards (Eve, Ara, Rex, Leo, Sal, Echo) with gradient avatars, tags and Use buttons."
    caption: 'The voice library as it appears with only the free offline voice configured; the Grok voices are listed but not connected.'
    wide: false
  - kind: image
    src: ./provider-settings-dark.webp
    pair: provider-settings
    alt: "TongueTickle's Settings screen in the dark theme: a Global shortcut card showing Ctrl Shift S with a Change button, then the TTS providers list in priority order starting with Qwen3-TTS (local), marked 'Server offline' with no key saved, its server URL, voice and language fields."
    caption: 'The first provider in the priority-ordered list, with no key saved and its local server offline on the capture machine.'
    wide: true
  - kind: image
    src: ./listen-grok-expression-tags.webp
    pair: grok-auto-express
    alt: "TongueTickle's Listen screen with the Grok expression bar open: Auto-moments and Auto-delivery toggles, a preset picker and an Auto-express button, clickable moment tags such as [pause], [laugh] and [sigh] and delivery tags such as <whisper>, <emphasis> and <slow>, above a text box reading 'The report is ready for review [pause] please read it before Friday.'"
    caption: "Grok's expression tags: 'moments' insert at the cursor and 'delivery' tags wrap the selection."
    wide: true
links:
  private: [repo]
legacyPaths: []
---

## Problem

Long articles, docs and code comments tire the eyes, and listening is easier. The usual fix is copying text into some web TTS tool and switching apps. I wanted one gesture: highlight text anywhere, press a hotkey, hear it spoken in a voice I chose.

This is the second iteration of that idea. An earlier PyQt6 desktop prototype worked mechanically but used the wrong UI framework, so I kept its config, cost-tracking, hotkey and offline-voice code (ported Qt-free) and rebuilt the UI as a web app with a headless hotkey daemon.

## Approach

Two components coordinate through one shared `config.json`: a FastAPI web app on `127.0.0.1:8000`, and a `pynput` hotkey daemon. They can run as separate processes, and the one-command launcher runs the daemon on a background thread of the web process. The daemon reloads the config on every speak, so a voice picked in the browser is what the next hotkey press uses.

Every TTS backend sits behind one provider interface and a priority registry, so the speak path in the app and the daemon never talks to a specific vendor; only Grok's auto-express routes are vendor-specific. The saved provider wins if it is configured; otherwise the highest-priority configured one speaks, and the offline Windows voice is always last.

## What I built

### Hotkey capture

A global hotkey (Ctrl+Shift+S by default) releases held Shift and Alt, sends a clean Ctrl+C, and reads the clipboard through `pyperclip`. `pynput` is imported lazily so the server and tests run headless.

<div data-pair="provider-registry">

### Provider registry

Qwen3-TTS through a self-hosted vLLM-Omni server (priority 1), Grok Voice (2), OpenAI Voice (3), and an offline voice (100). Qwen needs no API key (one is optional), so it counts as configured only while its `/health` endpoint answers, which lets the registry fall through to the next provider when the GPU server is down.

</div>

<div data-pair="web-ui">

### Web UI

A vanilla HTML, CSS and JS single page with Listen, Voices and Settings views.

The web UI's own wordmark reads "TongueTickler"; the project, package and repo are named TongueTickle.

</div>

<div data-pair="voice-library">

### Voices

A voice library with filters, and one-click Use to set the active voice.

</div>

<div data-pair="provider-settings">

### Settings

Per-provider settings cards, generated from each provider's declared settings schema.

</div>

<div data-pair="grok-auto-express">

### Grok auto-express

A `grok-4-fast-non-reasoning` pass inserts inline tags like `[laugh]` and wrapping tags like `<whisper>` under user-made presets. The result lands in the text box for review, and a sanitizer removes any tag outside the allowed set.

</div>

### Under the hood

- **Shared HTTP plumbing.** One `post_with_retry` for all three network providers: up to 3 attempts on 429, 500, 502, 503, 504 and network errors, with exponential backoff or the `Retry-After` header.
- **Offline voice.** Windows SAPI5 through PowerShell `System.Speech`, with the text passed via a temp file rather than interpolated into a script. It is Windows-only.
- **Playback workarounds.** xAI returns WAV files with streaming placeholder chunk sizes that `winsound` refuses to play, so I rewrite the RIFF and data sizes. For clipped first words on sleeping audio devices, I play a 150 ms silent clip synchronously before every hotkey playback on Windows, and pad Grok's WAV output with 300 ms of silence.
- **Cost tracking.** A tracker records spend for hotkey speaks. The web UI does not show it yet.

## Outcome & lessons

All 29 commits fall on two days, July 2 and September 27, 2026. The July 2 commit snapshotted work already built; September 27 replaced the original cloud backend with the provider abstraction, ported the existing Grok client behind it, and added Qwen3-TTS and OpenAI. Qwen was first written against a hosted API, then retargeted to a self-hosted server 22 minutes later in one commit that also pulled the retry code into a shared module.

I built it with Claude Code, and 22 of the 29 commits carry its co-author or session trailer. I specified the auto-express feature and its presets, set the provider order, chose to target a locally hosted Qwen3-TTS server, and tested on my own machine with real Grok calls in July 2026, which is how I found the clipped-first-word bug (per the author, July and September 2026).

A fresh run of the suite on Windows with Python 3.14.2 collected 207 tests, and all 207 passed. The offline voice also rendered speech end to end through the app's own `/api/tts` endpoint with no keys set.

What is not done: the Qwen3-TTS, Grok and OpenAI network paths are covered only by mocks, so I have not run a live pass on the rewritten providers. There is no system tray, no streaming synthesis (each clip is synthesized whole, then played), no CI, no installer, and no release.
