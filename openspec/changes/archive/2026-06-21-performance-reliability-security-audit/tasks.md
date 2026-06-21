## 1. Performance hardening

- [x] 1.1 Export `isProcessRunning()` from `src/installer/lib.js`, import in both `omnicode.js` and `omnicode-runtime.js`, delete local copies
- [x] 1.2 Parallelize OmniRoute startup with tool init using `Promise.all` in `runRuntime()`
- [x] 1.3 Replace busy-wait polling in `stopOmnirouteIfIdle` with interval-based polling (max 10 retries)

## 2. Reliability hardening

- [x] 2.1 Add 30-second timeout to `initTool()` using `Promise.race`
- [x] 2.2 Fix `openSync` file descriptor leak: wrap `spawn` in try/catch, close fd on error
- [x] 2.3 Update Windows `isProcessRunning()` to check `.cmd` and `.bat` extensions in addition to `.exe`
- [x] 2.4 Add test for `initTool` timeout behavior
- [x] 2.5 Add test for Windows extension detection

## 3. Security hardening

- [x] 3.1 Add `(?=.{1,128}$)` length constraint to `SESSION_ID_RE` regex
- [x] 3.2 Add mode `0o700` to `mkdirSync(dataDir, ...)` call
- [x] 3.3 Implement process tree cleanup: use negative PID (process group signal) on Unix, `taskkill /T /PID` on Windows
- [x] 3.4 Add test for session ID length rejection
- [x] 3.5 Add test for process group cleanup (verify kill -TERM -$pid pattern)
