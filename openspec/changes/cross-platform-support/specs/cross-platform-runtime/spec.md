## ADDED Requirements

### Requirement: Node.js runtime module replaces bash script

The system SHALL provide a Node.js runtime module (`omnicode-runtime.js`) that manages the OmniRoute lifecycle, parallel tool initialization, and OpenCode launch without relying on bash or any Unix-only utilities.

#### Scenario: Runtime works on Linux

- **WHEN** `omnicode` is run on Linux
- **THEN** the runtime module SHALL spawn OmniRoute as a detached background process and launch OpenCode

#### Scenario: Runtime works on macOS

- **WHEN** `omnicode` is run on macOS
- **THEN** the runtime module SHALL spawn OmniRoute as a detached background process and launch OpenCode

#### Scenario: Runtime works on Windows

- **WHEN** `omnicode` is run on Windows
- **THEN** the runtime module SHALL spawn OmniRoute as a detached background process and launch OpenCode without requiring bash

### Requirement: OmniRoute lifecycle management

The runtime module SHALL start OmniRoute in the background with `--no-open`, wait for it to become ready, and stop it during cleanup when no OpenCode process remains.

#### Scenario: Start OmniRoute if not running

- **WHEN** OmniRoute is not already running
- **THEN** the runtime SHALL spawn `omniroute --no-open` as a detached process with stdout/stderr redirected to a log file

#### Scenario: Reuse running OmniRoute

- **WHEN** OmniRoute is already running
- **THEN** the runtime SHALL skip starting a new instance and proceed to launch OpenCode

#### Scenario: Stop OmniRoute on cleanup

- **WHEN** OpenCode exits and no other OpenCode process remains
- **THEN** the runtime SHALL send SIGTERM to the OmniRoute process it started and remove the PID file

### Requirement: Parallel tool initialization

The runtime module SHALL initialize GrayMatter and OpenSpec concurrently using `Promise.all` if both tools are installed.

#### Scenario: Both tools installed

- **WHEN** both `graymatter` and `openspec` are installed
- **THEN** the runtime SHALL run both init commands concurrently and wait for both to complete before starting OmniRoute

#### Scenario: One tool missing

- **WHEN** only one tool is installed
- **THEN** the runtime SHALL run the available tool's init and skip the missing one with a log message

### Requirement: CLI entrypoint calls runtime directly

The `main()` function in `omnicode.js` SHALL call the Node.js runtime module directly instead of spawning a bash subprocess.

#### Scenario: No bash subprocess

- **WHEN** `omnicode` launches
- **THEN** the system SHALL NOT spawn `bash` as an intermediary process