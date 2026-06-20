# How it works

## Runtime flow

When you run `omnicode`, the npm-managed `src/bin/omnicode.js` entrypoint:

1. Verifies that `opencode` and `omniroute` are on `PATH`; exits with an error if either is missing.
2. Resolves the session launch mode (see [Session resolution](#session-resolution)).
3. Delegates to `src/bin/omnicode-runtime.sh` for process lifecycle management.

The Bash runtime wrapper then:

1. Runs `graymatter init --only opencode` if GrayMatter is installed; prints a warning otherwise.
2. Runs `openspec init --force --tools opencode` if OpenSpec is installed; prints a warning otherwise.
3. Starts or reuses `omniroute --no-open` in the background.
4. Launches OpenCode with the resolved session argument.
5. Cleans up the OmniRoute process it started on exit.

## Background OmniRoute lifecycle

OmniRoute is started with `nohup omniroute --no-open >> ~/.local/share/omnicode/omniroute.log 2>&1 &`.

- Logs and PID files live under `~/.local/share/omnicode`.
- If OmniRoute is already running, the existing process is reused.
- Only the OmniRoute process started by `omnicode` is stopped when OpenCode exits and no other OpenCode process remains.

## Session resolution

`omnicode` does not invent or persist session IDs. OpenCode manages its own sessions. The launch mode is resolved as follows:

- If you pass `-s <session_id>`, `omnicode` launches `opencode -s <session_id>` directly. OpenCode will report an error if that session does not exist.
- If you pass `-c` or pass nothing and at least one OpenCode session exists for the current directory, `omnicode` reads the latest session ID from OpenCode's SQLite database and launches `opencode -s <latest_session_id>`.
- If you pass nothing and no session exists, `omnicode` launches `opencode` so a new session is created.

Session IDs are read from `~/.local/share/opencode/opencode.db`, filtered by the current directory, and ordered by `time_updated`. `omnicode -c` intentionally overrides OpenCode's native `-c` behavior to avoid the internal OpenCode `dummy` session ID error.
