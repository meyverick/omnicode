# How it works

## Runtime flow

When you run `omnicode`, the npm-managed `src/bin/omnicode.js` entrypoint:

1. Verifies that `opencode` and `omniroute` are on `PATH`; exits with an error if either is missing.
2. Delegates to `src/bin/omnicode-runtime.sh` for process lifecycle management.

The Bash runtime wrapper then:

1. Runs `graymatter init --only opencode` if GrayMatter is installed; prints a warning otherwise.
2. Runs `openspec init --force --tools opencode` if OpenSpec is installed; prints a warning otherwise.
3. Starts or reuses `omniroute --no-open` in the background.
4. Resolves `.opencode/session.id`.
5. Launches `opencode -s <session_id>`.
6. Cleans up the OmniRoute process it started on exit.

## Background OmniRoute lifecycle

OmniRoute is started with `nohup omniroute --no-open >> ~/.local/share/omnicode/omniroute.log 2>&1 &`.

- Logs and PID files live under `~/.local/share/omnicode`.
- If OmniRoute is already running, the existing process is reused.
- Only the OmniRoute process started by `omnicode` is stopped when OpenCode exits and no other OpenCode process remains.

## Session persistence

`omnicode` stores the OpenCode session ID in a project-local file:

```text
.opencode/session.id
```

- If the file exists and is non-empty, its value is used.
- If the file is missing or empty, `.opencode/` is created and a UUID is generated and written to the file.
- If you pass `-s <session_id>`, the file is updated with that value.

This means each directory you run `omnicode` in can have its own persistent OpenCode session.
