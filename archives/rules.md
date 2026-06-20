<!-- graymatter:instructions:begin — managed by `graymatter init`; edits inside this block are overwritten -->
## Memory (GrayMatter)

This project has persistent agent memory via the `graymatter` MCP tools:

- `memory_search` (`agent_id`, `query`) — call at the **start of a task** when prior context might matter.
- `memory_add` (`agent_id`, `text`) — call whenever you learn something **durable**: user preferences, decisions, conventions, gotchas.
- `memory_reflect` (`action`, `agent`, `text`/`target`) — update or forget stale facts. ⚠ takes `agent`, not `agent_id`.
- `checkpoint_save` / `checkpoint_resume` (`agent_id`) — snapshot/restore session state before major refactors or across restarts.

Use a stable `agent_id` of the form `<project>-<role>` (e.g. `omos-orchestrator`). Store conclusions, not conversation logs. Err on the side of remembering.
<!-- graymatter:instructions:end -->

# Project Notes

- Purpose: configure and optimize `oh-my-opencode-slim.json` presets for efficient multi-agent orchestration.
- Target state: upgraded config must stay SOTA, aligned with current upstream releases, new models, new MCPs, new skills, and relevant new `oh-my-opencode-slim` features.
- Config file: `oh-my-opencode-slim.json`.
- Model catalog: `models.json`; source of truth for available model IDs.
- New models may be suggested when they would materially improve preset quality, capability coverage, speed, cost, or reliability.
- Docs: `docs/`; project documentation and copied upstream docs live here. Re-check this folder because user may add docs later.
- Skills: `~/.config/opencode/skills/`; user may later edit, delete, or add skill folders there.
- New skills may be suggested when they would materially improve preset quality, capability coverage, speed, cost, or reliability.
- MCP inventory: run `opencode mcp list` when assigning MCP servers to personas.
- New MCP servers may be suggested when they would materially improve preset quality, capability coverage, speed, cost, or reliability.

## Preset Safety

- Preserve existing protected presets unless user explicitly overrides: `openai`, `opencode-go`, `author`, `thirtydollars`.
- Prefer bounded edits.
- Validate JSON after every config change.
- Validate new model IDs against `models.json`.
- Validate MCP names against `opencode mcp list`.

## Model Fallback Rules

- When a model family has multiple provider IDs in `models.json`, use all provider IDs in the fallback chain.
- When grouping OpenRouter free models, ignore the trailing `:free` suffix for family matching.
- Preserve requested model family order. Expand each family in-place before moving to the next family.
- Use `scripts/order-model-family.py` to generate ordered provider lists from `models.json`.
- `default` order per family: free/free-tier providers, paid providers, `opencode-go/...`.
- `critical` order per family: paid providers, `opencode-go/...`, free/free-tier providers.
- Use `default` for opportunistic/non-critical roles where cost savings and broad capacity matter more than deterministic reliability: `librarian`, `designer`, exploratory research, UI ideation, broad discovery, low-risk council diversity.
- Use `critical` for roles where correctness, stability, latency predictability, or command safety matter more than free quota savings: `orchestrator`, `oracle`, `fixer`, `fast-generic`, security/architecture review, production-impacting edits, tests/builds/git operations.
- If unsure, choose `critical` for write-capable or high-risk personas and `default` for read-only/research/creative personas.

Example:

```bash
scripts/order-model-family.py default deepseek-v4-flash, glm-5.2
scripts/order-model-family.py critical "deepseek-v4-flash,glm-5.2"
scripts/order-model-family.py --json default glm-5.2
```

```json
"model": [
  "openai/gpt-5.5-fast",
  "ollama-cloud/glm-5.2",
  "zai-coding-plan/glm-5.2",
  "opencode-go/glm-5.2",
  "openai/gpt-5.4-fast"
]
```

## Free Tier Constraints

Free-tier quota can be exhausted rapidly. Any preset using these must include non-free fallbacks, or avoid them for critical personas.

- Free-tier models/providers may be used early-but-not-only when they materially improve quality, speed, cost, or capability coverage.
- Early-but-not-only means place the free-tier route before paid/stable alternatives, but always include non-free fallback models after it.
- Use early-but-not-only especially for opportunistic creative/research roles where quota exhaustion is acceptable; avoid it for critical deterministic execution unless explicitly justified.
- Balance model-family usage across free providers and paid providers. Do not route high-frequency personas through one free provider family exclusively; mix free-capable families with paid fallbacks to avoid rapidly exhausting any single quota pool.
- For `default` routing, prefer free-capable families first with paid fallbacks later. For `critical` routing, prefer paid/stable families first but keep free-capable fallbacks later for coverage and quota resilience.

### Free-tier models

- Any model ID ending in `:free` is free-tier.
- Any `opencode-zen/...` model must be treated as free-tier only when its model ID ends in `-free`; non-`-free` `opencode-zen` models are unavailable and must not be used.
- `opencode/big-pickle`
- `opencode/deepseek-v4-flash-free`
- `opencode/gemini-3-flash`
- `opencode/gemini-3.1-pro`
- `opencode/gemini-3.5-flash`
- `opencode/mimo-v2.5-free`
- `opencode/nemotron-3-ultra-free`
- `opencode/north-mini-code-free`

### OpenRouter free-tier routes

- `openrouter/cognitivecomputations/dolphin-mistral-24b-venice-edition:free`
- `openrouter/cohere/north-mini-code:free`
- `openrouter/google/gemma-4-26b-a4b-it:free`
- `openrouter/google/gemma-4-31b-it:free`
- `openrouter/liquid/lfm-2.5-1.2b-instruct:free`
- `openrouter/liquid/lfm-2.5-1.2b-thinking:free`
- `openrouter/meta-llama/llama-3.2-3b-instruct:free`
- `openrouter/meta-llama/llama-3.3-70b-instruct:free`
- `openrouter/nex-agi/nex-n2-pro:free`
- `openrouter/nousresearch/hermes-3-llama-3.1-405b:free`
- `openrouter/nvidia/nemotron-3-nano-30b-a3b:free`
- `openrouter/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`
- `openrouter/nvidia/nemotron-3-super-120b-a12b:free`
- `openrouter/nvidia/nemotron-3-ultra-550b-a55b:free`
- `openrouter/nvidia/nemotron-3.5-content-safety:free`
- `openrouter/nvidia/nemotron-nano-12b-v2-vl:free`
- `openrouter/nvidia/nemotron-nano-9b-v2:free`
- `openrouter/openai/gpt-oss-120b:free`
- `openrouter/openai/gpt-oss-20b:free`
- `openrouter/poolside/laguna-m.1:free`
- `openrouter/poolside/laguna-xs.2:free`
- `openrouter/qwen/qwen3-coder:free`
- `openrouter/qwen/qwen3-next-80b-a3b-instruct:free`

### Free-tier providers

- `deepseek`
- `google`
- `huggingface`
- `mistral`
- `nvidia`
- `ollama-cloud`
- `openrouter`

### Restricted providers

- `opencode-zen` only allows `-free` models in this project. Do not use non-`-free` `opencode-zen` model IDs in presets, OmniRoute combos, or generated chains.
