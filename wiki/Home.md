# omos Wiki

Welcome to the omos technical wiki. This is the source of truth for configuration, model catalogs, preset design, and tooling.

## Pages

| Page | Description |
|---|---|
| [Getting Started](Getting-Started) | Prerequisites, clone, submodule init, first steps |
| [Configuration](Configuration) | `oh-my-opencode-slim.json` structure, presets, personas |
| [Model Catalog](Model-Catalog) | `models.json`, free-tier constraints, provider families |
| [Model Fallback Ordering](Model-Fallback-Ordering) | `order-model-family.py` reference and ordering rules |
| [Presets](Presets) | `maestria` vs `sota` comparison, when to use each |
| [AGENTS Guide](AGENTS-Guide) | `.AGENTS.md` purpose, rules, and project conventions |

## Overview

omos is a configuration workspace for [oh-my-opencode-slim](https://github.com/alvinunreal/oh-my-opencode-slim). It provides:

- **`oh-my-opencode-slim.json`** — the main config with validated presets (`maestria`, `sota`) plus protected upstream presets.
- **`models.json`** — model catalog grouping all available model IDs by family across providers.
- **`scripts/order-model-family.py`** — deterministic provider ordering helper for fallback chains.
- **`.AGENTS.md`** — project guide covering resources, rules, and free-tier constraints.
- **`docs/oh-my-opencode-slim/`** — upstream oh-my-opencode-slim docs as a git submodule.
