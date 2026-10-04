---
name: legacy-source-map
description: Topic to legacy-file:line map for fact-check audits (mordhau etc.), plus tooling quirks of the read-only Bash hook
metadata:
  type: reference
---

- Mordhau: `git show a085340:html/Work/mordhauhack.html` (a085340 = parent of 907a195, which deleted legacy). Lines: experience list 86-90; Packages 120-124 ("sold access ... Cosmetic package and/or Gameplay package"); Cosmetic 141 ("most popular package ... Kickstarter content"); YouTube S1XTb5wbYFc :151, elRSqVSCXu8 :249; Gameplay features :186-238 (10 features; FOV "very popular" :211; Parry :219; Skip Warmup :224; Super Sprint "Sprint faster" :229-231).
- Mordhau images at a085340: Images/fovhack/{screenshot-overview.jpg (also home thumbnail, index.html:552), screenshot-cosmetic.jpg, screenshot-gameplay.jpg, fov_preview.png (index.html:564 home), fov_demo.gif (referenced nowhere)}. Overview jpg shows Cosmetics panel (IDs), Gameplay checkboxes (10), FOV 130/TurncapX 315/TurncapY 290, Usage/Hotkeys/"Helpful IDs: Kickstarter Gloves/Crown..." panel. fov_demo GIF scene: "Experimental Level ... Controls Dummy" (opponent is a dummy, not a duel).
- Tooling: the Bash hook blocks `echo`, `od`, `ffmpeg`, and regexes containing `|` (even in git grep). Use Grep/Read tools; unpack with `git archive ... | tar -x -C .cache/...`. Read tool shows only the first frame of a GIF.
- Can't verify YouTube oEmbed titles (no network); mark as unverifiable.
