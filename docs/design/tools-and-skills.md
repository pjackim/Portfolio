# Design tools, skills, and references

Where the outside design guidance in this folder came from, what's worth taking from each
source, and how to use it here. Reviewed 2026-09-27. All of these target other stacks, so
translate anything you take through [stack-translation.md](./stack-translation.md).

| Source                                                   | What to take                                                                                                                                             | Where it's distilled                                                                                                                              |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [impeccable][imp] (Apache-2.0 agent skill)               | Its craft floor (contrast, spacing, type measure), motion timing, and its catalogue of generic-UI tells, which it also checks mechanically               | [anti-slop.md](./anti-slop.md), [motion.md](./motion.md), [typography-and-layout.md](./typography-and-layout.md)                                  |
| [taste-skill][taste] (MIT agent skills)                  | Layout discipline, content density, AI-tell list, pattern vocabulary, redesign protocol (audit first, preserve what works). Installed locally, see below | Same files, plus [taste-skill.md](./taste-skill.md) (how to prompt it) and [stack-translation.md](./stack-translation.md#installed-design-skills) |
| [Anthropic, "frontend design through Skills"][anthropic] | Why models drift to generic UI, and the four axes to push against (type, colour, motion, backgrounds)                                                    | [anti-slop.md](./anti-slop.md)                                                                                                                    |
| [React Bits][reactbits]                                  | A catalogue of animated-component ideas (text effects, backgrounds, micro-interactions) to browse for inspiration                                        | Not distilled. It ships framework components, so treat each as an idea to rebuild by hand, never as code to install                               |
| [Interfaces][interfaces]                                 | Nothing citable: a paid design-engineering magazine whose free landing page has no rules                                                                 | Not distilled                                                                                                                                     |

## Optional: the impeccable detector

impeccable ships a rule-based detector for many of the tells in [anti-slop.md](./anti-slop.md)
(low contrast, overflow, line length, skipped headings, gradient text, bounce easing, …). It
isn't part of this repo's toolchain. Running it (`npx impeccable detect <path-or-url>`)
downloads a binary, so ask the human first. If used, run it against built output
(`npm run build:only`, then `dist/`) and treat findings that match the "existing pattern"
table in [anti-slop.md](./anti-slop.md) as known and accepted.

## Rules for any tool or source

- **Repo constraints override every tool** (`CLAUDE.md`): no UI or CSS framework, no animation
  library, CSP with no inline styles, 30 KB JS per page, zero third-party requests, WCAG 2.2 AA,
  fact-only content, quality-first media only through the pipeline.
- Adding a dependency, hook, or tool config (including `DESIGN.md`/`PRODUCT.md`-style files a
  skill may want to generate) needs the human's go-ahead. Dependencies go through `npm i`,
  never hand-edited into `package.json`.

[imp]: https://github.com/pbakaus/impeccable
[taste]: https://github.com/Leonxlnx/taste-skill
[anthropic]: https://claude.com/blog/improving-frontend-design-through-skills
[reactbits]: https://reactbits.dev/get-started/index
[interfaces]: https://interfaces.dev/
