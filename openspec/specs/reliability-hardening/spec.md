# reliability-hardening

## Purpose

Prevents hangs and resource leaks by adding tool init timeouts, fixing file descriptor leaks on spawn failure, and extending Windows process name detection.

## Requirements

### Requirement: Timeout on tool initialization

The `initTool()` function SHALL set a timeout on tool subprocesses so `omnicode` does not hang indefinitely if a tool hangs.

#### Scenario: Tool times out

- **WHEN** `graymatter init` or `openspec init` does not exit within 30 seconds
- **THEN** the runtime SHALL kill the hung subprocess, log a warning, and continue

### Requirement: File descriptor safety on spawn failure

The runtime SHALL NOT leak file descriptors opened for log files if the child `spawn` throws.

#### Scenario: spawn throws after openSync

- **WHEN** `openSync(logPath, "w")` succeeds but `spawn(name, args)` throws
- **THEN** the runtime SHALL close the opened file descriptor before propagating the error

### Requirement: Windows process name extension support

On Windows, `isProcessRunning()` SHALL detect processes named with `.exe`, `.cmd`, or `.bat` extensions.

#### Scenario: Detect .cmd process

- **WHEN** a process named `opencode.cmd` is running on Windows
- **THEN** `isProcessRunning("opencode")` SHALL return `true`

#### Scenario: Detect .bat process

- **WHEN** a process named `opencode.bat` is running on Windows
- **THEN** `isProcessRunning("opencode")` SHALL return `true`
