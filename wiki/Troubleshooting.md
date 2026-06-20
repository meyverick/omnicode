# Troubleshooting

## `omnicode` is not on PATH

After `sudo npm install -g omnicode`, if `omnicode` is not found, ensure the global npm bin directory is on `PATH`:

```bash
export PATH="$(npm config get prefix)/bin:$PATH"
```

Add that line to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.) to make it persistent.

## Missing required tool

If you see:

```text
[omnicode] ERROR: missing required tool(s): opencode, omniroute
```

Install the missing tool(s) globally and make sure they are on `PATH`:

```bash
npm install -g opencode
npm install -g omniroute
```

## Platform not supported

`omnicode` currently supports Ubuntu Linux on AMD64 only. Running on other platforms exits before making changes.

## OmniRoute does not start

Check the log:

```bash
cat ~/.local/share/omnicode/omniroute.log
```

Verify `omniroute --no-open` works when run directly.

## Rollback / manual cleanup

If you want to fully remove everything `omnicode` touched:

```bash
npm uninstall -g omnicode
npm uninstall -g omniroute
npm uninstall -g opencode
npm uninstall -g @fission-ai/openspec
sudo rm /usr/local/bin/graymatter
rm -rf ~/.local/share/omnicode
```

## Legacy content

The old `omos` / `oh-my-opencode-slim` workspace content lives in `archives/` and is no longer part of the active `omnicode` path.
