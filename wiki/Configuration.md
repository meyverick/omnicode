# Configuration

## Root Structure

`oh-my-opencode-slim.json` top-level keys:

| Key | Description |
|---|---|
| `$schema` | JSON schema URL for validation |
| `preset` | Active preset name (runtime switchable via `/preset`) |
| `fallback` | Fallback configuration (`enabled`, `retry_on_empty`) |
| `presets` | Map of preset names to persona configurations |
| `agents` | Custom agent definitions (e.g. `fast-generic`) |
| `tmux` | Tmux layout settings |

## Preset Object Shape

Each preset maps persona names to configuration blocks:

```json
{
  "orchestrator": {
    "displayName": "SOTA Orchestrator",
    "model": ["openai/gpt-5.5-fast", "openai/gpt-5.5", "..."],
    "variant": "medium",
    "temperature": 0.2,
    "skills": ["oh-my-opencode-slim", "deepwork"],
    "mcps": ["codebase-index", "graymatter"]
  }
}
```

### Fields

| Field | Type | Description |
|---|---|---|
| `displayName` | string | Human-readable persona alias |
| `model` | array | Ordered fallback chain of `provider/model-id` strings |
| `variant` | string | Reasoning effort: `low`, `medium`, `high`, `max` |
| `temperature` | number | Sampling temperature (0 = deterministic, higher = creative) |
| `skills` | array | Skill names from `~/.config/opencode/skills/`, or `*` for all |
| `mcps` | array | MCP server names from `opencode mcp list`, or `*` for all (supports `!name` exclusion) |

## Runtime Switching

Fields affected live by `/preset <name>` (no restart):

- `model`
- `temperature`
- `variant`
- `options`

Fields requiring restart:

- `prompt`
- `skills`
- `mcps`
- `displayName`

## Personas

| Persona | Role | Critical? |
|---|---|---|
| `orchestrator` | Workflow planning, delegation, monitoring | Yes |
| `oracle` | Architecture, risk, debugging strategy, review | Yes |
| `council` | Independent analysis / multi-model review | No |
| `librarian` | External docs and library research | No |
| `explorer` | Fast codebase recon and pattern matching | No |
| `designer` | UI/UX design, implementation, polish | No |
| `fixer` | Bounded implementation and execution | Yes |
| `fast-generic` | Routine mechanical command work (git, builds, tests) | Yes |

## Protected Presets

The following presets are preserved and must not be modified unless explicitly overridden:

- `openai`
- `opencode-go`
- `author`
- `thirtydollars`

## Custom Presets

omos ships two custom presets:

- **`maestria`** (active) — flexible generalist ensemble
- **`sota`** — precise high-assurance specialist ensemble

See [Presets](Presets) for detailed comparison.
