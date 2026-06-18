# AGENTS Guide

## Purpose

`.AGENTS.md` is the project's self-documenting guide. It serves as the entry point for any agent or human to understand the project, locate resources, and follow rules.

## Structure

### Project Notes

Top-level orientation covering:

- **Purpose** — what omos does
- **Target state** — config must stay SOTA
- **Resource locations:**
  - Config file: `oh-my-opencode-slim.json`
  - Model catalog: `models.json`
  - Docs: `docs/`
  - Skills: `~/.config/opencode/skills/`
  - MCP inventory: `opencode mcp list`
- **Suggestion policy** — new models, skills, and MCPs may be suggested when they materially improve quality, coverage, speed, cost, or reliability

### Preset Safety

- Preserve protected presets: `openai`, `opencode-go`, `author`, `thirtydollars`
- Prefer bounded edits
- Validate JSON after every change
- Validate model IDs against `models.json`
- Validate MCP names against `opencode mcp list`

### Model Fallback Rules

- When a model family has multiple providers, use all provider IDs in the fallback chain
- Ignore `:free` suffix when grouping OpenRouter models by family
- Preserve requested family order; expand each family in-place
- Use `scripts/order-model-family.py` to generate ordered provider lists
- `default` mode: free → paid → `opencode-go` (per family)
- `critical` mode: paid → `opencode-go` → free (per family)
- Use `default` for opportunistic/non-critical roles
- Use `critical` for deterministic/high-risk roles

### Free Tier Constraints

- Free-tier quota exhausts rapidly
- Free-tier routes may be used early-but-not-only for opportunistic roles
- Avoid free-tier for critical deterministic execution
- Lists all free-tier models, OpenRouter free routes, and free-tier providers

## GrayMatter Memory

The `.AGENTS.md` includes a managed block for [GrayMatter](https://github.com/nicobailon/graymatter) persistent agent memory:

- `memory_search` — retrieve prior context at task start
- `memory_add` — store durable facts, preferences, decisions
- `memory_reflect` — update or forget stale facts
- `checkpoint_save` / `checkpoint_resume` — snapshot/restore session state

Use stable `agent_id` of the form `<project>-<role>` (e.g. `omos-orchestrator`).

## When to Update

Update `.AGENTS.md` when:

- Adding new resource locations
- Changing preset safety rules
- Adding new free-tier models or providers
- Changing model fallback ordering rules
- Learning new project conventions or constraints
