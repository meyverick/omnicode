# Presets

## Overview

omos ships two custom presets on top of the protected upstream presets (`openai`, `opencode-go`, `author`, `thirtydollars`).

## maestria (Active)

**Profile:** Flexible generalist ensemble.

| Persona | Mode | Temperature | Key Skills |
|---|---|---|---|
| orchestrator | critical | — | `*` (all) |
| oracle | critical | — | `simplify`, architectural/security/QA validation |
| council | default | — | `simplify`, architectural validation |
| librarian | default | — | `clonedeps`, documentation mastery |
| explorer | default | — | `codemap`, `cavecrew` |
| designer | default | — | Svelte UI engineering, SVG, PixiJS |
| fixer | critical | — | pnpm, Vite, SvelteKit, security |
| fast-generic | critical | — | — |

**Strengths:**
- Broad MCP/skill access via orchestrator wildcard
- Simpler configuration without explicit temperatures
- Good for general mixed coding where maximum specialization is not needed
- Flexible enough for unusual tasks where narrow scopes might block useful tools

**Best for:** General high-performance orchestration, new project discovery, testing project shapes.

---

## sota

**Profile:** Precise high-assurance specialist ensemble.

| Persona | Mode | Temperature | Key Skills |
|---|---|---|---|
| orchestrator | critical | 0.2 | oh-my-opencode-slim, deepwork, worktrees, cavecrew, codemap, reflect |
| oracle | critical | 0.15 | simplify, architecture, security, QA, refactoring, bug resolution |
| council | default | 0.25 | simplify, architecture, security |
| librarian | default | 0.1 | clonedeps, documentation, markdown, AEO |
| explorer | default | 0.05 | codemap, cavecrew |
| designer | default | 0.35 | Svelte UI, SvelteKit, SVG, PixiJS, virtual avatars |
| fixer | critical | 0.05 | pnpm, Vite, SvelteKit, bug resolution, gitignore |
| fast-generic | critical | 0 | caveman-commit, caveman-review |

**Strengths:**
- Explicit `displayName` for every persona
- Explicit `temperature` tuned by role risk profile
- Tighter role-scoped MCPs/skills (no broad wildcards)
- More complete fallback chains
- Aligned with latest config features

**Best for:** Important/high-risk work, architecture/security/QA, production-impacting edits, when quality > flexibility.

---

## Comparison

| Dimension | maestria | sota |
|---|---|---|
| Flexibility | High — wildcards, broad access | Controlled — explicit scopes |
| Cost/latency | Lower — fewer explicit tools | Higher — more models/tools |
| Configuration complexity | Lower | Higher (displayName, temperature) |
| Risk tolerance | General | High-assurance |
| Model chains | Standard fallback | Extended multi-provider chains |
| Temperature control | Default | Explicit per-persona |
| Best use case | General coding, discovery | Important work, reviews, production |

## Temperature Philosophy (sota)

Lower temperature for execution/facts, higher for strategy/design:

| Persona | Temperature | Rationale |
|---|---|---|
| `fast-generic` | 0 | Deterministic command/git/test reporting |
| `explorer` | 0.05 | Exact code search, avoid speculation |
| `fixer` | 0.05 | Precise reproducible implementation |
| `librarian` | 0.1 | Factual docs synthesis |
| `oracle` | 0.15 | Deep reasoning, conservative |
| `orchestrator` | 0.2 | Planning/delegation flexibility |
| `council` | 0.25 | Diverse viewpoints, bounded |
| `designer` | 0.35 | UI/UX creative variation |

## Cons of sota

- Higher cost/latency due to more top-tier models and longer fallback chains
- More brittle to config drift (many explicit skill/MCP references)
- Less flexible than maestria (narrow scopes can block edge-case access)
- More cognitive overhead to audit (displayName, temperature, long chains)
- Free-provider-first rule may increase quota pressure before paid fallback
- Svelte/Web bias in designer/fixer skills

Use `sota` for important work. Use `maestria` when speed, simplicity, and flexibility matter more.
