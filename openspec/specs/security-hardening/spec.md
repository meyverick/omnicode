# security-hardening

## Purpose

Hardens security boundaries by limiting session ID length, enforcing restrictive file permissions on the data directory, and ensuring process tree cleanup on Unix.

## Requirements

### Requirement: Session ID length limit

The session ID validator SHALL reject session IDs longer than 128 characters.

#### Scenario: Reject long session ID

- **WHEN** a session ID longer than 128 characters is passed
- **THEN** `parseArgs()` SHALL exit with code 2 and print an error message

### Requirement: PID file directory permissions

The runtime SHALL create the data directory with restrictive permissions (mode `0o700`) on Unix, ensuring only the owning user can read or write PID and log files.

#### Scenario: Restrictive directory mode

- **WHEN** the data directory is created on Unix
- **THEN** `mkdirSync()` SHALL use mode `0o700`

### Requirement: Process tree cleanup on Unix

The cleanup function SHALL terminate the entire process group of a detached child process on Unix, ensuring descendant processes are also stopped.

#### Scenario: Kill process group

- **WHEN** `stopOmnirouteIfIdle` sends SIGTERM on Unix
- **THEN** the signal SHALL be sent to the negative PID (process group) to kill descendants
