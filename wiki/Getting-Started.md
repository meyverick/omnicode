# Getting Started

## Prerequisites

- [Python 3.10+](https://www.python.org/)
- [Git](https://git-scm.com/)
- [opencode](https://github.com/sst/opencode) with [oh-my-opencode-slim](https://github.com/alvinunreal/oh-my-opencode-slim) installed
- MCP servers configured: `railway`, `github`, `graymatter`, `codebase-index`, `token-optimizer`, `google-dev-knowledge`, `svelte`, `websearch`, `context7`, `gh_grep`

## Clone

```bash
git clone --recurse-submodules https://github.com/meyverick/omos.git
cd omos
```

If you cloned without `--recurse-submodules`:

```bash
git submodule update --init --recursive
```

## Verify MCP Servers

```bash
opencode mcp list
```

All 10 servers should show `connected`.

## File Structure

```
omos/
├── .AGENTS.md                    # Project guide (resources, rules, constraints)
├── oh-my-opencode-slim.json      # Main config with presets
├── models.json                   # Model catalog (source of truth)
├── scripts/
│   └── order-model-family.py     # Provider ordering helper
├── docs/
│   └── oh-my-opencode-slim/      # Upstream docs (git submodule)
└── wiki/                         # This documentation
```

## Active Preset

The active preset is set in `oh-my-opencode-slim.json`:

```json
"preset": "maestria"
```

Switch presets at runtime:

```
/preset sota
```

## Validate Config

After any change, validate JSON integrity:

```bash
python3 -c "import json; json.load(open('oh-my-opencode-slim.json')); print('OK')"
```

Validate model IDs, MCP names, and skill references:

```bash
python3 - <<'PY'
import json
from pathlib import Path

cfg = json.loads(Path('oh-my-opencode-slim.json').read_text())
models = json.loads(Path('models.json').read_text())

model_ids = {mid for ids in models.values() for mid in ids}
available_mcps = {'railway','github','graymatter','codebase-index','token-optimizer','google-dev-knowledge','svelte','websearch','context7','gh_grep'}
skill_dirs = {p.parent.name for p in Path.home().joinpath('.config/opencode/skills').glob('*/SKILL.md')}

for preset_name, preset in cfg['presets'].items():
    for persona, pcfg in preset.items():
        for mid in pcfg.get('model', []):
            assert mid in model_ids, f'{preset_name}.{persona}: unknown model {mid}'
        for mcp in pcfg.get('mcps', []):
            if mcp.startswith('!') or mcp == '*': continue
            assert mcp in available_mcps, f'{preset_name}.{persona}: unknown MCP {mcp}'
        for skill in pcfg.get('skills', []):
            if skill.startswith('!') or skill == '*': continue
            assert skill in skill_dirs, f'{preset_name}.{persona}: unknown skill {skill}'

print('OK: all references valid')
PY
```
