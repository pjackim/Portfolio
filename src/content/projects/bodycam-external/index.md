---
# Sources: ../BodyCam (github.com/mort-sh/BodyCam-External) @ 3ef9eaf (2026-10-03) — README.md,
# CLAUDE.md (What this is, Where offsets come from, Architecture, the traps index),
# docs/traps/spawning.md (edit mode's laser and inverted-hull outline), docs/traps/zombies.md,
# docs/superpowers/specs/2026-09-04-bodycam-external-tool-design.md (SDK counts),
# docs/superpowers/specs/2026-09-06-world-editor-design.md, bodycam/mapcache.py and
# bodycam/world.py (map footprint), bodycam/puppet.py (teleport), bodycam/gamemodes.py,
# pyproject.toml, and the message of commit 3ef9eaf (the crash triage after the 09-25 game
# update). Counts taken 2026-10-03: 245 commits from 2026-09-04, 105 Python files under
# bodycam/, 9 panel tabs in bodycam/ui/pages, 25 offline checks and 41 probes in scripts/.
# media: all of it the owner's own, recorded against a live match on 2026-10-03.
# panel-overview, panel-lobby and panel-diagnostics ← ../BodyCam/.media/{overview,lobby,
# overview-bottom}.jpg, bottom 256 px cropped off (the desktop behind the panel); orbs-and-zombie
# ← .media/zombie-spawn.jpg. cover.webp is the frame at 1:09 of world-editor.mp4 (the owner's
# recording, ~/Videos/portfolio-to-add/bodycam), cropped 16:10. The loops are trims of the same
# folder: world-editor.mp4 0:06–0:18 and 1:03.5–1:18, teleport-map.mp4 0:00–0:14,
# zombie-spawn-single.mp4 0:06–0:20; the recordings' audio is dropped. Every file is one
# `npm run media` encode straight from its original (lossless stills; loops at 1920 px):
# cover `--frame 69 --crop 2304:1440:0:0`, the three panels `--crop 2198:824:8:0`, the loops
# `--trim 6-18`, `--trim 63.5-78`, `--trim 0-14` and `--trim 6-20`. Not used: the server
# browser shots (they list other players' lobby names) and the overview, classic-features,
# detach-menu and zombie-horde recordings.
title: 'BodyCam External'
summary: 'A Python tool that edits a running Unreal Engine 5.5 game from a separate process: a live world editor, zombie spawner, click-to-teleport map and a glass control panel.'
year: 2026
period: 'Sept – Oct 2026'
group: security
capabilities: [offensive-security, engines-systems, engineering-practice]
stack: [Python, pymem, PyQt6, Keystone, Capstone, Unreal Engine 5, Reverse engineering]
cover: ./cover.webp
coverAlt: "The BodyCam control panel's Spawn tab open beside a red-lit corridor: the world editor's light library with Emergency red armed, its brightness, colour and reach controls, and the lit LOUNGE doorway in the game."
coverPosition: 'center 6%'
featured: true
order: 1
showOnHome: false
draft: false
highlights:
  - 'Draws a world editor inside the game from outside it: the laser and the green or red target outline are real actors, the outline an inverted-hull mesh.'
  - Click a top-down map of the level to teleport or spawn zombies, into a game whose own zombie maps were never shipped.
  - Runs the game's own functions on its game thread through a ProcessEvent hook that only claims a queued call at a ReceiveTick entry, to stay out of replication.
  - Traced three of a game update's four crashes to stale offsets, then made every field the zombie spawner writes resolve live, behind a drift check.
  - Captures each value before the first write and puts it back on detach; the in-game code is one hook and a few bytecode patches.
media:
  - kind: video
    src: ./world-editor-outline.mp4
    alt: 'Edit mode in the game: a red laser runs from the gun to whatever the crosshair hits, and a thin green outline traces a door, a wall monitor and a railing, while large floor slabs fill solid green.'
    caption: 'Edit mode: the laser and the outline are actors the game draws, green when the editor can act on the target.'
  - kind: video
    src: ./world-editor-lights.mp4
    alt: "A red point light placed in a corridor from the panel's light library, then its colour switched to green while brightness and reach are adjusted in the properties card beside the game."
    caption: 'Placing a light and retuning it live. Runtime lights are host-side only; they do not replicate.'
  - kind: video
    src: ./teleport-map.mp4
    alt: "The Spawn tab in teleport mode: a click on the level's top-down map moves the player to that spot, and the game view beside the panel jumps from corridor to corridor."
    caption: "Click to teleport on a map drawn from the level's own placed meshes."
  - kind: video
    src: ./zombie-spawn-single.mp4
    alt: 'The Spawn tab in spawn mode: a click on the map drops a zombie into a graffiti-covered corridor, and it heads toward the player.'
    caption: 'Spawn mode: a click on the map puts a zombie in the corridor, in a mode that has none of its own.'
  - kind: image
    src: ./panel-overview.webp
    alt: 'The Overview tab over the live game: player, zombie, orb and dispatch tiles, the world chain from UWorld down to the local pawn, resource usage with a memory-traffic graph, and an Owed to the game list of restore points and byte patches.'
    caption: 'Overview, attached to a live match: the world chain, memory traffic, and what the tool will put back on detach.'
    wide: true
  - kind: image
    src: ./orbs-and-zombie.webp
    alt: "The Spawn tab's map of the Trenches level with nine orbs placed and a wave size of 10, beside the game view where a zombie stands in a forest of dead trees next to a danger-mines sign."
    caption: 'Nine orbs placed on the Trenches map, and a zombie in the woods: that Deathmatch level has none of its own.'
    wide: true
  - kind: image
    src: ./panel-lobby.webp
    alt: 'The Lobby tab: a roster with team lock and stack controls, and a host-only column of lobby-wide rows for gravity, slow motion, unlimited ammo, Quick Scope, Speed + Melee and boundaries, each tagged Replicates, Players, Host-local or One-shot.'
    caption: 'Lobby: every toggle carries a reach tag, so what only I see and what everyone sees is never left to guesswork.'
    wide: true
  - kind: image
    src: ./panel-diagnostics.webp
    alt: "The lower half of the Overview: subsystem status tiles, the ProcessEvent hook's prologue, cave and anchor with queue, dispatch, gate-skip and game-thread counters reading healthy, and the start of the build snapshot."
    caption: "Diagnostics: the ProcessEvent hook, its game-thread gate, and status tiles for the tool's main subsystems."
    wide: true
