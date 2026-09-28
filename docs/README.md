# Docs

Reference material for humans and agents working on this portfolio. Project rules and the
goals live in [`CLAUDE.md`](../CLAUDE.md); how to add projects and media is in the root
[`README.md`](../README.md).

- [`design/`](./design/README.md): distilled, sourced design guidance
  (scanning and copy, cards, progressive disclosure, grids, motion, typography and layout,
  avoiding generic "AI" looks) plus
  [`stack-translation.md`](./design/stack-translation.md) for applying outside design
  advice and installed design skills to this Astro + vanilla-CSS/TS stack. Each file opens with
  TL;DR rules and ends with how they apply to this repo. Start at its `README.md` and read only
  the file for the task at hand.
- [`identity/`](./identity/site-style.md): the site's own look and feel ("operator console":
  palette and type roles, signature elements, motion personality, voice). This is what "on-vibe"
  means, and it wins over generic design advice.
- [`design/review-checklist.md`](./design/review-checklist.md): the rubric
  (check IDs, how to verify each check, whether a fix is mechanical or a judgement call) used to
  grade UI work.
- [`audits/`](./audits/): dated `/audit-portfolio` reports.
- [`prompts/`](./prompts/): dated `/taste` prompts, each opening with the rough request it
  translated.

Two project skills run the full loop: `/design-portfolio <feature>` (explore → brief →
prototypes → build → verify → staged merge) and `/audit-portfolio [focus]` (live testing → lens
review → report with a screenshot and proposed solution per issue; no code changes).
`/audit-portfolio fix` then implements a report's solutions without prompting. `/taste <rough
request>` sits in front of `/design-portfolio`: it turns a vague ask into a full taste-skill
prompt and offers to run it.
