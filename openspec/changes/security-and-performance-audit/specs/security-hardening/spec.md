## ADDED Requirements

### Requirement: Shell injection prevention
The system SHALL NOT pass user-controlled or interpolated strings to `execSync`. All subprocess calls SHALL use `execFileSync` with array arguments.

#### Scenario: commandExists called with safe name
- **WHEN** `commandExists("opencode")` is called
- **THEN** it invokes `execFileSync("command", ["-v", "opencode"])` without shell interpretation.

#### Scenario: commandExists called with injection attempt
- **WHEN** `commandExists("foo; rm -rf /")` is called
- **THEN** it treats the entire string as a single argument and does not execute injected commands.

### Requirement: Session ID validation
The system SHALL reject session IDs that do not match the pattern `/^[a-zA-Z0-9_-]+$/`.

#### Scenario: Valid session ID provided
- **WHEN** the user runs `omnicode -s ses_abc123`
- **THEN** the session ID is accepted and passed to the runtime.

#### Scenario: Invalid session ID provided
- **WHEN** the user runs `omnicode -s "foo; rm -rf /"`
- **THEN** the system prints an error and exits with code 2.

### Requirement: Exact process matching
The system SHALL use exact process name matching for `pgrep` instead of regex command-line matching.

#### Scenario: Checking process status
- **WHEN** `isProcessRunning("opencode")` is called
- **THEN** it invokes `pgrep -x opencode` for exact name matching.

### Requirement: PID file protection
The system SHALL check for symlinks and set explicit permissions before writing the PID file.

#### Scenario: PID file creation
- **WHEN** OmniRoute starts successfully
- **THEN** the PID file is created with mode 0600 and only if the path is not a symlink.

### Requirement: Restrictive log permissions
The system SHALL create log files with restrictive permissions.

#### Scenario: Log file creation
- **WHEN** `omnicode` creates log files
- **THEN** they are created with umask 0077 (owner read/write only).
