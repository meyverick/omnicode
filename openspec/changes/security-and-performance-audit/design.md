## Context

The omnicode codebase has three main source files totaling ~340 lines. A security audit found one critical vulnerability (shell injection via `execSync`), one high-severity issue (unvalidated user input), and several medium/low findings. A performance audit found that a Python subprocess is spawned on every startup to query SQLite, even when the result is not needed.

## Goals / Non-Goals

**Goals:**

- Fix the critical shell injection vulnerability in `commandExists()`.
- Validate user-provided session IDs before passing them to the runtime.
- Replace Python SQLite subprocess with native Node.js SQLite.
- Only query the database when a session lookup is actually needed.
- Add PID file protection and restrictive umask for log files.

**Non-Goals:**

- Changing the public API or command-line interface.
- Adding new features or subcommands.
- Refactoring the bash runtime beyond security hardening.
- Changing the license or package metadata.

## Decisions

1. Use `execFileSync` array form instead of `execSync` string interpolation.

   `execFileSync("command", ["-v", command])` avoids shell interpretation entirely. No regex or escaping needed. Alternative considered: input validation regex. That adds maintenance burden and still relies on correct regex.

2. Validate session ID against `/^[a-zA-Z0-9_-]+$/`.

   OpenCode session IDs match `ses_[A-Za-z0-9]+`. A broader allowlist covers future formats without being overly restrictive. Alternative considered: reject anything that doesn't start with `ses_`. Too strict for forward compatibility.

3. Replace Python SQLite subprocess with `node:sqlite`.

   Node.js 26+ includes `node:sqlite` as a stable built-in module. This eliminates the Python dependency and removes a 50-200ms cold-start overhead. The `engines` field in `package.json` will be updated from `>=22.0.0` to `>=26.0.0`. Alternative considered: keep Python but cache results. Still slower and adds an external dependency.

4. Lazy-evaluate `getLatestSessionId()`.

   Currently the default parameter `latestSessionId = getLatestSessionId()` runs even when the user passes `-s`, making the result irrelevant. Moving the call inside the function body only when needed eliminates one subprocess per invocation. Alternative considered: remove default parameter entirely. That changes the function signature; lazy evaluation is cleaner.

5. Use `pgrep -x` for exact process name matching.

   `pgrep -f` matches against the full command line using regex, which is fragile and could match unintended processes. `pgrep -x` matches the exact process name. Alternative considered: escape regex in `pgrep -f`. More complex with no benefit when exact matching suffices.

## Risks / Trade-offs

- `node:sqlite` is experimental in Node.js 22. If it becomes unavailable in a future version, the fallback path should catch and log the error. → Mitigation: wrap in try/catch and fall back to a graceful "no session found" response.
- PID file symlink check adds a small race window between check and write. → Acceptable for a single-user CLI tool; not a multi-user service.
- Restrictive umask (0077) may surprise users who expect default permissions. → Mitigation: only apply to omnicode-created files, not the entire process.

## Migration Plan

1. Fix `commandExists()` to use `execFileSync`.
2. Add session ID validation in `parseArgs()`.
3. Replace Python SQLite with `node:sqlite`.
4. Move `getLatestSessionId()` call to lazy evaluation.
5. Update `isProcessRunning()` to use `pgrep -x`.
6. Add PID file protection in bash runtime.
7. Set umask for log file creation.
8. Update tests.
9. Commit and push.

## Open Questions

- None.
