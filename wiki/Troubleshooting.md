# Troubleshooting

## `omnicode` is not on PATH

After `sudo npm install -g omnicode`, if `omnicode` is not found, ensure the global npm bin directory is on `PATH`:

```bash
export PATH="$(npm config get prefix)/bin:$PATH"
```

Add that line to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.) to make it persistent.

## First install fails without sudo

The first install requires `sudo` because GrayMatter is placed in `/usr/local/bin`. Either run with `sudo` or set:

```bash
OMNICODE_SKIP_SUDO=1 npm install -g omnicode
```

Skipping sudo may cause GrayMatter installation to fail.

## Platform not supported

`omnicode` currently supports Ubuntu Linux on AMD64 only. Running on other platforms exits before making changes.

## OpenCode config parsing error

If `~/.config/opencode/opencode.jsonc` is malformed, `omnicode` prints the parse error and exits without modifying the file. Fix the syntax manually and rerun.

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
npm uninstall -g opencode-omniroute-auth
npm uninstall -g @fission-ai/openspec@latest
sudo rm /usr/local/bin/graymatter
rm -rf ~/.local/share/omnicode
```

Then remove the `opencode-omniroute-auth` entry from `~/.config/opencode/opencode.jsonc` if desired.

## Legacy content

The old `omos` / `oh-my-opencode-slim` workspace content lives in `archives/` and is no longer part of the active `omnicode` installer path.
