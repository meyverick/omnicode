## 1. Platform-aware helpers

- [x] 1.1 Add `getDataDir()` to `src/installer/lib.js` (all platforms: `~/.local/share/omnicode` via `os.homedir()`)
- [x] 1.2 Add `getOpencodeDbPath()` to `src/installer/lib.js` (all platforms: `~/.local/share/opencode/opencode.db`, return null if not found)
- [x] 1.3 Update `commandExists()` in `src/installer/lib.js` to use `where` on Windows, `which` on Unix
- [x] 1.4 Update `isProcessRunning()` in `src/bin/omnicode.js` to use `tasklist` on Windows, `pgrep -x` on Unix
- [x] 1.5 Update `getLatestSessionId()` to use `getOpencodeDbPath()` instead of hardcoded XDG path

## 2. Node.js runtime module

- [x] 2.1 Create `src/bin/omnicode-runtime.js` with `runRuntime(mode)` export
- [x] 2.2 Implement parallel GrayMatter/OpenSpec init using `Promise.all` with log file redirection
- [x] 2.3 Implement OmniRoute lifecycle: start as detached `spawn` with `--no-open`, capture PID, write PID file
- [x] 2.4 Implement OmniRoute readiness polling (check `process.kill(pid, 0)` + `isProcessRunning("omniroute")` with timeout)
- [x] 2.5 Implement cleanup: stop omniroute if idle, send SIGTERM via `process.kill(pid, 'SIGTERM')`, poll for exit, remove PID file
- [x] 2.6 Register cleanup on `process.on('exit')` and `process.on('SIGINT'/'SIGTERM')`

## 3. CLI entrypoint integration

- [x] 3.1 Replace `buildRuntimeArgs()` and `spawn("bash", ...)` in `main()` with direct `await runRuntime(mode)` call
- [x] 3.2 Delete `src/bin/omnicode-runtime.sh`
- [x] 3.3 Remove `runtimeScript` constant and bash-related imports from `omnicode.js`

## 4. Package metadata

- [x] 4.1 Update `package.json` description from "Ubuntu" to cross-platform wording
- [x] 4.2 Update keywords to include "cross-platform", "windows", "macos"

## 5. Tests

- [x] 5.1 Update `test/runtime.test.js` — replace bash script assertions with Node.js runtime module assertions
- [x] 5.2 Update `test/bin.test.js` — make `isProcessRunning` and `commandExists` tests platform-aware
- [x] 5.3 Add test for `getDataDir()` platform-aware path resolution
- [x] 5.4 Add test for `getOpencodeDbPath()` returns null when no DB exists
- [x] 5.5 Run the test suite and fix any failures

## 6. Documentation

- [x] 6.1 Update `README.md` — replace "Ubuntu" language with cross-platform support
- [x] 6.2 Update `wiki/Getting-Started.md` — add macOS and Windows install instructions
- [x] 6.3 Update `wiki/How-it-works.md` — describe Node.js runtime instead of bash runtime
- [x] 6.4 Update `wiki/Configuration.md` — document platform-specific paths

## 7. Final verification

- [x] 7.1 Run `npm pack --dry-run` to confirm package contents (no .sh file)
- [x] 7.2 Run `bash -n` replacement-free — verify no bash syntax errors (N/A, no bash)
- [x] 7.3 Commit and push