links:
  private: [repo]
legacyPaths: []
---

## Problem

Bodycam is an Unreal Engine 5.5.4 game with no in-game console: the viewport console is never constructed and the CheatManager is compiled out, so the engine's own debug commands are accepted and silently ignored. Its Zombies mode can't be played on the shipped build either, because both of its maps live in pak chunks that were never shipped.

So this tool works from outside the process.

## Approach

The tool runs out of process. `pymem` reads and writes the game's memory from a separate Python process, and the only code it puts inside the game is a ProcessEvent trampoline and a few in-place bytecode patches, whose original bytes go back on detach. Its memory and assembler layers were ported from MordMod, an earlier tool of mine for Mordhau (Unreal Engine 4).

The main change from that project is where offsets come from. MordMod's were found by hand in Cheat Engine and Ghidra, and broke silently on game updates. Here a generator parses an SDK dump of the game (6,218 classes, 6,193 structs) into a checked-in offset table, and a live layer resolves field offsets by name from the running game's reflection data. The generated table is demoted to an expectation that an audit command diffs against.

## What I built

- **World editor.** Look at, grab, clone, delete or place an actor from the crosshair, with a library of 19 kinds: 13 lights, 4 devices (two drones, an RC car, a bomb) and 2 pieces of cover. Edit mode's feedback is drawn by the game itself: the laser is the game's own beam mesh attached to the camera, and the outline is a reverse-culled, inflated copy of the hit mesh.
- **Map and spawner.** A top-down map of the level, drawn from its placed meshes and cached on disk per game build, where a click teleports or spawns. Orbs, placed at the crosshair and dragged on the map, are named per-map layouts that zombie waves are dealt across.
- **Zombies in any mode.** The zombie classes are loaded in every mode, but spawning one with the engine's call gives a statue. The spawner sets the fields the game's own spawner would have set (target, skin pool, perception), re-points each zombie's target every second, silences the game's re-target with a bytecode patch, and dresses it from meshes already in memory.
- **Game-thread calls.** A ProcessEvent trampoline with a single-slot queue, drained on the game thread and only at a ReceiveTick entry. Host-only actions check for an authority game mode and report "not host" instead of failing silently.
- **Restore ledger.** Values the tool changes are captured once before the first write; a few one-shot actions are deliberately not restorable. Restore points are tied to the current world and dropped on map change, and the Overview lists what the tool still owes the game.
- **Control panel.** A frameless glass PyQt6 window in the game's own menu language: nine tabs, scope as structure ("affects only me" against "affects everyone, host required"), a reach tag on every lobby row, bindable global hotkeys, saved profiles, a lobby browser, and a context pane that explains the last row clicked.
- **Overlay and CLI.** A click-through crosshair and ESP overlay that tracks the game window, and a Typer command line that mirrors the panel, with a GVAS reader/writer for the game's loadout save file.

## Outcome & lessons

Built in a month: the first commit is 4 September 2026, and by 3 October there are 245 commits across 105 Python files. There is no unit test suite, since most modules can't run without a live game. Verification is byte-compiling every file, 25 offline checks of the pure logic that gate every merge, and 41 hand-run probes against the running game. The save writer must round-trip the loadout file byte for byte.

A dispatched call is not a call that did anything. ProcessEvent returning only proves the VM ran the function, so features that can only confirm dispatch say so rather than claiming success.

A game update on 25 September added a field to the character class and shifted the pawn fields below it. The zombie spawner kept writing the old offsets, and three of four crash dumps shared one fault: the garbage collector reading a reference slot that held `0x100`, a one-byte write into what had been a null pointer. The fix resolves every field the spawner writes live, by name, kind and size, and refuses to spawn when a required one doesn't match. A check in the merge gate now holds every hand-kept offset constant that is an SDK field to the regenerated table. The fix is covered by offline checks; it had not yet been run against the live game when I committed it.

Lobby-wide features live or die on replication, and several are still unproven with a second player. The code marks which half has been shown to work.
