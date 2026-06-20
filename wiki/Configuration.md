# Configuration

## OpenCode config

`omnicode` reads and writes `~/.config/opencode/opencode.jsonc`.

It ensures the `plugin` array contains exactly one entry for `opencode-omniroute-auth`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-omniroute-auth"
  ]
}
```

The merge logic:

- Preserves unrelated keys such as `model`, `provider`, or custom plugin entries.
- Creates the config file if it does not exist.
- Backs up the existing file before writing changes.
- Does not configure `@omniroute/opencode-plugin`.

## Paths touched

| Path | Purpose |
|---|---|
| `~/.config/opencode/opencode.jsonc` | OpenCode plugin configuration |
| `~/.local/share/omnicode/omniroute.log` | OmniRoute background log |
| `~/.local/share/omnicode/omniroute.pid` | OmniRoute PID tracking |
| `.opencode/session.id` | Project-local OpenCode session ID |
| `/usr/local/bin/graymatter` | GrayMatter binary installed by first run |

## Environment overrides

| Variable | Effect |
|---|---|
| `OMNICODE_SKIP_SUDO=1` | Skip the first-install sudo requirement check |

## Package structure

- `src/installer/` — install-time logic.
- `src/bin/` — runtime command and Bash wrapper.
- `test/` — package tests.
- `doc/` — documentation shipped with the package.
- `wiki/` — full technical wiki, tracked in the main repository.
- `docs/` — upstream reference repositories as Git submodules.
