## Why

A follow-up security and quality audit of the omnicode codebase found that several hardening items from the first audit were only partially applied, and a few new dead-code / quality issues appeared after the recent simplification work. The bash runtime still uses broad `pgrep -f` matching and a racy PID-file sequence, while the Node.js side still carries an unused `continueSession` parameter and helper functions that are no longer imported anywhere.

## What Changes

- **BREAKING**: None for end users. One internal function signature (`resolveSessionMode`) drops an unused parameter; tests are updated accordingly.
- Harden `omnicode-runtime.sh` process detection by using `pgrep -x` instead of `pgrep -f`.
- Fix PATH precedence so user-local directories (`$HOME/.local/bin`) are searched before system paths, ensuring OmniRoute runs under the user's Node toolchain.
- Eliminate the PID-file race window: check for stale PID files before starting omniroute, detect symlink attacks, and create the file atomically under `umask 0077`.
- Remove dead code from `src/installer/lib.js` (`run()` and `getRuntimeDir()`) and their now-unused imports.
- Remove the unused `continueSession` parameter from `resolveSessionMode()` in `src/bin/omnicode.js`; keep the `-c` CLI flag as a documented no-op for backward compatibility.
- Clean up whitespace / indentation inconsistencies in `omnicode-runtime.sh`.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `security-hardening`: `pgrep -x`, PATH precedence, atomic PID-file creation, symlink detection.
- `code-quality`: dead-code removal, consistent formatting, clearer internal API.

## Impact

- `src/bin/omnicode-runtime.sh`: process detection, PATH ordering, PID-file logic, and formatting.
- `src/bin/omnicode.js`: `resolveSessionMode()` signature simplified.
- `src/installer/lib.js`: only `commandExists()` remains.
- `test/bin.test.js`: `resolveSessionMode()` calls updated to the new two-argument signature.
