---
# Sources: html/Work/mordhauhack.html:77-79, :90-96, :120-124, :129, :141, :151, :168, :186-238, :249; public/files/Resume_General.pdf (Memory Hacking)
# Media: all from the legacy site at git a085340 (the commit before the legacy removal, 907a195) — Images/fovhack/screenshot-overview.jpg (cover; also the project's legacy home-page thumbnail), screenshot-cosmetic.jpg, fov_demo.gif (15 s, 1280x655, orphaned in the legacy HTML, encoded as a loop; that it shows the field of view widening is read from its frames, 0 s vs 15 s, and its file and folder names, not stated in any legacy text), and the page's two YouTube embeds S1XTb5wbYFc and elRSqVSCXu8 (titles from YouTube oEmbed, checked 2026-10-03; their captions reuse words from those titles). Not used: screenshot-gameplay.jpg (514x917, the gameplay menu already in the cover), fov_preview.png (1669x854 still of the same scene as the loop).
title: Mordhau — Runtime Memory Patching
summary: A C++ DLL injected into Mordhau's Unreal Engine 4 client that patches memory at runtime to change field-of-view, turn-rate, movement and cooldown limits.
tldr: 'A cheat I wrote in 2021 for the sword-fighting game Mordhau, and sold access to. It adds options the game does not offer, like a wider field of view and armour that was only sold before launch. I also handled the access keys, the menu and user support.'
year: 2021
period: Fall 2021
group: security
featured: true
order: 3
capabilities: [offensive-security]
stack: [C++, DLL injection, Memory patching, Reverse engineering, Unreal Engine 4]
highlights:
  - Patched a live Unreal Engine 4 game's memory at runtime through an injected DLL.
  - Shipped as two packages, Cosmetic and Gameplay; the Cosmetic package was the most popular.
  - Exposed in-game controls for field of view, turn-rate caps, crouch and dodge cooldowns, warm-up movement, and idle-kick prevention.
  - Built user authorization plus access-key distribution and management around the tool.
  - Handled the tool's UX and end-user tech support, working from client feedback.
cover: ./cover.webp
coverAlt: The tool's in-game menu over Mordhau's loadout screen, with a Cosmetics panel of armour IDs, a Gameplay panel of checkboxes and FOV 130, TurncapX 315 and TurncapY 290 sliders, and a usage and hotkeys panel.
media:
  - kind: video
    src: ./fov-widening.mp4
    pair: gameplay-package
    alt: A first-person view of a sword facing an axe-wielding dummy in a bare test map, with the field of view widening so the dummy appears smaller.
    caption: Field-of-view demo recording. Field of view was the gameplay option that proved very popular with users.
    wide: true
  - kind: image
    src: ./cosmetic-menu.webp
    pair: cosmetic-package
    alt: 'The Cosmetics panel beside a gold-armoured knight, with ID fields for helm 43, neck 0, shoulder 6, chest 5, arm 33, glove 12, waist 0, legs 19 and foot 2.'
    caption: Pick an armour ID per slot to wear gear that was only sold before the game launched (Kickstarter content).
  - kind: youtube
    id: 'elRSqVSCXu8'
    title: 'Mordhau Hack: Gameplay Menu'
    caption: Gameplay menu.
  - kind: youtube
    id: 'S1XTb5wbYFc'
    title: 'Mordhau Hack: Cosmetic Menu'
    caption: Cosmetic menu.
legacyPaths: [html/Work/mordhauhack.html]
---

## Problem

Mordhau's stock client leaves out options players wanted — including a wider field of view, which proved very popular with users.

## Approach

I reverse-engineered the running Unreal Engine 4 client, then wrote a C++ DLL that is injected into the game and patches its memory at runtime. Each change is exposed as a control in an in-game menu, so values can be adjusted while playing.

## What I built

**Memory patching through DLL injection.** The core of the tool, running inside the live client.

<div data-pair="gameplay-package">

### Gameplay package

Ten toggles: **field of view**; the turn restrictions applied during combat (TurncapX and TurncapY); instant crouch and dodge; dodge for the current class; movement while emoting; movement during the match-start warm-up; faster sprint; automatic parry; and protection from being kicked for inactivity.

</div>

<div data-pair="cosmetic-package">

### Cosmetic package

An in-game panel for setting the armour ID of each slot, which let users wear Kickstarter-only cosmetics. It was the more popular of the two.

</div>

### Access control and support

- **Access control.** User authorization, plus distribution and management of access keys.
- **Support.** The tool's UX, and tech support for its users.

## Outcome & lessons

Releasing the tool to real users stretched the project well past the reverse engineering: authorization, key management, UX, tech support and client feedback all became part of the work.
