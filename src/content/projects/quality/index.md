---
# Sources: ../quality — README.md, PLAN/STATUS.md, pyproject.toml; git log 2026-06-19 →
# 2026-06-21 (58 commits, all m0rt).
title: 'Quality — AI-Agent-First Code Quality CLI'
summary: 'A zero-config CLI wrapping the qlty engine into one deterministic JSON report and gate, so an AI coding agent and CI enforce the identical quality loop.'
year: 2026
period: 'June 2026'
group: software
capabilities: [engineering-practice]
stack: [Python, Typer, qlty, Semgrep, Bandit, MCP]
cover: ./cover.webp
coverAlt: 'Placeholder cover reading “Cover pending”.'
featured: false
order: 100
showOnHome: false
draft: true
highlights:
  - Wraps qlty (lint, format, security, complexity, duplication) into one deterministic, byte-stable JSON report an agent can trust.
  - One `passed` boolean and disciplined exit codes run the identical gate locally and in CI.
  - Tiered verbosity (summary → compact → detailed → full) keeps a clean run near-free and full detail one flag away.
  - Ships an installable agent skill and an MCP server exposing check/fix/test/report/explain as typed tools.
  - Verified in Docker against real qlty, svelte-check, and Fallow — 66/66 offline smoke, 104/104 full matrix.
media: []
links: {}
legacyPaths: []
---

## Problem

AI coding agents need a fast, structured, trustworthy answer to "is this code good yet?" — but raw linter output is verbose, inconsistent across tools, and expensive to re-parse on every iteration, and whatever an agent runs locally rarely matches what CI actually enforces.

## Approach

`quality` is a thin, zero-config Python CLI wrapped around qlty, a local, Rust-fast quality engine: `quality init` autodetects the repo's stack and writes opinionated `.qlty/` config once; `quality check` then drives qlty's bundled tools (Semgrep, Bandit, and more) plus two custom peer engines of my own, and normalizes everything through SARIF into one deterministic, category-tagged JSON report with a single `passed` gate. Output is tiered by verbosity so a clean run costs almost nothing, and the same command gates merges in CI.

## What I built

- **Unified, deterministic report.** SARIF normalization across qlty's bundled tools plus qlty's own smells/metrics, into one category- and layer-tagged, byte-stable JSON schema.
- **Two custom peer engines beyond qlty itself.** A Svelte engine (svelte-check plus best-effort eslint-svelte via SARIF) and a Fallow structural-analysis integration (dead-code, duplication) — qlty doesn't ship either.
- **An AI-asset validator.** A pure-Python peer engine that lints `SKILL.md`/agent-definition frontmatter for the conventions markdownlint can't check.
- **Tests and coverage folded into the same gate.** `quality test` / `--tests` parses JUnit and Cobertura, with both total and diff (changed-lines-only) coverage thresholds.
- **Agent ergonomics.** An `AGENT.md` loop recipe, an installable agent skill, and an MCP server (`quality-mcp`) exposing the same operations as typed tool calls.
- **CI and installer pipeline.** A one-line idempotent installer (qlty, uv, optional bun, plus the CLI), GitLab CI integration (a diff-scoped gate on merge requests, a full gate on the default branch), and a Docker-based live end-to-end suite that clones real repos and asserts the full feature surface against real qlty, svelte-check, and Fallow.

## Outcome & lessons

Built over a three-day sprint (June 19–21, 2026), 58 commits. The project tracks "runtime-verified" against real tools separately from "contract-coded only" rather than claiming everything works: the core CLI, gate, tiered verbosity, tests/coverage, the agent skill, MCP server, and both custom peer engines are runtime-verified in a Docker harness (66/66 offline smoke, 104/104 full matrix). One gap it flags on itself: a qlty plugin-crash exit code is currently handled by an assumption that hasn't been confirmed against real qlty behavior — a crash that happens to return the same code as "findings exist" would slip past the current guard.
