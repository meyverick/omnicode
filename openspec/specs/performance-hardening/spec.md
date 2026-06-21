# performance-hardening

## Purpose

Reduces process overhead through shared process detection, parallelized startup sequences, and polling backoff in cleanup loops.

## Requirements

### Requirement: Shared process detection

`isProcessRunning()` SHALL be defined once in `src/installer/lib.js` and imported by both `omnicode.js` and `omnicode-runtime.js`.

#### Scenario: Single definition

- **WHEN** `omnicode.js` and `omnicode-runtime.js` call `isProcessRunning()`
- **THEN** both SHALL use the same function exported from `lib.js`, not local copies

### Requirement: Parallelized OmniRoute startup and tool init

The runtime SHALL start OmniRoute concurrently with GrayMatter and OpenSpec init instead of waiting for init to complete first.

#### Scenario: Concurrent startup

- **WHEN** `runRuntime()` is called
- **THEN** `startOmniroute()` SHALL be invoked in parallel with `initTools()` using `Promise.all`

### Requirement: Polling backoff in cleanup

The `stopOmnirouteIfIdle` function SHALL use interval-based polling instead of a tight busy-wait loop when waiting for process exit.

#### Scenario: Backoff during cleanup

- **WHEN** `process.kill(pid, 'SIGTERM')` is sent
- **THEN** the cleanup loop SHALL poll at intervals with a maximum of 10 retries instead of continuous busy-wait
