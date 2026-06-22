# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-06-22

### Housekeeping

- Audited and closed 3 open PRs (#1, #3, #4) from `google-labs-jules`.
- Cleaned up all non-main branches (4 PR branches deleted).

## [0.1.0] - 2026-06-21

### Changed

- **Cross-platform runtime**: Replaced `omnicode-runtime.sh` (bash) with `omnicode-runtime.js` (Node.js). OmniRoute lifecycle, parallel init, and OpenCode launch now use `child_process.spawn` with `detached: true` instead of bash `nohup`/`pgrep`/`kill`/`wait`.
- Platform-aware `commandExists()`: uses `where` on Windows, `which` on Unix.
- Platform-aware `isProcessRunning()`: uses `tasklist` on Windows, `pgrep -f` on Unix.
- Data directory resolved via `os.homedir()` for all platforms (`~/.local/share/omnicode`).
- Opencode DB path resolved via `os.homedir()` for all platforms (`~/.local/share/opencode/opencode.db`).
- Package description and keywords updated to reflect cross-platform support.

### Fixed

- Fixed process detection for Node.js-based tools: switched `pgrep -x` to `pgrep -f` so command-line scripts (which always appear as `node`) are found by their command line.

## [0.0.6] - 2026-06-21

### Security

- Added 128-character session ID length limit.
- Set PID directory permissions to `0o700`.
- Added process tree cleanup: negative PID on Unix, `taskkill /T` on Windows.

### Performance

- Exported shared `isProcessRunning()` from `lib.js`; deleted local copies in `omnicode.js` and `omnicode-runtime.js`.
- Parallelized OmniRoute startup with tool init using `Promise.all`.
- Replaced busy-wait cleanup polling with interval-based backoff (max 10 retries).

### Reliability

- Added 30-second timeout to tool initialization via `Promise.race`.
- Fixed `openSync` file descriptor leak on `spawn` failure.
- Windows process detection now checks `.cmd` and `.bat` extensions in addition to `.exe`.

## [0.0.5] - 2026-06-21

### Security

- Hardened process detection in `omnicode-runtime.sh` to use `pgrep -x` instead of `pgrep -f` for exact process-name matching.
- Fixed PATH precedence so `$HOME/.local/bin` is searched before system paths, ensuring the user's Node toolchain is used.
- Removed the PID-file race window: stale PID files are detected and removed before starting omniroute, symlinks are detected, and the PID file is written atomically under `umask 0077`.

### Changed

- Removed unused `run()` and `getRuntimeDir()` helpers from `src/installer/lib.js`.
- Removed the unused `continueSession` parameter from `resolveSessionMode()`; the `-c` CLI flag remains a documented no-op for backward compatibility.
- Cleaned up whitespace and indentation in `omnicode-runtime.sh`.

## [0.0.4] - 2026-06-21

### Security

- Replaced `execSync` string interpolation with `execFileSync` array form in `commandExists()`.
- Added session ID format validation (`/^[a-zA-Z0-9_-]+$/`) before passing IDs to the runtime.
- Replaced `pgrep -f` with `pgrep -x` in the Node.js `isProcessRunning()` helper.
- Added PID file protection and restrictive `umask 0077` for log file creation.

### Performance

- Replaced Python SQLite subprocess with native `node:sqlite`.
- Made `getLatestSessionId()` lazy so the database is only queried when needed.

### Changed

- Simplified `omnicode` to a thin wrapper with no dependency management.
- Renamed `docs/` to `references/` and removed unused `archives/` and `scripts/`.
- License changed from MIT to Apache 2.0.
- Scoped package name: `@meyverick/omnicode`.

## [0.0.1] - 2026-06-20

### Added

- Initial `omnicode` CLI wrapper for launching OpenCode through OmniRoute on Ubuntu.
- Optional GrayMatter and OpenSpec initialization.
- Background OmniRoute lifecycle with cleanup on exit.
