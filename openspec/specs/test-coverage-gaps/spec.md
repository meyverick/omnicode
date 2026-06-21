# test-coverage-gaps

## Purpose

Covers test gaps for standalone unit tests of core utility functions, eliminating external tool dependencies.

## Requirements

### Requirement: Standalone unit tests for `getVersion()`

The test suite SHALL include unit tests for `getVersion()` that do not require external tools (opencode, omniroute) on PATH.

#### Scenario: getVersion returns the current version string

- **WHEN** a test calls `getVersion()`
- **THEN** it SHALL return the version string from `package.json`
- **THEN** no external commands SHALL be spawned

### Requirement: Standalone unit tests for `isProcessRunning()`

The test suite SHALL include unit tests for `isProcessRunning()` that do not spawn external processes.

#### Scenario: isProcessRunning returns true for a known-running process

- **WHEN** the test environment has `bash` running
- **THEN** `isProcessRunning("bash")` SHALL return `true`

#### Scenario: isProcessRunning returns false for a stopped process

- **WHEN** no process named `"nonexistent-xyz-999"` is running
- **THEN** `isProcessRunning("nonexistent-xyz-999")` SHALL return `false`

### Requirement: Standalone unit tests for `getLatestSessionId()`

The test suite SHALL include a unit test for `getLatestSessionId()` that validates behavior when the OpenCode database does not exist.

#### Scenario: getLatestSessionId returns null when no DB exists

- **WHEN** `~/.local/share/opencode/opencode.db` does not exist
- **THEN** `getLatestSessionId()` SHALL return `null`

### Requirement: Standalone unit tests for `commandExists()`

The test suite SHALL include unit tests for `commandExists()` that verify detection of an available command using only `which`.

#### Scenario: commandExists detects bash

- **WHEN** `commandExists("bash")` is called
- **THEN** it SHALL return `true`

### Requirement: Standalone unit tests for bash runtime functions

The test suite SHALL include unit tests that validate bash runtime behavior without executing the script.

#### Scenario: is_pid_alive validates PID existence check

- **WHEN** the runtime script defines `is_pid_alive`
- **THEN** the function SHALL accept a PID and use `kill -0` to check if the process is alive
