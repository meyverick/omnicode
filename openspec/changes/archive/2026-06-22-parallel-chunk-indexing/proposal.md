## Why

The Qdrant reference indexer sends chunks to the MCP server one at a time, waiting for each `qdrant-store` response before sending the next. For 84710 chunks (from a full `./references/` index), this takes ~70 minutes. Processing chunks in parallel with a concurrency limit reduces this to a few minutes without overwhelming the MCP server.

## What Changes

- Add concurrency-limited parallel chunk processing to `callQdrantStore()`.
- Send up to 10 chunks concurrently via JSON-RPC `tools/call` requests.
- Track in-flight request IDs to match responses to their chunks.
- Keep the same JSON-RPC flow (initialize, notify, call, exit) — only the `tools/call` loop becomes parallel.
- Remove the sequential wait between chunks.

## Capabilities

### New Capabilities

- `parallel-chunk-indexing`: Sends multiple `qdrant-store` requests concurrently with a configurable concurrency limit, reducing total indexing time from hours to minutes.

### Modified Capabilities

- (None — same functionality, faster implementation.)

## Impact

- `src/installer/lib.js`: Rewrite `callQdrantStore()` to use concurrent batch processing.
- `test/`: Update tests for the new parallel behavior (faster completion).
