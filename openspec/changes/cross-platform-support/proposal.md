## Why

`omnicode` currently only works on Ubuntu/Linux because it delegates its entire runtime lifecycle to a bash script (`omnicode-runtime.sh`) using `pgrep`, `nohup`, `kill`/`wait`, `umask`, and XDG-style paths. Users on macOS and Windows cannot use the package without installing bash and Unix tooling. Rewriting the runtime in Node.js eliminates the bash dependency and makes omnicode a truly cross-platform npm package.

## What Changes

- **BREAKING**: Delete `src/bin/omnicode-runtime.sh` and replace it with a Node.js runtime module (`src/bin/omnicode-runtime.js`).
- Replace `commandExists()` in `src/installer/lib.js` with a platform-aware implementation (`which` on Unix, `where` on Windows).
- Replace `isProcessRunning()` in `src/bin/omnicode.js` with a platform-aware implementation (`pgrep -x` on Unix, `tasklist` on Windows).
- Move OmniRoute lifecycle management (start, poll, stop, clean up) into Node.js using `child_process.spawn` with `detached: true` and `process.kill(pid, 0)` for liveness checks.
- Move GrayMatter/OpenSpec initialization into Node.js using `Promise.all` for parallel execution.
- Resolve data directories, log files, PID files, and the OpenCode DB path using OS-appropriate conventions:
  - Linux: `~/.local/share/omnicode`
  - macOS: `~/.local/share/omnicode`
  - Windows: `%USERPROFILE%/.local/share/omnicode`
- Update `main()` to call the Node.js runtime directly instead of spawning `bash`.
- Update `package.json` description and keywords to reflect cross-platform support.
- Update `wiki/` and README to reflect supported platforms.

## Capabilities

### New Capabilities

- `cross-platform-runtime`: A Node.js runtime module that manages the OmniRoute lifecycle, parallel init, and OpenCode launch without bash. Works on Linux, macOS, and Windows.
- `platform-aware-paths`: Resolves data directories, log/pid file paths, and the OpenCode database path using a unified `~/.local/share/` convention across Linux, macOS, and Windows.

### Modified Capabilities

- `process-cleanup-hardening`: Graceful OmniRoute termination and PID-reuse mitigation move from bash `kill`/`wait`/`is_pid_alive` to Node.js `process.kill()` and liveness polling. Requirements remain the same (wait for exit, verify PID before kill) but the mechanism changes.
- `startup-latency-optimization`: Parallel GrayMatter/OpenSpec init changes from bash `&`/`wait` to Node.js `Promise.all`. The requirement ("SHALL initialize concurrently") stays the same but the `&`/`wait` mechanism is replaced.
- `test-coverage-gaps`: The "bash runtime functions" tests are replaced with Node.js runtime function tests. The `commandExists` and `isProcessRunning` test scenarios are updated for cross-platform behavior.

## Impact

- `src/bin/omnicode-runtime.sh`: **DELETED** — replaced by `src/bin/omnicode-runtime.js`.
- `src/bin/omnicode-runtime.js`: **NEW** — Node.js runtime module (OmniRoute lifecycle, init, launch).
- `src/bin/omnicode.js`: Modified — `main()` calls Node runtime directly, `isProcessRunning()` goes cross-platform, `getLatestSessionId()` gets platform-aware DB path, `buildRuntimeArgs()` refactored.
- `src/installer/lib.js`: Modified — `commandExists()` uses `where` on Windows, `which` on Unix.
- `package.json`: Modified — description and keywords updated.
- `test/`: Modified — tests updated for cross-platform runtime.
- `wiki/`: Modified — platform support and path documentation updated.