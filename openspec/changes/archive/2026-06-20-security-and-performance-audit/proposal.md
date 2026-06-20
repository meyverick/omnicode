## Why

A security and performance audit of the omnicode codebase revealed several issues that should be addressed before the package gains wider adoption. The most critical finding is shell injection via `execSync` string interpolation in `commandExists()`, and a high-severity issue where user-provided session IDs pass through without validation. On the performance side, a Python subprocess is spawned on every startup to query the SQLite database, and it runs even when the user already provided a session ID via `-s`.

## What Changes

- **BREAKING**: None. All changes are internal hardening and optimization.
- Replace `execSync` string interpolation with `execFileSync` array form in `commandExists()`.
- Validate session ID format at parse time (`/^[a-zA-Z0-9_-]+$/`).
- Replace `pgrep -f` regex matching with exact-match `pgrep -x` in `isProcessRunning()`.
- Use lazy evaluation for `getLatestSessionId()` so the database query only runs when needed.
- Replace Python SQLite subprocess with Node.js native `node:sqlite` (available in Node 22+).
- Add symlink checks and explicit permissions for the PID file in the bash runtime.
- Set restrictive umask for log file creation.

## Capabilities

### New Capabilities

- `security-hardening`: Covers shell injection fix, session ID validation, PID file protection, umask hardening, and pgrep exact matching.
- `performance-improvements`: Covers lazy session lookup, native SQLite, and optimized command checks.

### Modified Capabilities

- None.

## Impact

- `src/installer/lib.js`: `commandExists()` rewritten to use `execFileSync`.
- `src/bin/omnicode.js`: Session ID validation, lazy `getLatestSessionId()`, native SQLite, optimized `isProcessRunning()`.
- `src/bin/omnicode-runtime.sh`: PID file symlink check, umask for log files.
- `test/`: Updated tests for new validation and SQLite behavior.
