## Context

The omnicode codebase has three source files. The CLI entrypoint (`omnicode.js`) delegates the entire process lifecycle to a bash script (`omnicode-runtime.sh`) that uses `pgrep`, `nohup`, `kill`/`wait`, `umask`, `command -v`, and `~/.local/share`-style paths. The helper module (`lib.js`) uses `which` for command detection. None of these work on native Windows.

The package is published as an npm global (`@meyverick/omnicode`). Users install it with `npm install -g @meyverick/omnicode` and run `omnicode`. Since Node.js runs on all target platforms, rewriting the bash-dependent logic in Node.js makes the package truly cross-platform without requiring bash on Windows.

## Goals / Non-Goals

**Goals:**

- Replace `omnicode-runtime.sh` with a Node.js module that works on Linux, macOS, and Windows.
- Make `commandExists()` and `isProcessRunning()` platform-aware.
- Resolve data/log/PID/DB paths using OS conventions.
- Keep the public CLI interface unchanged (`-s`, `-c`, `--status`, `--version`).
- Keep tests passing (41 tests) and add cross-platform test coverage.

**Non-Goals:**

- Adding new CLI flags or changing the public interface.
- Adding npm dependencies (zero new deps).
- Renaming the `src/installer/` directory (cosmetic, out of scope).
- Supporting shells other than the system default (the runtime is Node.js now, so shells are irrelevant).
- Auto-installing `opencode`/`omniroute` on any platform.

## Decisions

1. **Rewrite the runtime in Node.js (not maintain platform-specific scripts)**

   The bash script could be replicated as PowerShell for Windows, but that doubles the maintenance surface and every future feature must be written twice. Rewriting once in Node.js eliminates the bash dependency permanently. The runtime logic is small (~130 lines of bash) and maps cleanly to `child_process.spawn` + `process.kill`. Alternative considered: require Git Bash on Windows. Friction for end users and not truly native.

2. **Platform-aware `commandExists()`**

   Use `process.platform === "win32"` to select between `where` (Windows) and `which` (Unix). Both are system-provided and require no additional dependencies. Alternative considered: scan `process.env.PATH` directories with `fs.existsSync`. More code, less reliable on Windows (extension resolution: `.exe`, `.cmd`, `.bat`), and `which`/`where` already handle edge cases.

3. **Platform-aware `isProcessRunning()`**

   Use `pgrep -x <name>` on Unix and `tasklist /FI "IMAGENAME eq <name>.exe" /NH` on Windows. Both are system-provided. For our own managed processes (omniroute), prefer the PID file + `process.kill(pid, 0)` liveness check, which is cross-platform in Node.js. Alternative considered: `ps-list` npm package. Adds a dependency.

4. **Background process with `spawn({ detached: true })` + `unref()` (replacing `nohup`)**

   `child_process.spawn(cmd, args, { detached: true, stdio: 'pipe' })` creates a process in a new session on Unix (equivalent to `nohup`) or a new console group on Windows. Piping stdout/stderr to a log file replaces `>>"$LOG_FILE" 2>&1`. `child.unref()` allows the parent to exit independently. The child PID is captured for the PID file.

5. **`process.kill(pid, 0)` for liveness (replacing `kill -0` and `wait`)**

   `process.kill(pid, 0)` is a no-op signal that throws if the process doesn't exist. It works on both Unix and Windows in Node.js. For cleanup, after `process.kill(pid, 'SIGTERM')`, poll `process.kill(pid, 0)` with a short delay loop until the process exits or a timeout is reached. This replaces bash `wait "$pid"`. Alternative considered: `child.on('close', ...)` event. Works only if we hold a reference to the `ChildProcess` object; the PID file approach is more resilient across omnicode invocations.

