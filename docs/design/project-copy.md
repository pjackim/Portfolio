# Project page copy

## TL;DR: rules

Written after the 2026 pages (BodyCam External and others) came out at 800 to 1,200 words of
detail the audience did not care about. They were cut by 60 to 85%. These rules apply to every
project's `summary`, `highlights`, captions, alt text and Markdown body.

1. **Write for a stranger with no context**: no knowledge of Parker's goals, the project, or its
   domain (game engines, memory editing, MCP, linters, TTS). They read ~20% of the words
   ([scanning-and-reading.md](./scanning-and-reading.md)).
2. **In 10 seconds they know what it is and why it's impressive.** The `summary` is the card text
   and the page lede, so it stands alone: what it is in plain words, then the best true fact.
3. **Features and outcomes, not mechanisms.** What a person can do or see ("click the map to
   teleport"), not how it's wired. No function or hook names, offsets, hex, class counts, module
   names or library lists. A mechanism stays only when it is itself the impressive part, in one
   plain sentence.
4. **Cut process history**: commit, file and test counts, per-commit dates, "it shrank as it went".
   A number stays only if a stranger would say "wow" or it is the honest status.
5. **Define a domain term once, in a few words, or cut it.**
6. **Human.** First person, plain, specific, a little personality. No hype words, no "X. No Y."
   aphorisms, no em-dashes in new copy, no filler openers, no reflexive triples.
7. **Honest, in one line.** Fact-only still binds. If it is unproven, unfinished or only tested
   with mocks, say so in one short plain sentence under "Where it stands" (or similar), not buried
   and not dropped. A claim you cannot verify is cut.
8. **Pick the structure that fits the work.** Problem → Approach → What I built → Outcome is one
   option, not the template. Others: a demo-led tour (each paired block names something a visitor
   can do or see), a before/after, one paragraph beside a diagram, a short story, a plain feature
   list. Pages in the same collection should not all share one skeleton.

## Budgets (soft ceilings; Mordhau is the baseline to beat)

| Field         | Budget                                                                                |
| ------------- | ------------------------------------------------------------------------------------- |
| `summary`     | 2 short sentences, ≤ 180 characters (schema cap)                                      |
| `highlights`  | ≤ 5, each ≤ ~14 words, outcome first. Only featured projects render them              |
| Body          | ≤ ~180 words (~260 with eight figures)                                                |
| Captions      | ≤ ~12 words and adding something the text doesn't, or none                            |
| Alt text      | what a screen-reader user needs, ≤ ~35 words                                          |
| Code spans    | only a command or name a reader would literally type; no hex, paths or function names |
| Visible total | ~300 words (~380 with eight figures)                                                  |

For a non-featured project the highlights are not shown, so the summary and the first lines of
the body carry the key facts.

## Structure mechanics

- Headings never skip a level (h2, then h3). The h2s feed the sticky section index: use two to
  four clearly named ones, or none. A heading's first two words carry meaning.
- Paired blocks (`<div data-pair="key">`, [CLAUDE.md](../../CLAUDE.md#architecture)) read best as a
  short `###` label plus one or two sentences, beside the media that shows it. A caption that
  echoes the paragraph beside it goes.
- `tests/pairs.spec.ts` runs against `bodycam-external`: keep at least four pairs and at least one
  figure in the gallery.

## Before you commit a page

Re-read it as the stranger and delete one more layer. Then: `npx prettier --write` the file, and
`npm run build` (the schema and the pair checks run there).
