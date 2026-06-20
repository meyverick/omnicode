## 1. Security fixes

- [x] 1.1 Replace `execSync` with `execFileSync` array form in `commandExists()`.
- [x] 1.2 Add session ID validation (`/^[a-zA-Z0-9_-]+$/`) in `parseArgs()`.
- [x] 1.3 Replace `pgrep -f` with `pgrep -x` in `isProcessRunning()`.
- [x] 1.4 Add symlink check and explicit permissions for PID file in `omnicode-runtime.sh`.
- [x] 1.5 Set `umask 0077` before creating log files in `omnicode-runtime.sh`.

## 2. Performance improvements

- [x] 2.1 Replace Python SQLite subprocess with `node:sqlite` native binding.
- [x] 2.2 Move `getLatestSessionId()` to lazy evaluation (only call when needed).
- [x] 2.3 Optimize `getRuntimeDir()` to avoid redundant `mkdirSync` when bash already creates it.
- [x] 2.4 Update `package.json` engines field to `>=26.0.0`.

## 3. Tests

- [x] 3.1 Update `test/bin.test.js` for session ID validation.
- [x] 3.2 Add tests for `getLatestSessionId()` with native SQLite.
- [x] 3.3 Run the test suite and fix any failures.

## 4. Documentation

- [x] 4.1 Update `wiki/Troubleshooting.md` with any new error messages.
- [x] 4.2 Update `wiki/Configuration.md` if paths or permissions changed.

## 5. Final verification

- [x] 5.1 Run `npm pack --dry-run` to confirm package contents.
- [x] 5.2 Commit the change and push to origin.