6. **Platform-aware data directory**

   | Platform | Path |
   |---|---|
   | Linux | `~/.local/share/omnicode` |
   | macOS | `~/.local/share/omnicode` (same as Linux, confirmed by user) |
   | Windows | `%USERPROFILE%/.local/share/omnicode` |

   All platforms use `~/.local/share/omnicode` (`os.homedir()/.local/share/omnicode`). This matches OpenCode's own convention of storing data under `~/.local/share/opencode/`. Alternative considered: `env-paths` npm package or `%APPDATA%` on Windows. User explicitly requested `~/.local/share` style on all platforms for consistency.

7. **Platform-aware OpenCode DB path**

   The DB path depends on where OpenCode stores its database. Since we don't control that, try known locations in order:
   - Linux: `~/.local/share/opencode/opencode.db`
   - macOS: `~/.local/share/opencode/opencode.db` (unconfirmed — same as Linux for now)
   - Windows: `%USERPROFILE%/.local/share/opencode/opencode.db`

   OpenCode uses `~/.local/share/opencode/` across all platforms (confirmed for Linux and Windows by user; macOS assumed same). If OpenCode changes its storage location in the future, we add another candidate path.

8. **Parallel init with `Promise.all` (replacing `&`/`wait`)**

   `Promise.all([initGraymatter(), initOpenspec()])` runs both concurrently. Each function spawns the tool, pipes output to a log file, and resolves on close. This preserves the parallel-init optimization from the previous audit while being cross-platform.

9. **Runtime module structure**

   `src/bin/omnicode-runtime.js` exports a single async `runRuntime(mode)` function. Internally it handles: parallel init → start omniroute → launch opencode → cleanup on exit (via `process.on('exit')`). Path helpers (`getDataDir`, `getOpencodeDbPath`) are added to `src/installer/lib.js` alongside `commandExists`. Alternative considered: separate `src/lib/paths.js` module. Over-engineered for 3 helper functions.

## Risks / Trade-offs

- **Windows process naming**: Windows processes may include `.exe` extension. `tasklist` filter uses `IMAGENAME eq opencode.exe`. If OpenCode ships as `opencode.cmd` or `opencode.bat`, the filter won't match. → Mitigation: check multiple extensions (`.exe`, `.cmd`, `.bat`).
- **Signal behavior on Windows**: `process.kill(pid, 'SIGTERM')` on Windows calls `TerminateProcess`, which is a hard kill (no graceful shutdown). OmniRoute may not flush buffers. → Mitigation: acceptable for a local dev tool; OmniRoute is stateless.
- **`node:sqlite` stability**: Already experimental on Node 22. If removed in a future Node version, the try/catch falls back to `null` and session resume silently returns `null`. → Mitigation: documented behavior; `engines` field constrains to Node >=22.
- **Path assumptions for OpenCode DB**: We assume OpenCode follows platform conventions. If it stores the DB elsewhere, session resume breaks silently. → Mitigation: try multiple candidate paths; fall back to `null` (new session).
- **PID file across reboots**: Stale PID files from a previous boot could reference a recycled PID. → Mitigation: `is_pid_alive` check before kill, already implemented.

## Migration Plan

1. Create `src/bin/omnicode-runtime.js` with all runtime logic (init, omniroute lifecycle, opencode launch, cleanup).
2. Add platform-aware path helpers to `src/installer/lib.js`.
3. Update `commandExists()` and `isProcessRunning()` for cross-platform.
4. Update `getLatestSessionId()` to use platform-aware DB path.
5. Update `main()` in `omnicode.js` to call `runRuntime()` directly instead of spawning bash.
6. Delete `src/bin/omnicode-runtime.sh`.
7. Update `package.json` description and keywords.
8. Update tests to reflect cross-platform runtime.
9. Update `wiki/` and README for platform support.
10. Run tests and `npm pack --dry-run` to verify.

## Open Questions

- macOS OpenCode DB path is unconfirmed but assumed to match Linux (`~/.local/share/opencode/opencode.db`). If macOS uses a different path, add a candidate during implementation.