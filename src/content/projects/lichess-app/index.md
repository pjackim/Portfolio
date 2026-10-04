---
# Sources: ../LichessApp — README.md, LICENSE, modifications/custom.js, modifications/custom.css,
# untar.sh; git log (5 commits, 2023-02-15, Parker Jackim; 2026-09-27 polish pass); git remote
# https://github.com/pjackim/LichessApp.
# media: cover.webp ← ../LichessApp/.screenshots/desktop.png (author's own screenshot, repo);
#   puzzle-tracking.webp ← .screenshots/puzzle-tracking.png; scroll.webp ← .screenshots/scroll.png;
#   ease-of-use.webp ← .screenshots/ease-of-use.png (all author's own screenshots, fetched 2026-09-27)
#   Each is a lossless `npm run media` encode of that PNG, uncropped (re-encoded 2026-10-03).
title: LichessApp
summary: A minimal desktop wrapper around Lichess puzzles, built with Nativefier and injected CSS/JS that strip the page to a compact, always-on-top puzzle widget.
tldr: 'A small desktop app I made in 2023 for myself. It shows Lichess chess puzzles in a compact floating window, with the rest of the site trimmed away, by wrapping the real Lichess website.'
year: 2023
group: software
capabilities: [engines-systems]
stack: [Nativefier, Electron, JavaScript, CSS, Shell]
cover: ./cover.webp
coverAlt: A compact Lichess puzzle widget with a custom yellow-and-teal board theme, docked at the edge of an Arch Linux desktop next to a system panel showing the clock and app shortcuts.
featured: false
order: 100
showOnHome: false
draft: true
highlights:
  - Packaged the Lichess puzzle page as a standalone desktop app with Nativefier (Electron under the hood), no browser chrome.
  - Wrote injected custom.js/custom.css that hide site chrome, restyle the board, and rearrange the puzzle layout for a small always-on-top window.
  - Hid the window's scrollbar and replaced it with an edge-hover scroll affordance to keep the compact layout clean.
  - Shipped the packaged Electron build split into `.tar.part*` archives (too large for a single GitHub blob) with an `untar.sh` reassembly script.
media:
  - kind: image
    src: ./puzzle-tracking.webp
    alt: Zoomed view of the widget's puzzle board mid-solve, with a column of green and red checkmarks on the right tracking previous move accuracy and a "+2" evaluation badge.
    caption: The compact puzzle layout tracks move-by-move accuracy in the sidebar.
  - kind: image
    src: ./scroll.webp
    alt: Puzzle widget showing an amber down-arrow affordance at the window's right edge, used to scroll the hidden-scrollbar page by hovering near the edge.
    caption: The window hides its scrollbar; hovering near the edge scrolls the page instead.
  - kind: image
    src: ./ease-of-use.webp
    alt: Lichess puzzle settings panel with the "Jump to next puzzle immediately" toggle highlighted in a yellow box, next to difficulty and zen-mode controls.
    caption: Enabling "Jump to next puzzle immediately" in Lichess's own settings makes the compact layout noticeably nicer to use.
links:
  repo: https://github.com/pjackim/LichessApp
legacyPaths: []
---

## Problem

I wanted a small, always-on-top way to run Lichess's daily puzzles without a full browser window's chrome, tabs, and sidebar taking up desktop space.

## Approach

Nativefier packages a site as a standalone Electron desktop app; I paired it with a small `custom.js`/`custom.css` layer injected into the wrapped page at runtime (from `app/resources/app/inject/`) to strip the site chrome, restyle the board, and rearrange the puzzle layout for a compact window. Because the modifications target Lichess's DOM/CSS as it existed when this was built, layout changes on lichess.org can require updating the selectors.

## What I built

- **Electron packaging via Nativefier**, producing a standalone puzzle-widget app from the Lichess site.
- **Injected `custom.js`/`custom.css`** that hide page chrome, apply a custom color palette to the board, and wrap the page body in a scroll container with a hidden native scrollbar.
- **An edge-hover scroll affordance** in place of the hidden scrollbar, so the compact window still scrolls cleanly.
- **A split-archive distribution** (`lichess.tar.part*` + `untar.sh`) so the packaged Electron build, too large for a single GitHub blob, still ships through the repo.
- Tuned for a small floating window (an example BSPWM rule ships in the README) rather than managing its own window geometry.

## Outcome & lessons

Built as a personal tool in February 2023, later polished for presentation (cleaned-up injected CSS/JS, a fixed extract script, an added license, and a rewritten README) in September 2026. Because Nativefier wraps the live site rather than a fixed snapshot, the injected selectors are only as durable as Lichess's own markup — the README notes that layout changes upstream may require updating `modifications/`. The wrapper isn't limited to puzzles either: pointing Nativefier at another part of the site and adjusting the selectors would be enough to adapt it further.
