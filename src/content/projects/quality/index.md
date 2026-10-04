---
# Sources: ../quality — README.md, PLAN/STATUS.md, pyproject.toml; git log 2026-06-19 →
# 2026-06-21 (58 commits, all m0rt). Wraps qlty (README.md); tests are opt-in (README.md); CI and
# live agent run unverified (PLAN/STATUS.md phases 6 and 7).
title: 'Quality: One Pass/Fail Check for AI Coding Agents'
summary: 'AI coding agents get walls of messy tool output. My command-line tool boils style and security checks down to one pass or fail.'
tldr: "Quality is a small command-line program that gives AI coding assistants one pass or fail on a project's style and security checks, instead of pages of messy reports. It wraps the free qlty code scanner. Early alpha, not publicly released yet."
year: 2026
period: 'June 2026'
group: software
capabilities: [engineering-practice]
stack: [Python, Typer, qlty, Semgrep, Bandit, MCP]
cover: ./cover.webp
coverAlt: 'Placeholder cover reading “Cover pending”.'
featured: false
order: 100
draft: true
highlights:
  - One command, one short pass or fail.
  - Built so an agent and a build server run the same check.
  - 'Early alpha: the core check works, some parts are untested.'
media: []
links: {}
legacyPaths: []
---

## Before: walls of output

An agent edits code and asks "is it good yet?" It gets pages of output from many separate tools and has to dig for the answer.

## After: one verdict

- **One short report** that ends in pass or fail. A clean run prints a single line starting with **PASSED**.
- **Same check everywhere.** The agent runs it, fixes what it flags, and reruns. A build server, the machine that vets every change, runs the same command.
- **Built for AI tools.** Coding assistants can call it directly as an add-on.

It sits on qlty, a free code-scanning engine. I wrote the wrapper and some extra checks.

## Early alpha

Built in three days (June 2026). The core check works against the real scanners, but a scanner crash may not be caught. It has not run on a real build server or with a live AI agent, and it is not published for install yet.
