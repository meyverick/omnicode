# Troubleshooting

## `omnicode` is not on PATH

After installing, if `omnicode` is not found, ensure the global npm bin directory is on `PATH`:

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

If you see a `better-sqlite3` native module error, it usually means OmniRoute is running under the wrong Node version. Ensure your current shell uses the same Node that OmniRoute was installed with:

```bash
which omniroute
omniroute --version
```

If needed, rebuild:

```bash
cd $(dirname $(which omniroute))/../lib/node_modules/omniroute/dist && npm rebuild better-sqlite3
```

Or run:

```bash
omniroute runtime repair
```

## GrayMatter or OpenSpec init fails

Check the captured logs:

```bash
cat ~/.local/share/omnicode/graymatter-init.log
cat ~/.local/share/omnicode/openspec-init.log
```

These failures are non-fatal; `omnicode` continues even if initialization fails.

## Check runtime status

```bash
omnicode --status
```

This shows whether `opencode` and `omniroute` processes are currently running.

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
