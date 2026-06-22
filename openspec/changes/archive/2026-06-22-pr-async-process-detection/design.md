## Context

PR #2 adds `isProcessRunningAsync` to `lib.js` using `promisify(execFile)` and applies it to one call site in `waitForOmniroute`. Two other call sites in `startOmniroute` and `stopOmnirouteIfIdle` remain synchronous. No tests were added. The PR is mergeable but not yet merged.

## Goals / Non-Goals

**Goals:**

- Accept the core contribution of PR #2: `isProcessRunningAsync()` in `lib.js`.
- Apply the async version to all three call sites in `omnicode-runtime.js`.
- Add unit tests for the async function.
- Merge the revised PR into main.

**Non-Goals:**

- Removing the synchronous `isProcessRunning()` — it's still useful for `--status` and CLI commands that don't want to await.
- Adding new npm dependencies.
- Changing the public CLI interface.

## Decisions

1. **Keep both sync and async versions**

   `isProcessRunning()` stays for CLI commands (`--status`, `--version`, `--help`) that are synchronous by nature. `isProcessRunningAsync()` is used in the runtime module where async context is already available. Alternative considered: converting everything to async. Unnecessary for CLI commands that exit immediately.

2. **Apply async to all three runtime call sites**

   - `startOmniroute()`: checks `isProcessRunning("omniroute")` before starting. Convert to `await isProcessRunningAsync("omniroute")`.
   - `waitForOmniroute()`: already converted by PR #2. Keep as-is.
   - `stopOmnirouteIfIdle()`: checks `isProcessRunning("opencode")` before stopping. Convert to `await isProcessRunningAsync("opencode")`. Since this is called from a sync signal handler, wrap in an IIFE or make the handler async.

3. **Handle signal handler asynchrony**

   `process.on("SIGINT")` and `process.on("SIGTERM")` don't await promises. Wrap the cleanup call in an async IIFE:
   ```js
   process.on("SIGINT", () => { (async () => { await cleanup(); process.exit(0); })(); });
   ```
   This is safe because Node.js doesn't exit until the event loop is empty — the IIFE will run to completion before the process exits.

4. **Tests**

   Add tests for `isProcessRunningAsync` in `test/lib.test.js`:
   - Works for a known-running process (`bash` on Unix, `cmd` on Windows).
   - Returns false for a nonexistent process.
   - Returns correct type (boolean).

5. **Merge flow**

   - Fetch PR #2 branch locally.
   - Apply the additional changes (convert remaining call sites, add tests).
   - Merge into main.

## Risks / Trade-offs

- **Signal handler latency**: Making `stopOmnirouteIfIdle` async adds ~2ms latency to signal handling. Acceptable for a local dev tool.
- **Dual maintenance**: Two `isProcessRunning` variants increase surface area. Mitigated by the sync version being a thin wrapper that can eventually be removed once all call sites are async.

## Migration Plan

1. Fetch PR #2 branch.
2. Add `isProcessRunningAsync` import to `omnicode-runtime.js` (already done in PR).
3. Convert `startOmniroute` `isProcessRunning` call to async.
4. Convert `stopOmnirouteIfIdle` `isProcessRunning` call to async.
5. Update signal handlers to wrap cleanup in async IIFE.
6. Add tests for `isProcessRunningAsync` in `test/lib.test.js`.
7. Test locally.
8. Merge into main.
