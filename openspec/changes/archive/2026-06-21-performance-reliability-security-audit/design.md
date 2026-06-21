## Context

After the cross-platform runtime rewrite, the codebase has 3 source files totaling ~290 lines and 3 test files totaling ~150 lines. A fresh audit found 10 issues spanning performance, reliability, and security.

## Goals / Non-Goals

**Goals:**

- Deduplicate `isProcessRunning()` across `omnicode.js` and `omnicode-runtime.js` by exporting it from a shared module.
- Parallelize OmniRoute startup with tool init instead of running sequentially.
- Add a timeout to tool initialization so `omnicode` doesn't hang if a tool hangs.
- Fix `openSync` file descriptor leak when `spawn` throws.
- Improve Windows process detection to handle `.cmd`/`.bat` extensions.
- Add polling backoff in process cleanup loops.
- Add session ID length limit (max 128 chars).
- Harden PID file directory permissions.
- Implement process tree cleanup on Unix for detached children.

**Non-Goals:**

- Adding new npm dependencies.
- Changing the public CLI interface.
- Changing `package.json` engines, license, or metadata.

## Decisions

1. **Export `isProcessRunning()` from `lib.js`**

   Both `omnicode.js` and `omnicode-runtime.js` define an identical `isProcessRunning()` function. Move it to `src/installer/lib.js` alongside `commandExists()`. Both files import from the same location. Alternative considered: keeping both copies. Duplicate maintenance burden.

2. **Parallelize all three: graymatter, openspec, and omniroute**

   Currently `initTools()` (GrayMatter + OpenSpec in parallel) runs sequentially before `startOmniroute()` + `waitForOmniroute()`. All three are independent and can run concurrently.

   The flow becomes:
   - `startOmniroute()` fires synchronously (spawn + write PID, returns PID)
   - `Promise.all([waitForOmniroute(pid), initTools()])` — both run concurrently, covering all three
   - opencode launches last, after both resolve

   This means graymatter init, openspec init, and omniroute startup/wait all run at the same time.

3. **Add timeout to `initTool()`**

   Wrap the `spawn` + `on("close")` pattern in a `Promise.race()` with a 30-second timeout. If the tool doesn't exit within 30 seconds, kill it and log a warning.

4. **Fix `openSync` file descriptor leak**

   Move `openSync(logPath, "w")` to after the `spawn` succeeds, or wrap in a try/catch that closes the fd on error.

5. **Windows process detection: check `.exe`, `.cmd`, `.bat`**

   On Windows, a tool command might be `opencode.cmd` or `opencode.bat` instead of `opencode.exe`. Update `tasklist` filter to check all three extensions, or use `Get-Process` which resolves the real image name.

6. **Polling backoff in cleanup**

   Replace the busy-wait 5-second loop in `stopOmnirouteIfIdle` with an exponential backoff (1, 2, 3 second intervals) or a simple interval with max 10 retries.

7. **Session ID length limit**

   Add `(?=.{1,128}$)` lookahead to `SESSION_ID_RE` to limit max 128 characters. OpenCode's `ses_` prefix is ~20 chars; 128 allows for future formats.

8. **PID file directory permissions**

   Call `mkdirSync(dataDir, { recursive: true, mode: 0o700 })` on Unix to ensure the directory is only accessible to the user. On Windows, `mkdirSync` with `recursive: true` and `mode` is accepted but ACLs differ — the mode is a best-effort hint.

9. **Process tree cleanup on Unix**

   On Unix, use `execFileSync("kill", ["-" + (process.platform === "darwin" ? "TERM" : "TERM"), String(-pid)])` to send SIGTERM to the entire process group (negative PID). This works because `spawn({detached: true})` creates a new session where the child PID equals the process group ID. On Windows, process group kill uses `taskkill /T /PID`.

## Risks / Trade-offs

- **Negative PID kill**: Sending SIGTERM to the process group also kills the parent if the group isn't properly isolated. → Mitigation: only used for `detached: true` processes which are session leaders.
- **30-second init timeout**: Legitimate slow init might be killed prematurely. → Mitigation: 30 seconds is generous for local dev tools; can be tuned.
- **`.exe`/`.cmd`/`.bat` check**: Checking multiple extensions increases false negatives if a process name doesn't match any. → Mitigation: also try the plain name without extension.

## Migration Plan

1. Export `isProcessRunning()` from `lib.js`, import in both files, delete local copies.
2. Parallelize init with OmniRoute startup.
3. Add timeout to `initTool()`.
4. Fix `openSync` leak.
5. Update Windows process detection for `.cmd`/`.bat`.
6. Add polling backoff.
7. Add session ID length limit.
8. Harden PID file directory permissions.
9. Implement process tree cleanup.
