---
# Sources: ../inline-completions — README.md, package.json; git log 2026-02-15 → 2026-06-10
# (18 commits, all m0rt).
title: 'Inline Completion Agent Framework'
summary: 'A model-agnostic VS Code extension: multi-provider inline completions plus an autonomous agent mode with typed tools, MCP support, and diff-based review.'
year: 2026
period: 'February–June 2026'
group: software
capabilities: [engineering-practice]
stack: [TypeScript, VS Code Extension API, esbuild, MCP, LLM provider APIs]
cover: ./cover.webp
coverAlt: 'Placeholder cover reading “Cover pending”.'
featured: true
order: 8
showOnHome: false
draft: true
highlights:
  - Routed completions across 17+ LLM providers (OpenAI, Anthropic, Groq, Cerebras, Portkey, Ollama, and more) with live /models discovery.
  - Built an autonomous agent mode with a typed tool registry gated by per-tool permissions, diff-based edit review, and full revert via file snapshots.
  - Implemented a minimal JSON-RPC 2.0 MCP client so external MCP servers' tools plug straight into the agent.
  - Added a Next-Edit-Suggestions predictor that proposes the next likely edit elsewhere in the file from recent-edit history.
  - Aggregated rich context (diagnostics, recent edits, token budgeting) with adaptive debouncing to keep latency low.
media: []
links: {}
legacyPaths: []
---

## Problem

VS Code's built-in completions are lightweight but shallow, while chat-based coding agents are heavier and break the "always-on" typing flow. There wasn't a single extension that covered both ends — fast inline suggestions for routine code, and an escalation path to more capable models or an autonomous agent for harder tasks — without locking into one AI provider.

## Approach

Built a model-agnostic VS Code extension around a multi-tiered delegation router: a fast route for routine completions, a heavy route that escalates to more capable models for complex logic, and specialist agent profiles for domain-specific tasks (tests, docs, security). Context sent to the model is aggregated from the prefix/suffix, current selection, nearby diagnostics, and recent edits, with budgeting to fit token limits, and adaptive debouncing tunes suggestion frequency to typing speed and network latency.

On top of completions, the extension adds an agent platform: a typed tool registry (read/list/search/edit/create-file, an opt-in run_command) gated by a per-tool permission service, an MCP client that adapts external MCP servers' tools into the same registry, Copilot-compatible prompt files, Anthropic-style Skills discovery, and a Next-Edit-Suggestions predictor built on edit-diff history.

## What I built

- **Multi-provider delegation router.** Fast/heavy/specialist routing across 17+ LLM providers with live `/models` discovery and dedicated Portkey gateway support.
- **Rich context aggregation.** Prefix/suffix, selection, diagnostics, and recent-edit tracking with token budgeting.
- **Agent mode.** An autonomous multi-step loop over a typed tool registry, per-tool permission gating (Allow Once / Always / Never), readable diff-based edit review, per-run file snapshots with full revert, and token/cost reporting per run and lifetime.
- **MCP client.** A minimal JSON-RPC 2.0 implementation, with no external SDK, that connects stdio MCP servers and adapts their tools into the agent's registry.
- **Prompt files and Skills.** Copilot-compatible `*.prompt.md` files and Anthropic-style `SKILL.md` discovery, both relevance-matched into the agent's system prompt or run directly.
- **Next Edit Suggestions.** Predicts the next likely edit elsewhere in the file from recent-edit history, with a proactive ghost-text mode.
- **Inline Control Center.** A native, theme-aware webview (sidebar and editor panel) for live performance stats, provider/model switching, and manual overrides.

## Outcome & lessons

Built solo between February and June 2026, about 12.7k lines across roughly 35 modules split by concern (agent orchestration, checkpoint/snapshot service, cost tracking, delegation routing, Next Edit Suggestions, tool permissions, MCP, UI). The extension covers a Copilot-equivalent feature surface — inline completions, agent mode, MCP, prompt files — while staying provider-agnostic and bring-your-own-key.
