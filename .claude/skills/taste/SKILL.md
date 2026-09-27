---
name: taste
description: Turn a rough, vague, or one-line design request for Parker Jackim's portfolio (this Astro repo) into a robust prompt that drives the taste-skill family (design-taste-frontend plus the right companions) while holding the site's goals, operator-console identity, and stack constraints. Reads the code and docs, interviews the user one question at a time until the brief is complete, writes the prompt to docs/prompts/, then offers to run it through /design-portfolio. Use whenever the user types /taste, asks to "taste-ify", sharpen, or rewrite a design prompt, or gives a vague aesthetic ask about the portfolio ("make the work section pop", "cards feel boring", "add something cool under the hero", "make it feel more premium/modern/techy", "this looks AI-generated"), even if they never mention taste-skill. For a clear, fully specified feature request, /design-portfolio can take it directly.
argument-hint: <your rough design request, in any words>
---

# /taste

Rough requests get the model's defaults, and the model's defaults are the generic look this
site is built to avoid. taste-skill fixes that only when it is fed a real brief: page kind,
audience, vibe words, references, what to avoid, dials, and stepped stops with audits. This
skill supplies that brief from the user's intent, the site's goals, and its identity, and hands
back a prompt that another agent (or `/design-portfolio`) can run without guessing.

`$ARGUMENTS` is the user's request, verbatim. If it's empty, ask what they want to change and
stop.

**Your output is a prompt, not a design.** Don't write code or pick a final layout here. Do the
thinking a great design lead would do before briefing someone: find out what the user actually
wants, check it against what exists, and write it down so precisely that the result is
predictable.

## Step 1: Load context (read, don't ask)

Read these before saying anything beyond a one-line acknowledgement:

1. `docs/design/taste-skill.md`: how taste-skill reads a prompt, its dials, its two prompt
   templates, and the table of where this site overrides it. This is the core of the job.
2. `docs/identity/site-style.md` and `docs/identity/brand.md`: what "on-vibe" means and the
   named signature patterns. A request is translated into this vocabulary.
3. `docs/design/stack-translation.md`, then `docs/design/README.md`, and each research file its
   table maps to the request (usually `scanning-and-reading.md` and `anti-slop.md`, plus cards,
   bento, motion, disclosure, or type as relevant).
4. The code the request touches: find the page, section, and components (Grep `src/**/*.astro`;
   graph tools for `.ts`), their scripts in `src/scripts/`, tokens they use, and the content or
   data they render. Check which real media exists (`src/content/projects/*/`).
5. The newest report in `docs/audits/`, if one covers this area: its findings are ready-made
   "what's broken today" evidence.

The Goals and constraints in `CLAUDE.md` are already in your context; they rank above
everything else.

If the request is a single mechanical tweak (one colour token, one spacing value, a typo), say
that `/taste` is overkill and offer to just make the change. If it asks for something the
constraints forbid (a framework, stock or generated imagery, an invented metric, a new font),
say so plainly and offer the nearest version that fits.

## Step 2: Draft the working brief and find the gaps

Fill every field of the brief in `references/prompt-template.md` from what you read. Tag each
value with where it came from: **request**, **code/docs**, **inferred**, or **unknown**. Decode
the user's vague words with the table in `references/interview.md`; most words map to a
specific site move, and some (like "pop") are genuinely ambiguous.

Then decide, field by field, whether a wrong guess would change the design. Unknown or shakily
inferred fields that would are your questions. Everything else you state as an assumption in
the prompt, where the user can correct it at the review step.

## Step 3: Interview until you're confident

Ask **one question at a time** with `AskUserQuestion`: your recommended answer first, labelled
"(Recommended)", with a one-line reason, plus two or three real alternatives. Use the bank in
`references/interview.md` for wording and order (outcome, then surface, mode, content, feel,
motion, scope). Rules that keep the interview short and useful:

- **Look before you ask.** Never ask something the code, docs, or content can answer.
- **Ask about feel in plain words, never dial numbers.** Derive the dials from the answers.
- **Show, don't describe, when the choice is visual.** Put a small ASCII layout in the option
  `preview` when comparing structures.
- **Missing facts or media belong to the user.** Ask for them or mark them "owner to supply";
  never fill them in.
- **Stop when you're confident**: every field is filled from a source or an answer, and you can
  say in one sentence what a good result looks like on a phone (390px) and a laptop (1280px).
  That usually takes two to five questions. Don't pad to a number, and don't stop while a field
  that changes the design is still a guess.

## Step 4: Write the prompt

Fill `references/prompt-template.md` exactly. Choose the **new surface** or **redesign** steps
(a redesign is anything that changes something already on the site). Carry across only the
overrides from `docs/design/taste-skill.md#applying-it-here` that touch this surface, so the
executing agent sees the ones that matter instead of all of them.

Before saving, check the prompt against this list and fix any miss:

- Every brief field is concrete. No "modern", "clean", or "nice" without saying what it means
  here.
- No invented facts, numbers, media, or links. Anything missing is marked "owner to supply".
- Every path, component, script, and anchor you name exists (you looked).
- The design read, three dials, and one motion moment are proposed with reasons.
- The steps keep their stops, and the audits end with "Any Fail blocks completion."
- The prompt itself contains no em-dashes, since the skill it drives bans them.

## Step 5: Save, show, and offer to run

1. Save it to `docs/prompts/<YYYY-MM-DD>-<slug>.md` (today's date from `date +%F`; a short
   kebab-case slug for the surface). The file starts with the user's original request quoted
   verbatim, so anyone can see what was translated.
2. Run `npx prettier --write` on the file, then commit it on its own (`docs(prompts): …`), so
   a `/design-portfolio` worktree branched afterwards contains it.
3. Show the full prompt in the chat, then ask with `AskUserQuestion`:
   - **Run it now (Recommended):** invoke the `design-portfolio` skill with the prompt file's
     path as the argument. Its interview then only covers what the brief left open.
   - **Change something:** take the edit, update the file, commit it as a new commit, and ask
     again.
   - **Stop here:** the prompt is saved and committed for later.

## Reference files

- `references/interview.md`: the vague-word decoder and the question bank with recommended
  defaults. Read in step 2.
- `references/prompt-template.md`: the exact output format for both modes, with a worked
  example. Read in step 2 (fields) and step 4 (output).
