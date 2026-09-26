---
# Sources: html/Work/mordhauhack.html:77-79, :90-96, :129, :168, :186-218, :224-228, :234-238; public/files/Resume_General.pdf (Memory Hacking)
title: Mordhau — Runtime Memory Patching
summary: A C++ DLL injected into Mordhau's Unreal Engine 4 client that patches memory at runtime to change field-of-view, turn-rate, movement and cooldown limits.
year: 2021
period: Fall 2021
group: security
featured: true
order: 2
capabilities: [offensive-security]
stack: [C++, DLL injection, Memory patching, Reverse engineering, Unreal Engine 4]
highlights:
  - Patched a live Unreal Engine 4 game's memory at runtime through an injected DLL.
  - Exposed in-game controls for field of view, turn-rate caps, crouch and dodge cooldowns, warm-up movement, and idle-kick prevention.
  - Built user authorization plus access-key distribution and management around the tool.
  - Handled the tool's UX and end-user tech support, working from client feedback.
cover: ./cover.webp
coverAlt: In-game menu sliders set to FOV Value 130, TurncapX 315 and TurncapY 290.
media:
  - kind: image
    src: ./gameplay-toggles.webp
    alt: 'In-game menu section headed Gameplay with six checkboxes: AFK, Crouch Cooldown, Dodge Cooldown, Enable Dodge, FOV and Move.'
    caption: Gameplay options — idle-kick prevention, instant crouch and dodge, dodge for the current class, a wider field of view, and movement while emoting.
legacyPaths: [html/Work/mordhauhack.html]
---

## Problem

Mordhau's stock client leaves out options players wanted — above all a wider field of view, which proved very popular with users.

## Approach

I reverse-engineered the running Unreal Engine 4 client, then wrote a C++ DLL that is injected into the game and patches its memory at runtime. Each change is exposed as a control in an in-game menu, so values can be adjusted while playing.

## What I built

- **Memory patching through DLL injection.** The core of the tool, running inside the live client.
- **Adjustable parameters.** Field of view; the turn restrictions applied during combat (TurncapX and TurncapY); instant crouch and dodge; dodge for the current class; movement while emoting; movement during the match-start warm-up; and protection from being kicked for inactivity.
- **Access control.** User authorization, plus distribution and management of access keys.
- **Support.** The tool's UX, and tech support for its users.

## Outcome & lessons

Releasing the tool to real users stretched the project well past the reverse engineering: authorization, key management, UX, tech support and client feedback all became part of the work.
