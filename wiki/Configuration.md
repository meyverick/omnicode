# Configuration

## OpenCode config

`omnicode` does not modify `~/.config/opencode/opencode.jsonc`. Manage your own OpenCode plugins and settings.

## Paths touched

| Path | Purpose |
|---|---|
| `~/.local/share/omnicode/omniroute.log` | OmniRoute background log |
| `~/.local/share/omnicode/graymatter-init.log` | Captured GrayMatter init output |
| `~/.local/share/omnicode/openspec-init.log` | Captured OpenSpec init output |
| `~/.local/share/omnicode/omniroute.pid` | OmniRoute PID tracking |

## Paths read

| Path | Purpose |
|---|---|
| `~/.local/share/opencode/opencode.db` | Read latest OpenCode session for the current directory |

## Package structure

- `src/bin/`: CLI entrypoint (`omnicode.js`) and Node.js runtime module (`omnicode-runtime.js`).
- `src/installer/`: cross-platform runtime helpers.
- `test/`: package tests.
- `wiki/`: full technical wiki, tracked in the main repository.
- `references/`: upstream reference repositories as Git submodules.
