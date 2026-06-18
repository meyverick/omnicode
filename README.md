# omos

> Orchestrate smarter. Tune `oh-my-opencode-slim` presets with precision, fallback resilience, and SOTA alignment.

## What is omos?

omos is a configuration workspace for crafting high-performance, multi-agent presets for [oh-my-opencode-slim](https://github.com/alvinunreal/oh-my-opencode-slim). It provides curated model catalogs, intelligent fallback ordering, and battle-tested preset ensembles so your agent fleet always has the right model, the right tools, and the right safety nets.

## Why

Managing presets by hand is error-prone:

- Free-tier quotas exhaust mid-session with no fallback.
- Model families scatter across providers with no consistent ordering.
- Skills and MCPs get assigned arbitrarily, bloating context or missing capabilities.
- No validation guardrails catch broken references before they ship.

omos solves this with a structured catalog, a deterministic ordering helper, and validated preset ensembles built for real orchestral workflows.

## Features

- **Curated model catalog** — every available model and provider route in one source of truth, grouped by family with free-tier awareness.
- **Deterministic fallback ordering** — a CLI helper that expands model families into ordered provider chains: free-first for opportunistic roles, paid-first for critical roles.
- **Validated preset ensembles** — `maestria` (flexible generalist) and `sota` (precise high-assurance specialist) with full persona coverage, explicit temperatures, and role-scoped MCPs/skills.
- **Free-tier safety** — clear rules for when to use free providers early-but-not-only, and when to avoid them entirely for critical personas.
- **Self-documenting** — `.AGENTS.md` serves as a living project guide covering resources, rules, and constraints.

## Explore

Full technical documentation lives in the **[Wiki](https://github.com/meyverick/omos/wiki)**:

- [Getting Started](https://github.com/meyverick/omos/wiki/Getting-Started)
- [Configuration](https://github.com/meyverick/omos/wiki/Configuration)
- [Model Catalog](https://github.com/meyverick/omos/wiki/Model-Catalog)
- [Model Fallback Ordering](https://github.com/meyverick/omos/wiki/Model-Fallback-Ordering)
- [Presets](https://github.com/meyverick/omos/wiki/Presets)
- [AGENTS Guide](https://github.com/meyverick/omos/wiki/AGENTS-Guide)

## License

MIT
