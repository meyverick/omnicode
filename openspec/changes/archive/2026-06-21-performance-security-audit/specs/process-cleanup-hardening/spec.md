## ADDED Requirements

### Requirement: Graceful OmniRoute termination

The runtime SHALL wait for the omniroute process to exit after sending SIGTERM during cleanup.

#### Scenario: Cleanup waits for process exit

- **WHEN** `stop_omniroute_if_idle` sends `kill "$pid"`
- **THEN** the script SHALL `wait "$pid"` to reap the process before removing the PID file

### Requirement: Empty session ID rejection

The argument parser SHALL reject an empty session ID from both `-s ""` and `-s` (without value) with a non-zero exit code and an error message.

#### Scenario: Reject empty -s value

- **WHEN** the user passes `-s ""`
- **THEN** omnicode SHALL exit with code 2 and print an error message

### Requirement: PID-reuse mitigation in cleanup

The cleanup function SHALL verify that the PID read from the PID file still belongs to the expected process before sending `kill`.

#### Scenario: Verify PID belongs to omniroute

- **WHEN** `stop_omniroute_if_idle` reads a PID from `$PID_FILE`
- **THEN** it SHALL check that a process with that PID exists (`is_pid_alive`) before sending `kill`
