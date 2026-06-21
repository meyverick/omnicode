## MODIFIED Requirements

### Requirement: Graceful OmniRoute termination

The runtime SHALL wait for the omniroute process to exit after sending a termination signal during cleanup.

#### Scenario: Cleanup waits for process exit

- **WHEN** the runtime sends SIGTERM to the omniroute process via `process.kill(pid, 'SIGTERM')`
- **THEN** the runtime SHALL poll `process.kill(pid, 0)` until the process exits or a timeout is reached before removing the PID file

### Requirement: Empty session ID rejection

The argument parser SHALL reject an empty session ID from both `-s ""` and `-s` (without value) with a non-zero exit code and an error message.

#### Scenario: Reject empty -s value

- **WHEN** the user passes `-s ""`
- **THEN** omnicode SHALL exit with code 2 and print an error message

### Requirement: PID-reuse mitigation in cleanup

The cleanup logic SHALL verify that the PID read from the PID file corresponds to a running process before sending a termination signal.

#### Scenario: Verify PID is alive before kill

- **WHEN** the runtime reads a PID from the PID file
- **THEN** it SHALL check `process.kill(pid, 0)` succeeds before sending SIGTERM