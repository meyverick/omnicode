## 1. Process cleanup hardening

- [x] 1.1 Add `wait "$pid"` after `kill` in `stop_omniroute_if_idle` to reap the process
- [x] 1.2 Validate empty session ID rejection in `parseArgs` (both `-s ""` and `-s` without value)
- [x] 1.3 Verify PID-reuse mitigation: `is_pid_alive` check before `kill` in cleanup

## 2. Startup latency optimization

- [x] 2.1 Hoist `const { DatabaseSync }` dynamic import to module scope in `omnicode.js`
- [x] 2.2 Add module-level cache variable for `getVersion()` result
- [x] 2.3 Parallelize GrayMatter and OpenSpec init in `omnicode-runtime.sh` using `&` and `wait`

## 3. Test coverage gaps

- [x] 3.1 Add unit test for `getVersion()` in `test/bin.test.js`
- [x] 3.2 Add unit tests for `isProcessRunning()` in `test/bin.test.js`
- [x] 3.3 Add unit test for `getLatestSessionId()` (null DB path) in `test/bin.test.js`
- [x] 3.4 Add unit test for `commandExists()` in `test/lib.test.js` (already exists — verify coverage)
