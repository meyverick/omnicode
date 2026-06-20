# Getting Started

## Requirements

- Ubuntu Linux on AMD64/x86_64
- Node.js 22 or later
- npm
- `sudo` for the first install

## Install

```bash
sudo npm install -g omnicode
```

The `postinstall` script runs automatically and:

- checks that your platform is supported,
- verifies OpenCode, OmniRoute, `opencode-omniroute-auth`, OpenSpec, and GrayMatter,
- installs or updates any missing dependency,
- ensures `opencode-omniroute-auth` is registered in `~/.config/opencode/opencode.jsonc`.

## Run

```bash
omnicode
```

This will:

1. Run dependency remediation again (so upgrades are picked up).
2. Ensure your OpenCode plugin config is still correct.
3. Run `graymatter init --only opencode`.
4. Run `openspec init --force --tools opencode`.
5. Start `omniroute --no-open` in the background, or reuse an already running instance.
6. Resolve or create `.opencode/session.id` in the current directory.
7. Launch `opencode -s <session_id>`.

When OpenCode exits and no other OpenCode process is running, the OmniRoute process that `omnicode` started is stopped automatically.

### Resume a specific session

```bash
omnicode -s <session_id>
```

This writes the session ID to `.opencode/session.id` and launches OpenCode with it.

## Uninstall

```bash
npm uninstall -g omnicode
```

This removes only the npm-managed `omnicode` package and command. The following remain installed and must be removed manually if desired:

- OmniRoute (`npm uninstall -g omniroute`)
- `opencode-omniroute-auth` (`npm uninstall -g opencode-omniroute-auth`)
- OpenSpec (`npm uninstall -g @fission-ai/openspec@latest`)
- GrayMatter (`sudo rm /usr/local/bin/graymatter`)
- OpenCode plugin entry in `~/.config/opencode/opencode.jsonc`

## Update

```bash
sudo npm install -g omnicode
```

Reinstalling is idempotent and will update both the `omnicode` command and any stale dependencies it manages.
