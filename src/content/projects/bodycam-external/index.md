---
# Sources: ../BodyCam (github.com/mort-sh/BodyCam-External) @ 3ef9eaf (2026-10-03) — README.md
# (no in-game console, zombie maps never shipped, no unit tests, offsets build-specific to
# game v0.8.3), CLAUDE.md (What this is, Architecture), docs/traps/spawning.md (edit mode's
# laser and outline; green = actionable, red = refused), docs/traps/lifetime.md (one-shot
# actions never restored), docs/traps/zombies.md (zombies load in every mode), docs/superpowers/specs/2026-09-06-world-editor-design.md (19 spawnable
# kinds), bodycam/mapcache.py and bodycam/world.py (map footprint), bodycam/puppet.py
# (teleport), bodycam/ui/pages (9 panel tabs), and the message of commit 3ef9eaf (the crash
# triage after the 09-25 game update; fix not yet run against the live game). "Built in a
# month": first commit 2026-09-04, last 2026-10-03. Copy revised for concision 2026-10.
# Host-only spawning and lobby settings: README.md (Spawn tab) and bodycam/ui/pages/lobby.py;
# several rows there are marked as needing a second player. "Restores most settings": docs/traps/lifetime.md.
# media: all of it the owner's own, recorded against a live match on 2026-10-03.
# panel-overview, panel-lobby and panel-diagnostics ← ../BodyCam/.media/{overview,lobby,
# overview-bottom}.jpg, cropped to the 2198×824 panel (the desktop behind it cut off at the
# bottom, 256–257 px, and 8 px at the left); orbs-and-zombie
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
summary: 'In the shooter Bodycam, my tool lets the host edit the level mid-match, teleport with one map click, and spawn zombies in modes that have none.'
year: 2026
period: 'Sept – Oct 2026'
group: security
capabilities: [offensive-security, engines-systems, engineering-practice]
stack: [Python, pymem, PyQt6, Keystone, Capstone, Unreal Engine 5, Reverse engineering]
cover: ./cover.webp
coverAlt: "BodyCam's control panel beside a red-lit game corridor, with the level editor's light menu open."
coverPosition: 'center 6%'
featured: true
order: 1
showOnHome: false
draft: false
highlights:
  - 'Edit a live match as host: place lights, drones and more.'
  - Teleport with one click on a map.
  - Built in a month, tested by hand in live matches.
media:
  - kind: video
    src: ./world-editor-outline.mp4
    alt: 'A red laser runs from the gun to whatever the crosshair hits, and a thin green outline traces a door, a wall monitor and a railing.'
    caption: 'Edit mode: green means the editor can act on the target, red means it refuses.'
  - kind: video
    src: ./world-editor-lights.mp4
    pair: world-editor
    alt: "A red light placed in a corridor from the panel's light library, then switched to green while brightness and reach are adjusted."
    caption: 'Only I see these lights. Other players do not.'
  - kind: video
    src: ./teleport-map.mp4
    pair: teleport
    alt: "A click on the level's top-down map moves the player to that spot, and the game view jumps from corridor to corridor."
  - kind: video
    src: ./zombie-spawn-single.mp4
    pair: zombies
    alt: 'A click on the map drops a zombie into a graffiti-covered corridor, and it heads toward the player.'
  - kind: image
    src: ./panel-overview.webp
    alt: 'The Overview tab of the control panel, showing live player and zombie counts and resource usage.'
    caption: 'Overview tab, attached to a live match.'
    wide: true
  - kind: image
    src: ./orbs-and-zombie.webp
    alt: 'A top-down map with spawn points marked, beside the game view where a zombie stands among dead trees.'
    caption: 'Spawn points on a Deathmatch map that has no zombies of its own.'
    wide: true
  - kind: image
    src: ./panel-lobby.webp
    pair: control-panel
    alt: 'A player list and a column of switches such as gravity, slow motion and unlimited ammo, each tagged with how far it reaches.'
    wide: true
  - kind: image
    src: ./panel-diagnostics.webp
    alt: 'Status panel for the tool, with the connection to the game reading healthy.'
    caption: "Diagnostics tab: the status of the tool's parts."
    wide: true
links:
  private: [repo]
legacyPaths: []
---

## What it can do

All of this works when I'm hosting the match.

<div data-pair="world-editor" data-side="right">

### Edit the level live

Aim at an object, then place lights, drones, an RC car, a bomb or cover barriers. **19 kinds** in all, and lights can be retuned live.

</div>

<div data-pair="teleport" data-side="left">

### Teleport by clicking

A top-down map of the level. **One click** and you are there.

</div>

<div data-pair="zombies" data-side="right">

### Spawn zombies

The game's Zombies maps never shipped. I click the map and a zombie appears in a normal match.

</div>

<div data-pair="control-panel" data-side="left">

### Tune the match

Switch on low gravity, slow motion or unlimited ammo for everyone. Each switch is tagged with who it reaches.

</div>

## Where it stands

It runs as a separate program beside the game, and closing it undoes most of its changes.

Built in a month for one game version, so an update can break it. Some settings that affect other players are untested with a second player, and my latest crash fix has not been re-run against the live game.
