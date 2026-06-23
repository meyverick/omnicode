## Why

The current concurrent indexing implementation encounters stability and reliability issues under heavy load and during shutdown sequences. Specifically, race conditions in state saving, GC overhead from redundant parsing, and API payload limit errors cause process hangs and warnings, making the system brittle during background tasks. This change formalizes the architectural hardening required to make concurrent indexing completely robust.

## What Changes

- Add a concurrent worker queue (limit 8) with robust error handling to `lib.js`.
- Introduce WASM grammar compilation caching in `tree-sitter.js` to eliminate redundant compilation.
- Implement shared parser instance reuse to significantly reduce GC overhead and memory pressure.
- Unify concurrency settings into a single `INDEXING_CONCURRENCY` variable with dynamic CPU-based auto-scaling.
- Filter small assets (e.g., icons < 50KB) out of complex document paths to avoid MinerU 413 API errors.
- Resolve atomic rename race conditions in `saveIndexState` using unique UUID-based temporary files.
- Ensure environment variables for threading seamlessly propagate down to generated Qdrant configurations.

## Capabilities

### New Capabilities
- `indexer-concurrency-scaling`: Dynamic CPU-based auto-scaling for concurrency, and robust WASM/parser pooling to optimize memory/CPU usage during concurrent indexing.
- `indexer-fault-tolerance`: UUID-based atomic state saving and MinerU API payload guardrails to ensure robust background completion and graceful termination.

### Modified Capabilities
- `performance-hardening`: Update requirements to cover WASM caching and shared parser instances.
- `reliability-hardening`: Update requirements to enforce UUID-based temporary files for atomic renames.
- `cross-platform-runtime`: Update requirements to enforce dynamic thread injection based on `INDEXING_CONCURRENCY`.

## Impact

- `src/installer/lib.js`: Major logic updates for concurrency queues, state saving, and image filtering.
- `src/installer/tree-sitter.js`: Addition of caching logic and instance reuse.
- `opencode.jsonc`: Structural updates to consolidate concurrency variables.
- The `omnicode` background execution system will become dramatically more resilient, using less memory and avoiding deadlock/crash loops.
