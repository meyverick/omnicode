# Model Fallback Ordering

## Overview

When a model family has multiple providers in `models.json`, the fallback chain must include all provider IDs. The `scripts/order-model-family.py` helper generates these ordered lists deterministically.

## Ordering Modes

| Mode | Order per family | Use for |
|---|---|---|
| `default` | free providers → paid providers → `opencode-go` | Opportunistic, creative, research, discovery roles |
| `critical` | paid providers → `opencode-go` → free providers | Deterministic, high-risk, write-capable, command-safety roles |

Family order from the input is preserved. Each family expands in-place before the next family begins.

## CLI Usage

```bash
# Default mode (free first)
scripts/order-model-family.py default deepseek-v4-flash, glm-5.2

# Critical mode (paid first)
scripts/order-model-family.py critical "deepseek-v4-flash,glm-5.2"

# JSON output
scripts/order-model-family.py --json default glm-5.2
```

### Output

```
deepseek/deepseek-v4-flash, nvidia/deepseek-ai/deepseek-v4-flash, ollama-cloud/deepseek-v4-flash, opencode/deepseek-v4-flash, ollama-cloud/glm-5.2, zai-coding-plan/glm-5.2, opencode-go/glm-5.2
```

With `--json`:

```json
[
  "ollama-cloud/glm-5.2",
  "zai-coding-plan/glm-5.2",
  "opencode-go/glm-5.2"
]
```

## When to Use Each Mode

### `default` (free-first)

Use for roles where cost savings and broad capacity matter more than deterministic reliability:

- `librarian` — docs research
- `designer` — UI ideation
- `explorer` — broad codebase discovery
- `council` — low-risk diversity

### `critical` (paid-first)

Use for roles where correctness, stability, latency, or command safety matter more than free quota:

- `orchestrator` — workflow planning
- `oracle` — architecture/security review
- `fixer` — production-impacting edits
- `fast-generic` — tests, builds, git operations

**Rule of thumb:** if unsure, choose `critical` for write-capable or high-risk personas and `default` for read-only/research/creative personas.

## Free Classification

A model is considered free-tier if:

1. Its ID ends with `:free` (OpenRouter convention)
2. Its ID is in the explicit free-tier list (e.g. `opencode/big-pickle`)
3. Its provider is a free-tier provider (`deepseek`, `huggingface`, `mistral`, `nvidia`, `ollama-cloud`, `openrouter`)

## Integration

To apply script ordering to presets, regenerate model chains:

```python
import json, subprocess

cfg = json.load(open('oh-my-opencode-slim.json'))
models = json.load(open('models.json'))
model_to_family = {mid: fam for fam, ids in models.items() for mid in ids}
critical = {'orchestrator', 'oracle', 'fixer', 'fast-generic'}

for preset_name in ['maestria', 'sota']:
    for persona, pcfg in cfg['presets'][preset_name].items():
        chain = pcfg.get('model', [])
        families = []
        seen = set()
        for mid in chain:
            fam = model_to_family[mid]
            if fam not in seen:
                families.append(fam)
                seen.add(fam)
        mode = 'critical' if persona in critical else 'default'
        result = subprocess.run(
            ['./scripts/order-model-family.py', '--json', mode, ','.join(families)],
            check=True, capture_output=True, text=True
        )
        pcfg['model'] = json.loads(result.stdout)

json.dump(cfg, open('oh-my-opencode-slim.json', 'w'), indent=2)
```
