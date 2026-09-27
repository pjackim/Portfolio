---
name: add-to-portfolio
description: Autonomously add a repository or project (a local path or a URL) to Parker Jackim's portfolio as a new project, end to end — explore the source, gather and cite every fact, find and encode media, write the entry, verify it (build, render, fact-check, accuracy panel), and merge it into the branch the run started on. Use whenever the user says "add to portfolio <path or url>" or "new portfolio project <path or url>", or otherwise asks to add a repo, folder, or link to the portfolio as a project. Asks no questions unless the request says "ask questions".
argument-hint: <path or url> [ask questions] [publish]
---

# /add-to-portfolio

A thin launcher for the `add-portfolio-project` workflow (`.claude/workflows/add-portfolio-project.js`).
The workflow does all the work; this skill only gathers its arguments, runs it, and prints its
report. The run is finished once the new project is merged into the originating branch.

## 1. Parse the request

From `$ARGUMENTS` (or the user's message, e.g. "add to portfolio ../ArcExploit"):

- **source**: the path or URL. If there is none, ask for it (the one question allowed in the
  default mode, since there is nothing to work on) and stop.
- **ask**: true only if the request contains "ask questions". Otherwise the run is fully
  autonomous: never call `AskUserQuestion` and never stop to confirm anything.
- **publish**: true only if the request says "publish" (writes `draft: false`). The default is
  `draft: true`, because publishing is Parker's call.

## 2. Gather the rest

Run these in the session's working directory:

- `originPath`: `git rev-parse --show-toplevel`
- `originBranch`: `git branch --show-current`. If it prints nothing (detached HEAD), report
  that the project needs a branch to merge into and stop.
- `date`: `date +%F` (workflow scripts can't read the clock).
- `trailer`: the commit attribution line from the current system reminder (e.g.
  `Claude-Session: https://claude.ai/code/session_…`), or an empty string if there is none.

Per CLAUDE.md, run `ListAgents` once; if a live session is working on the same project folder,
tell it you're adding `src/content/projects/<slug>/`. Otherwise send nothing.

## 3. Run the workflow

```
Workflow({ name: "add-portfolio-project",
           args: { source, originPath, originBranch, date, ask, publish, trailer } })
```

Pass `args` as a JSON object, not a string. While it runs, don't do its work yourself and don't
predict its result.

**Ask mode only.** If the result has `status: "needs_input"`, ask its `questions` with
`AskUserQuestion` (at most 4 per call; use each question's `options`, and keep asking until
every one is answered). Record each answer as the user's exact words, keyed by the question
`id`. Then resume the same run so the exploration is not repeated:

```
Workflow({ scriptPath: <scriptPath from the first result>, resumeFromRunId: <its runId>,
           args: { ...same args, answers: { <id>: "<exact words>", ... } } })
```

## 4. Finish

Your final message is the workflow's `report` field, verbatim, with nothing after it. If the
workflow died or returned no report, say so and include whatever it did return (`status`,
`branch`, `worktree`). Never push; the workflow merges locally only.
