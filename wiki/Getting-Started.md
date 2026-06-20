# Getting Started

## Requirements

- Ubuntu Linux on AMD64/x86_64
- Node.js 22 or later
- npm
- [OpenCode](https://github.com/opencode-ai/opencode)
- [OmniRoute](https://github.com/meyverick/omniroute)
- (Optional) GrayMatter
- (Optional) OpenSpec

## Install dependencies

`omnicode` requires `opencode` and `omniroute` to be on your `PATH`. Install them before installing `omnicode`:

```bash
npm install -g opencode
npm install -g omniroute
```

If you use GrayMatter or OpenSpec, install those too:

```bash
# GrayMatter
sudo install -m 755 graymatter /usr/local/bin/graymatter

# OpenSpec
npm install -g @fission-ai/openspec
```

## Install omnicode

```bash
sudo npm install -g omnicode
```

No postinstall scripts run and no additional tools are installed.

## Run

```bash
omnicode
```

This will:

1. Verify that `opencode` and `omniroute` are available, or exit with an error.
2. Run `graymatter init --only opencode` if GrayMatter is installed; warn otherwise.
3. Run `openspec init --force --tools opencode` if OpenSpec is installed; warn otherwise.
4. Start `omniroute --no-open` in the background, or reuse an already running instance.
5. Resolve or create `.opencode/session.id` in the current directory.
6. Launch `opencode -s <session_id>`.

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
- OpenCode (`npm uninstall -g opencode`)
- OpenSpec (`npm uninstall -g @fission-ai/openspec`)
- GrayMatter binary (`sudo rm /usr/local/bin/graymatter`)
- Your OpenCode config in `~/.config/opencode/opencode.jsonc`

## Update

```bash
sudo npm install -g omnicode
```

Reinstalling only updates the `omnicode` wrapper.
