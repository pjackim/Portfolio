---
# Sources: html/Work/hero_trivia.html:69-74, :81-91, :115-125, :134-144, :153-162; index.html:577-579
# media: legacy Images/hero_trivia at git a085340 via scripts/media/legacy-manifest.json. The two
# loops are dithered 256-colour GIFs; they use x264 CRF 24 (not the default 20), because the
# longer one is 25 MB at CRF 20, over the 24 MB loop guard rail.
title: Hero Trivia
summary: A rapid prototype of a comic-book trivia crossword for a freelance client — answer a trivia question for each letter of the hint word.
tldr: 'A comic-book trivia game built like a crossword: a hint word runs down the grid, and each of its letters gets its own trivia question. I prototyped it quickly for a freelance client in 2022. It is a proof of concept, not a finished product.'
role: Freelance developer
year: 2022
group: software
capabilities: [languages, engineering-practice]
stack: [React, Hooks, NPM, Data parsing]
cover: ./cover.webp
coverAlt: Hero Trivia logo over a blurred comic-book collage, with the hint word SHANG-CHI down a crossword grid and a Silver Surfer clue below.
media:
  - kind: video
    src: ./gameplay.mp4
    alt: 'Gameplay: the hint word BEAST runs down the grid while answers such as BOLT, SILVER and DRAX are typed in from trivia clues.'
    caption: Players get a hint word and answer a trivia question for each of its letters.
    autoplay: true
  - kind: video
    src: ./puzzle-variety.mp4
    alt: Several Hero Trivia puzzles in turn, with hint words such as FOGGY, OMEGA and JONES and a trivia clue for each row.
    caption: Every game is different, so players stay challenged.
    autoplay: true
legacyPaths: [html/Work/hero_trivia.html]
---

Hero Trivia is a rapid prototype: a proof of concept for a rudimentary crossword puzzle built on comic-book data sets. Players are given a hint word and must answer a trivia question for each of its letters, and every game varies so the player is continuously challenged.

I built it for a freelance client with React, Hooks and NPM, converting and parsing the comic-book data files, and iterated on the design through rapid development and client feedback.
