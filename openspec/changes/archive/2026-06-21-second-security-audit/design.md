## Context

After the first security/performance audit and the subsequent simplification to remove dependency management, the codebase shrank to three small source files. A second pass revealed that some hardening was inconsistent between the Node.js wrapper and the bash runtime, and that the simplification left behind unused helpers and parameters.

## Goals / Non-Goals

**Goals:**

- Make process detection in the bash runtime consistent with the Node.js wrapper (`pgrep -x`).
- Ensure user-local binaries take precedence over system binaries in PATH.
- Remove the PID-file creation race and protect against symlink attacks.
- Remove unused code (`run()`, `getRuntimeDir()`, `continueSession` parameter).
- Fix whitespace/indentation issues in the bash runtime.

**Non-Goals:**

- Changing public CLI behavior (the `-c` flag stays as a no-op documented signal).
- Adding new features, dependencies, or subcommands.
- Modifying the license, package metadata, or npm scope.

## Decisions

1. Use `pgrep -x` in the bash runtime.

   The Node.js `isProcessRunning()` already uses `pgrep -x`. The bash runtime used `pgrep -f`, which matches the full command line and is easier to spoof or misidentify. Exact-name matching is sufficient because `omniroute` and `opencode` are the binary names we care about.

2. Prepend `$HOME/.local/bin` to PATH.

   The previous line appended user-local directories after system paths, so a system-wide `node` or `opencode` could win over the user's nvm / pipx / local install. Prepending user-local directories matches how most Ubuntu developer workstations are configured and ensures the user's chosen toolchain is used. We keep the fallbacks (`/usr/local/bin`, `/usr/bin`, `/bin`) only as appended safety net, but they are redundant once `$PATH` already contains them; the important change is putting `$HOME/.local/bin` first.

3. Check and remove stale PID files before starting omniroute.

   The old sequence started omniroute first, then checked whether the PID file existed. A stale PID file from a previous crash would make the new start fail after the daemon was already launched. The new sequence checks the PID file before starting, validates any existing PID, removes stale files, and detects symlinks. This also closes the symlink window because we only write after confirming the path is not a symlink.

4. Atomically create the PID file under `umask 0077`.

   With `umask 0077` already set, a single `printf '%s\n' "$pid" > "$PID_FILE"` creates the file with mode `0600`. The old `touch` + `chmod` left a brief window where the file could be world-readable. Removing `touch` removes that window.

5. Remove `run()` and `getRuntimeDir()` from `lib.js`.

   Neither function is imported anywhere after the simplification. Keeping them creates maintenance burden and confuses readers about intended functionality. `commandExists()` is the only helper still used.

6. Remove the `continueSession` parameter from `resolveSessionMode()`.

   The function never read the parameter. The `-c` CLI flag remains parsed (and documented as a no-op that signals intent), but the internal resolver no longer accepts it. This makes the data flow explicit: session resolution depends only on the explicit session ID and the latest known session ID.

## Risks / Trade-offs

- `pgrep -x` requires the process name to match exactly. If `opencode` ever launches as `node opencode.js`, this check would report it as not running. However, the Node.js side already makes the same assumption, so behavior stays consistent. → Mitigation: document the behavior; revisit if the OpenCode binary ever changes its process name.
- Prepending user-local PATH can theoretically pick up a malicious binary in `$HOME/.local/bin`. This is standard on Ubuntu and preferable to running an unexpected system binary. → Mitigation: this is the user's own home directory; the tool does not run with elevated privileges.
- Removing the `continueSession` parameter changes the internal API; tests are updated in the same commit. → No external impact.

## Migration Plan

1. Update `omnicode-runtime.sh` PATH ordering.
2. Replace `pgrep -f` with `pgrep -x`.
3. Refactor PID-file check/write sequence.
4. Clean up whitespace in `omnicode-runtime.sh`.
5. Simplify `lib.js` to only export `commandExists()`.
6. Drop `continueSession` from `resolveSessionMode()` and update the call site.
7. Update `test/bin.test.js` for the new `resolveSessionMode()` signature.
8. Run the test suite.
9. Commit and push.

## Open Questions

- None.
