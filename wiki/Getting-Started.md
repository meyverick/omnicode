# Getting Started

## Requirements

- Ubuntu Linux on AMD64/x86_64
- Node.js 22 or later (developed and tested on Node 26; OmniRoute requires Node >=22 <23 or >=24 <27)
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
sudo npm install -g @meyverick/omnicode
```

No postinstall scripts run and no additional tools are installed.

## Run

```bash
omnicode
```

This will:

1. Verify that `opencode` and `omniroute` are available, or exit with an error.
2. Run GrayMatter initialization quietly if installed (output captured to `~/.local/share/omnicode/graymatter-init.log`).
3. Run OpenSpec initialization quietly if installed (output captured to `~/.local/share/omnicode/openspec-init.log`).
4. Start `omniroute --no-open` in the background, or reuse an already running instance.
5. Look up the latest session for the current directory in the OpenCode database.
6. Launch `opencode -s <session_id>` if a session exists, or plain `opencode` to create a new session.

When OpenCode exits and no other OpenCode process is running, the OmniRoute process that `omnicode` started is stopped automatically.

### Resume a specific session

```bash
omnicode -s <session_id>
```

This launches OpenCode with `opencode -s <session_id>`. OpenCode will error if that session does not exist.

### Force continue last session

```bash
omnicode -c
```

This forces the same latest-session lookup as plain `omnicode` but makes it explicit. If a session exists for the current directory, it is resumed via `opencode -s <session_id>`.

### Check runtime status

```bash
omnicode --status
```

This prints whether `opencode` and `omniroute` processes are currently running.

### Print version

```bash
omnicode --version
```

## Uninstall

```bash
npm uninstall -g @meyverick/omnicode
```

This removes only the npm-managed `omnicode` package and command. The following remain installed and must be removed manually if desired:

- OmniRoute (`npm uninstall -g omniroute`)
- OpenCode (`npm uninstall -g opencode`)
- OpenSpec (`npm uninstall -g @fission-ai/openspec`)
- GrayMatter binary (`sudo rm /usr/local/bin/graymatter`)
- Your OpenCode config in `~/.config/opencode/opencode.jsonc`
- Runtime data in `~/.local/share/omnicode/`

## Update

```bash
sudo npm install -g @meyverick/omnicode
```

Reinstalling only updates the `omnicode` wrapper.
