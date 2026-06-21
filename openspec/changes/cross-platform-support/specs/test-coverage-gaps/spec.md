## MODIFIED Requirements

### Requirement: Standalone unit tests for `isProcessRunning()`

The test suite SHALL include unit tests for `isProcessRunning()` that do not spawn external processes beyond the platform-native command used for process detection.

#### Scenario: isProcessRunning returns true for a known-running process

- **WHEN** a system process named `bash` (Unix) or `cmd` (Windows) is running
- **THEN** `isProcessRunning("bash")` (Unix) or `isProcessRunning("cmd")` (Windows) SHALL return `true`

#### Scenario: isProcessRunning returns false for a stopped process

- **WHEN** no process named `"nonexistent-xyz-999"` is running
- **THEN** `isProcessRunning("nonexistent-xyz-999")` SHALL return `false`

### Requirement: Standalone unit tests for `commandExists()`

The test suite SHALL include unit tests for `commandExists()` that verify detection of an available command using the platform-native lookup tool (`which` on Unix, `where` on Windows).

#### Scenario: commandExists detects a known command

- **WHEN** `commandExists("bash")` (Unix) or `commandExists("cmd")` (Windows) is called
- **THEN** it SHALL return `true`

### Requirement: Standalone unit tests for runtime functions

The test suite SHALL include unit tests that validate the Node.js runtime module's behavior without executing an external shell script.

#### Scenario: Runtime module exports runRuntime

- **WHEN** the runtime module is imported
- **THEN** it SHALL export an async `runRuntime` function

#### Scenario: Platform-aware path resolution

- **WHEN** `getDataDir()` is called
- **THEN** it SHALL return a path appropriate for the current platform (XDG on Linux, Library on macOS, AppData on Windows)