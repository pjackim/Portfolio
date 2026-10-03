---
# Sources: html/Work/foresthack.html:76-83, :89-102, :126-148, :158-175, :184-195, :200; public/files/Resume_General.pdf (Game Hacking)
title: The Forest — Mono Injection
summary: A C# Mono-injection hack for the Unity game The Forest. I built it to learn game hacking, then made it the codebase for a beginner curriculum I created and taught.
year: 2020
period: Spring 2020
group: security
featured: true
order: 4
capabilities: [offensive-security, engines-systems]
stack: [C#, Unity, Mono injection, ILSpy]
highlights:
  - Reverse-engineered the game by dumping its objects with ILSpy, and discovered basic network vulnerabilities.
  - Loaded my own C# code into the running Unity game through Mono injection.
  - Designed a dynamic, automated menu system that makes new additions easy and gives beginners a great learning environment.
  - Built an in-game ESP overlay with bone, joint, animal and world views and an adjustable draw distance.
cover: ./cover.webp
coverAlt: The Forest in first person, with the injected menu on the left and a red ESP skeleton drawn over a character among the trees.
coverPosition: '50% 65%'
media:
  - kind: image
    src: ./menus-in-game.webp
    alt: 'The Forest with the injected menu open: spawn options, X/Y/Z position sliders, and player controls for flying, speed and jump.'
    caption: One of my first sizeable independent programming projects, and later the base I used to teach others.
    wide: true
  - kind: image
    src: ./menu-panels.webp
    alt: 'Close-up of two menu panels: spawn options with X/Y/Z sliders, and a Player panel with fly-mode, speed and jump sliders.'
    caption: One of the first user interfaces I designed — dynamic, and easy to extend with new additions.
  - kind: youtube
    id: 'lbqOiXaPm08'
    title: The Forest Mono-injection demo
legacyPaths: [html/Work/foresthack.html]
---

## Problem

I wanted to learn the basics of game hacking, and The Forest, a Unity Engine game, became my test bed. It turned into one of my first sizeable independent programming projects.

## Approach

Reverse engineering came first: dumping the game's objects with ILSpy and discovering basic network vulnerabilities. From there I used Mono injection to load my own C# into the running game, using efficient data structures and iterating on the UX design.

## What I built

- **Injection.** C# code loaded into the live game through Mono injection.
- **Menu system.** A dynamic, automated menu system — spawn menu and main menu, each with tabs — designed so new features are easy to add.
- **ESP overlay.** Bone, joint, animal and world views with an adjustable draw distance.
- **Player and spawn tools.** Controls exposed through the menu, from spawning to movement settings like fly mode, speed and jump.

## Outcome & lessons

After falling in love with the process, I independently created a curriculum around this codebase, which I had designed specifically for beginners, and taught students aged 18–20 the fundamentals of game hacking in Unity Engine games. The dynamic, automated menu system made it a great learning environment. There are many avenues for improvement, but I'm proud of the project's functionality and creativity.
