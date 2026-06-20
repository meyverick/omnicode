## 1. Security hardening in bash runtime

- [x] 1.1 Replace `pgrep -f "omniroute"` with `pgrep -x omniroute` in `is_omniroute_running()`.
- [x] 1.2 Replace `pgrep -f "opencode"` with `pgrep -x opencode` in `is_opencode_running()`.
- [x] 1.3 Prepend `$HOME/.local/bin` to PATH so user-local binaries take precedence.
- [x] 1.4 Move stale PID-file detection before starting omniroute.
- [x] 1.5 Detect symlink attacks on the PID file path (`-L` test).
- [x] 1.6 Atomically write the PID file under `umask 0077`; remove `touch` + `chmod` race.

## 2. Code quality cleanup

- [x] 2.1 Remove leading spaces and extraneous blank lines in `omnicode-runtime.sh`.
- [x] 2.2 Remove unused `run()` and `getRuntimeDir()` helpers from `src/installer/lib.js`.
- [x] 2.3 Remove unused imports from `src/installer/lib.js`.
- [x] 2.4 Remove unused `continueSession` parameter from `resolveSessionMode()` in `src/bin/omnicode.js`.
- [x] 2.5 Update the call site in `src/bin/omnicode.js` main().

## 3. Tests

- [x] 3.1 Update `test/bin.test.js` `resolveSessionMode()` assertions to the new two-argument signature.
- [x] 3.2 Run the test suite and fix any failures.
- [x] 3.3 Run `bash -n` on the runtime script to verify syntax.

## 4. Documentation

- [x] 4.1 Update `wiki/How-it-works.md` if the `-c` internal description needs clarification (no change needed — wiki already accurate).

## 5. Final verification

- [x] 5.1 Run `npm pack --dry-run` to confirm package contents.
- [x] 5.2 Commit the change and push to origin.
