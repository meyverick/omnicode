# Model Catalog

`models.json` is the source of truth for all available model IDs. It groups models by **family name**, where each family maps to a list of `provider/model-id` strings.

## Structure

```json
{
  "deepseek-v4-flash": [
    "deepseek/deepseek-v4-flash",
    "nvidia/deepseek-ai/deepseek-v4-flash",
    "ollama-cloud/deepseek-v4-flash",
    "opencode/deepseek-v4-flash-free",
    "opencode-go/deepseek-v4-flash"
  ],
  "glm-5.2": [
    "ollama-cloud/glm-5.2",
    "opencode-go/glm-5.2",
    "zai-coding-plan/glm-5.2"
  ]
}
```

## Free-Tier Constraints

Free-tier quota exhausts rapidly. Rules:

- Free-tier models/providers may be used **early-but-not-only** when they materially improve quality, speed, cost, or capability coverage.
- Early-but-not-only = place the free-tier route before paid alternatives, but always include non-free fallbacks after it.
- Use early-but-not-only for opportunistic/creative/research roles; avoid for critical deterministic execution.

### Free-Tier Models

Any model ID ending in `:free` is free-tier. Explicit free-tier model IDs:

- `opencode/big-pickle`
- `opencode/deepseek-v4-flash-free`
- `opencode/gemini-3-flash`
- `opencode/gemini-3.1-pro`
- `opencode/gemini-3.5-flash`
- `opencode/mimo-v2.5-free`
- `opencode/nemotron-3-ultra-free`
- `opencode/north-mini-code`

### Free-Tier Providers

All models from these providers are free-tier:

- `deepseek`
- `huggingface`
- `mistral`
- `nvidia`
- `ollama-cloud`
- `openrouter`

### Restricted Providers

- `opencode-zen` only allows `-free` models in this project.
- Do not use non-`-free` `opencode-zen` model IDs in presets, OmniRoute combos, or generated chains.

### OpenRouter Free-Tier Routes

OpenRouter models use the `:free` suffix convention:

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

## Family Grouping Rules

- Models with the same base name across providers are grouped under one family key.
- OpenRouter `:free` routes are grouped by base model name (ignoring the `:free` suffix).
- Example: `openrouter/qwen/qwen3-coder:free` is grouped under `qwen3-coder-480b-a35b-instruct`.
- `opencode/deepseek-v4-flash-free` is grouped under `deepseek-v4-flash` (same model, free variant).
- No duplicate model IDs across families.
