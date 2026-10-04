---
# Sources: html/Work/mordhaumod.html:68-70, :77-85, :109-118, :126-135, :144-156, :163; index.html:517-519
title: Hardpoint Game Mode
summary: A freelance Unreal Engine 4 game mode for Mordhau, commissioned by its competitive community — a moving capture point and team scoring, open-sourced for the community.
role: Freelance developer
year: 2021
group: software
featured: true
order: 6
capabilities: [engines-systems, engineering-practice]
stack: [Unreal Engine 4, Server & client replication, Test-driven development, Iterative design]
highlights:
  - Built a point that moves around the map on a timer; holding it earns points, and the first team to 150 wins.
  - Implemented server and client replication in Unreal Engine 4.
  - Developed with test-driven development and iterative design.
  - Designed a proof-of-concept map, beyond the client's request for the mode alone.
  - Communicated with the client and weighed unfiltered community feedback — when to incorporate it and when to dismiss it.
cover: ./cover.webp
coverAlt: Proof-of-concept Hardpoint map of dark stone blocks and stairs around a glowing yellow grid that marks the point.
media:
  - kind: image
    src: ./capture-zone-corridor.webp
    alt: Low view across a glowing yellow floor grid toward armored knights fighting at the end of a stone corridor.
    caption: The objective — battle for positioning and occupation of a point that moves around the map on a timer.
    wide: true
  - kind: image
    src: ./capture-zone-melee.webp
    alt: Knights fighting on and around a blue-lit floor grid in a blocky stone arena, with fallen fighters and dropped weapons.
    caption: Holding the point awards points to players and their team; the first team to 150 points wins. The map is my proof of concept.
    wide: true
  - kind: youtube
    id: 'EdJRI_kEXt8'
    title: Hardpoint game mode gameplay
legacyPaths: [html/Work/mordhaumod.html]
---

## Problem

Mordhau's developers were a small team with limited resources, so the game's competitive community hired me to build a Hardpoint game mode.

## Approach

I built the mode in Unreal Engine 4 with server and client replication, using test-driven development and iterative design, and handled communication with the client.

## What I built

Hardpoint is a battle for positioning. A single point moves around the map on a timer; once a team occupies it, the point starts awarding points to that team's players and to the team as a whole, and the first team to 150 points wins.

The client asked me to make only the mode itself; the map in these images is a proof-of-concept map I designed beyond that scope.

## Outcome & lessons

My source code was open-sourced on GitHub and used in the community's tournaments and leagues, and content creators built various maps around the mode. The project also exposed me to unfiltered community feedback, and gave me practice deciding when to incorporate it and when to dismiss it.
