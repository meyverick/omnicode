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

### Requirement: WASM Grammar Compilation Caching
The tree-sitter integration SHALL cache compiled WASM language grammars across file processing requests to eliminate redundant compilation overhead.

#### Scenario: Indexing multiple files of same language
- **WHEN** parsing 100 JavaScript files
- **THEN** the WASM grammar for JavaScript SHALL be compiled exactly once and cached

### Requirement: Shared Parser Instance Reuse
The tree-sitter integration SHALL maintain a pool of reusable parser instances to minimize V8 garbage collection spikes and memory pressure.

#### Scenario: Reusing parsers
- **WHEN** a worker finishes parsing a file
- **THEN** its parser instance SHALL be returned to the pool
- **AND** subsequent workers SHALL reuse an available parser from the pool
