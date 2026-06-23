# indexer-concurrency-scaling

## Purpose

TBD

## Requirements

### Requirement: Dynamic Concurrency Auto-Scaling
The system SHALL dynamically determine the maximum number of concurrent indexing worker threads based on the host CPU count, unless overridden by the user.

#### Scenario: Default auto-scaling
- **WHEN** `INDEXING_CONCURRENCY` is not explicitly set in `opencode.jsonc`
- **THEN** the system SHALL calculate the limit as `Math.max(1, Math.floor(os.cpus().length * 0.25))`

#### Scenario: User override
- **WHEN** `INDEXING_CONCURRENCY` is set to `8` in `opencode.jsonc`
- **THEN** the system SHALL use exactly `8` concurrent worker threads

### Requirement: Concurrent Worker Queue
The indexer SHALL process files using an asynchronous worker queue that strictly enforces the calculated concurrency limit to prevent `EMFILE` errors and event loop starvation.

#### Scenario: Processing large repository
- **WHEN** 12,000 files are queued for indexing
- **THEN** no more than `INDEXING_CONCURRENCY` files are processed simultaneously
