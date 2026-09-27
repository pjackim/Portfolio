# Design research

Distilled findings from external sources that back the scan-first principle in the
[Goals section of `CLAUDE.md`](../../CLAUDE.md#goals-in-priority-order). Each file is
self-contained. It starts with a TL;DR of rules, then the evidence, then how the rules map onto
this repo. Read the file for the task at hand, not all of them.

**Using an outside skill, article, or component library?** Most assume React, Tailwind, or an
animation library, which this site doesn't use. Read
[stack-translation.md](./stack-translation.md) first. It maps their advice onto this stack and
says what to take from each installed design skill.

| File                                                     | Use when you're…                                                                        | Source strength                                             |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [scanning-and-reading.md](./scanning-and-reading.md)     | writing any copy, headings, summaries, or laying out a section                          | Strong: NN/g eyetracking and log-data research              |
| [cards.md](./cards.md)                                   | building or changing a project card, archive row, or any clickable tile                 | Strong: NN/g plus two accessibility references              |
| [progressive-disclosure.md](./progressive-disclosure.md) | deciding what shows on the surface vs. on the case-study page or behind a click         | Strong: NN/g                                                |
| [bento-grid.md](./bento-grid.md)                         | laying out a grid of projects/capabilities with varied importance                       | Moderate: practitioner guide, not research; use judgement   |
| [anti-slop.md](./anti-slop.md)                           | choosing colour, type, decoration, labels, or copy; reviewing whether UI looks generic  | Practitioner consensus (Anthropic, impeccable, taste-skill) |
| [motion.md](./motion.md)                                 | adding or changing any animation, hover/focus feedback, or scroll behaviour             | Practitioner consensus (impeccable, taste-skill)            |
| [typography-and-layout.md](./typography-and-layout.md)   | setting type, spacing, hierarchy, or section composition; final craft checks            | Practitioner consensus (impeccable, taste-skill)            |
| [tools-and-skills.md](./tools-and-skills.md)             | checking where a piece of guidance came from, or whether to use the impeccable detector | Reference: sources and what each is good for                |
| [stack-translation.md](./stack-translation.md)           | applying any outside design advice or installed design skill to this stack              | Repo-specific mapping (authoritative for this stack)        |
| [review-checklist.md](./review-checklist.md)             | verifying finished UI work or auditing the site: check IDs, how to verify, fix class    | Repo rubric built from the files above and `CLAUDE.md`      |

The site's own identity (what "on-vibe" means) is in
[`../identity/site-style.md`](../identity/site-style.md). Where generic advice here disagrees
with that identity, the identity wins, within `CLAUDE.md`'s constraints.

## Ground rules for using these

- **Precedence:** the repo's constraints in `CLAUDE.md` (CSP, 30 KB JS budget, zero
  third-party requests, WCAG 2.2 AA, reduced motion, fact-only content), then the goals, then
  these files, then any outside skill's defaults.
- **Numbers are from the sources, not measured here.** Cite them as heuristics, not as facts
  about this site's visitors.
- **Sources were fetched 2026-09-26/27.** Dropped as too weak: marketing-style "what recruiters
  want" blogs (claims like "6–7 seconds per portfolio" have no stated method). The one
  directional point they share, that visual project thumbnails with short outcome-focused
  descriptions beat bare titles, agrees with the NN/g findings and is folded into
  `scanning-and-reading.md`.
