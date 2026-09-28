---
# Sources: ../BodyCam (github.com/mort-sh/BodyCam-External) — README.md, CLAUDE.md (Where offsets
# come from, Architecture), docs/superpowers/specs/2026-09-04-bodycam-external-tool-design.md,
# pyproject.toml, bodycam/cli.py (reward command), bodycam/gamemodes.py; git history
# 2026-09-04 → 2026-09-26 (204 commits, 165 modules).
# media: cover.webp, control-panel-overview.webp, control-panel-match.webp ← the project's own
# PyQt6 panel (../BodyCam @ f02783f, bodycam/ui/main_window.py) rendered offscreen at 1200×750 ×2,
# the way scripts/check_ui_layout.py captures pages: attach stubbed out, so no game process
# was touched and every live value reads "detached" (owner's own work, fetched 2026-09-27).
title: 'BodyCam External'
summary: 'An out-of-process Python tool that reads and writes the memory of Bodycam, an Unreal Engine 5.5 game, driven from a PyQt6 control panel and CLI.'
year: 2026
period: 'September 2026'
group: security
capabilities: [offensive-security, engines-systems, engineering-practice]
stack: [Python, pymem, PyQt6, Keystone, Capstone, Unreal Engine 5, Reverse engineering]
cover: ./cover.webp
coverAlt: "The BodyCam control panel's Lobby tab: a roster with puppet actions, and a host-only column of lobby-wide toggles tagged Replicates, Players, Host-local or One-shot, beside a context pane explaining the puppet commands."
featured: true
order: 7
showOnHome: false
draft: true
highlights:
  - Read and wrote a live Unreal Engine 5.5 game's memory from a separate process; the only in-game code is a hook and one bytecode patch, both undone on detach.
  - Generated offsets from an SDK dump instead of by hand, then resolved them live from the game's own reflection data, with an audit to diff the two.
  - Ran curated UFunction calls on the game thread through a ProcessEvent hook, gated on the local player being the host.
  - Captured every changed value once before the first write and restored it on detach or map change.
  - Built a frameless PyQt6 control panel in the game's own menu language, plus a click-through ESP and crosshair overlay.
media:
  - kind: image
    src: ./control-panel-overview.webp
    alt: "The panel's Overview tab: player, zombie, orb and dispatch tiles, the world chain from UWorld down to the local pawn, resource usage, and an Owed to the game list of restore points, byte patches and hook caves."
    caption: 'Overview tab, rendered with no game attached, so every live value shows a dash.'
  - kind: image
    src: ./control-panel-match.webp
    alt: "The panel's Match tab: the game mode's phase machine from WaitingForPlayers to EndMatch, stepper rows for each match duration and the score limit, and a Next Match button."
    caption: 'Match tab: the phase machine and the match timings, also with no game attached.'
links:
  private: [repo]
legacyPaths: []
---

## Problem

Bodycam (Unreal Engine 5.5.4, Win64 Shipping, v0.8.3) ships without an in-game console: the viewport console is never constructed and the CheatManager is compiled out, so the engine's own debug commands are accepted and silently ignored. Anything beyond what the stock game exposes has to come from outside the process.

## Approach

The tool runs out of process — `pymem` reads and writes the game's memory from a separate Python process. Its generic layers (memory access, pattern scanning, the Keystone assembler wrapper, the patch/verify/restore lifecycle) were ported from MordMod, an earlier tool of mine for Mordhau (Unreal Engine 4).

The main change from that project is where offsets come from. MordMod's were found by hand in Cheat Engine and Ghidra, and broke silently on every game update. Here a generator parses an SDK dump of the game (6,218 classes, 6,193 structs) into a checked-in offset table, and a live layer then resolves field offsets by name from the running game's reflection data, demoting the generated table to an expectation that an audit command diffs against.

## What I built

- **Reflection walker.** GObjects / FNamePool traversal, so functions and fields resolve by name, plus read-only structural scans that locate the engine's globals.
- **Game-thread calls.** A ProcessEvent trampoline in the game's code section with a single-slot queue drained on the game thread, used for host-gated actions such as adding bots, match control, and spawning.
- **Restore ledger.** Every changed value is captured once before the first write and restored on detach; restore points are tied to the current world and dropped on map change.
- **Host gating.** Server-only actions check for an authority game mode and report "not host" instead of failing silently.
- **Control panel.** A frameless PyQt6 window built in the game's own menu language, with tabs split by reach ("affects only me" vs "affects everyone, host required"), bindable global hotkeys, saved profiles, and a context pane explaining the last row clicked.
- **Overlay and editor.** A click-through ESP and crosshair overlay that tracks the game window, and a crosshair world editor for looking at, placing, grabbing, and cloning actors.
- **CLI.** A Typer command line that mirrors the panel, plus a GVAS reader/writer for the game's loadout save file.
- **Reward manipulation.** A `bodycam reward` command that credits Reissad Points (the in-game currency) by writing to the game's Steam-leaderboard-backed persistence and waiting for the client to observe the new cached total.

## Outcome & lessons

Built over three weeks in September 2026 across roughly 165 modules. There is no unit test suite, since most modules can't run without a live game: verification is byte-compiling every file plus hand-run probes against the running game, and the save writer must round-trip the loadout file byte for byte.

The main lesson is that a dispatched call is not a call that did anything. ProcessEvent returning only proves the VM ran the function, so features that can only confirm dispatch say so rather than claiming success.
