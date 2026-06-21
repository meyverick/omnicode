## Why

Three prior audit rounds addressed critical vulnerabilities and quality issues. This fourth round targets remaining performance overhead, reliability edge cases, and security hardening found in the cross-platform runtime rewrite. Each finding is low-severity on its own but compounds with the others over time.

## What Changes

- Document performance findings: duplicated `isProcessRunning()` in two files, sequential init that blocks OmniRoute startup, tight polling loop without backoff.
- Document reliability findings: no timeout on tool init (can hang indefinitely), `openSync` file descriptor leak on `spawn` failure, PID-name mismatch risk on recycled PIDs, `.exe` naming assumption on Windows.
- Document security findings: no session ID length limit, PID file directory permissions unchecked, no descendant process cleanup on Unix.
- All findings are implemented as code changes to the affected source and test files.

## Capabilities

### New Capabilities

- `performance-hardening`: Eliminate code duplication, parallelize init with OmniRoute, add polling backoff.
- `reliability-hardening`: Add tool init timeouts, fix `openSync` leak, handle PID-name mismatch, support `.exe`/`.cmd`/`.bat` on Windows.
- `security-hardening`: Add session ID length limit, harden PID file directory permissions, implement process tree cleanup on Unix.

### Modified Capabilities

- (None — all findings are additive, no existing capability requirements change.)

## Impact

- `src/bin/omnicode-runtime.js`: Timeouts, polling backoff, fd leak fix, process tree cleanup, Windows extension support.
- `src/bin/omnicode.js`: Session ID length limit, deduplicate `isProcessRunning()` (export from shared module).
- `src/installer/lib.js`: Export `isProcessRunning()` and `isPidAlive()` from a single shared location.
- `test/*.test.js`: Updated for shared `isProcessRunning()`, timeouts, and new edge cases.