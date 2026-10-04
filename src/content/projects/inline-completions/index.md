---
# Sources: ../inline-completions — README.md, package.json; git log 2026-02-15 → 2026-06-10
# (18 commits, all m0rt).
title: 'Inline Completion Agent Framework'
summary: "Autocomplete for VS Code that runs on 17+ AI services, so I'm not tied to one company. Its assistant edits files, asks first by default, and can undo a run's file changes."
tldr: "A plugin for the VS Code code editor that I wrote. It finishes your code as you type, using whichever AI provider you pick rather than being locked to one vendor. It also includes an AI assistant you can ask to edit your project's files. Early version."
year: 2026
period: 'February–June 2026'
group: software
capabilities: [engineering-practice]
stack: [TypeScript, VS Code Extension API, esbuild, MCP, LLM provider APIs]
cover: ./cover.webp
coverAlt: 'Placeholder cover image reading "Cover pending".'
featured: false
order: 100
draft: true
highlights:
  - Works with 17+ AI services. Use your own account and switch any time.
  - The assistant searches your project and can use outside tools you connect.
  - Every edit shows before and after, and one command undoes the run's file changes.
media: []
links: {}
legacyPaths: []
---

Suggestions show up as faded text. Press **Tab** to keep one.

- **Pick any AI.** Paste the key from your AI company's account, then choose a model from a live list.
- **Edits your files, with a safety net.** Give the assistant a task. It asks before editing or running anything by default, and shows an estimated cost per run.
- **Guesses your next edit.** Turn on the optional setting and it suggests the next change after you pause.

**Where it stands:** early, version 0.0.1. You build and run it yourself, and some features need a VS Code startup flag.
