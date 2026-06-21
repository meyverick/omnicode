## Why

Two previous security/performance audits (v0.0.4 and v0.0.5) addressed critical issues like shell injection, PID races, and Python SQLite overhead. A third pass reveals remaining hardening gaps and performance regressions that appeared after code simplification. Most findings are low-severity on their own, but together they affect startup latency, testability, and edge-case security in process cleanup.

## What Changes

- Document remaining security edge cases: kill-without-wait (zombie risk), empty-session-ID parsing, PID-reuse window in cleanup.
- Document performance improvements: hoist dynamic `node:sqlite` import, cache version and cwd resolution, parallelize GrayMatter/OpenSpec init.
- Add standalone unit tests that do not require `opencode`/`omniroute` on PATH, improving CI/testability.
- All changes are audit-only — no source edits. Findings are recorded for future implementation.

## Capabilities

### New Capabilities

- `process-cleanup-hardening`: Graceful OmniRoute termination (timeout, wait, zombie prevention) and PID-reuse mitigation.
- `startup-latency-optimization`: Cache version string, cwd resolution, and module imports to reduce synchronous overhead on every invocation.
- `test-coverage-gaps`: Add unit tests for `getLatestSessionId()`, `getVersion()`, `isProcessRunning()`, `commandExists()`, and bash runtime functions without external tool dependencies.

### Modified Capabilities

- (None — implementation details only, no spec-level requirement changes.)

## Impact

- `src/bin/omnicode.js`: Cache priming, hoisted imports, optional async parallel init.
- `src/bin/omnicode-runtime.sh`: Parallelized init, kill-with-wait cleanup.
- `src/installer/lib.js`: No changes expected.
- `test/*.test.js`: New test files for standalone unit coverage.
