# Configuration

## OpenCode config

`omnicode` does not modify `~/.config/opencode/opencode.jsonc`. Manage your own OpenCode plugins and settings.

## Paths touched

| Path | Purpose |
|---|---|
| `~/.local/share/omnicode/omniroute.log` | OmniRoute background log |
| `~/.local/share/omnicode/omniroute.pid` | OmniRoute PID tracking |
| `.opencode/session.id` | Project-local OpenCode session ID |

## Environment overrides

| Variable | Effect |
|---|---|
| `OMNICODE_SKIP_SUDO=1` | Deprecated; `omnicode` no longer requires sudo |

## Package structure

- `src/installer/` — minimal runtime helpers.
- `src/bin/` — runtime command and Bash wrapper.
- `test/` — package tests.
- `doc/` — documentation shipped with the package.
- `wiki/` — full technical wiki, tracked in the main repository.
- `docs/` — upstream reference repositories as Git submodules.
