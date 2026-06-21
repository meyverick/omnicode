# startup-latency-optimization

## Purpose

Reduces startup latency by caching imports, version strings, and parallelizing initialization steps.

## Requirements

### Requirement: Hoisted `node:sqlite` import

The dynamic import of `node:sqlite` SHALL be hoisted to module scope so it runs once per process instead of on every `getLatestSessionId()` call.

#### Scenario: First call imports, subsequent calls reuse

- **WHEN** `getLatestSessionId()` is called for the first time
- **THEN** `node:sqlite` SHALL be imported
- **WHEN** `getLatestSessionId()` is called again in the same process
- **THEN** the cached module SHALL be used without a second dynamic import

### Requirement: Cached version string

The `getVersion()` function SHALL cache the version string after the first `readFileSync`/`JSON.parse` call so subsequent calls return the cached value without filesystem access.

#### Scenario: Version cached after first call

- **WHEN** `getVersion()` is called the first time
- **THEN** it SHALL read and parse `package.json` and cache the version string
- **WHEN** `getVersion()` is called again in the same process
- **THEN** it SHALL return the cached string without file I/O

### Requirement: Parallel GrayMatter and OpenSpec initialization

The runtime SHALL initialize GrayMatter and OpenSpec concurrently instead of sequentially.

#### Scenario: Parallel init reduces startup time

- **WHEN** both `graymatter` and `openspec` are installed
- **THEN** their `init` commands SHALL be launched in parallel using `Promise.all` and awaited before starting OmniRoute
