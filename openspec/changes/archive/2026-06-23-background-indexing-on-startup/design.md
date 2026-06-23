## Context

Currently, the `omnicode` runtime initializes its toolchain, connects to the Qdrant MCP server, and immediately launches `opencode` without triggering any file indexing. The `omnicode --index` command is standalone and synchronous. The user wants the runtime to automatically trigger indexing in the background on startup, maintaining fresh vectors. The concurrency and threading for indexing have already been locked to 1 thread (`QRANT_INDEX_CONCURRENCY=1`, `OMP_NUM_THREADS=1`, etc.), so doing this in the background will not freeze the host.

## Goals / Non-Goals

**Goals:**
- Automatically invoke `indexReferences` asynchronously in `omnicode-runtime.js` immediately after the Qdrant MCP server successfully starts.
- Ensure the background operation does not block the startup of the actual `opencode` IDE session.
- Handle any errors gracefully inside the un-awaited Promise chain so the host process doesn't crash on unhandled rejections.

**Non-Goals:**
- Changing the indexing logic itself.
- Polling for file changes (this is a one-off index on startup, not a continuous file watcher).
- Returning the index progress to the `opencode` UI.

## Decisions

- **Decision 1: Fire-and-forget Promise:** We will call `indexReferences(refsDir, qdrantConfig, qdrantServer).catch(err => ...)` right before launching `opencode`.
  - **Rationale**: We do not want to block the user's IDE startup. The Qdrant MCP server is ready, so the indexer can connect immediately and quietly do its work.
- **Decision 2: Re-use the existing Qdrant connection**: We pass `qdrantServer` directly into `indexReferences`.
  - **Rationale**: Prevents a second expensive MCP initialization for indexing.

## Risks / Trade-offs

- **Risk**: Process Exits before indexing finishes.
  - **Mitigation**: This is acceptable. The indexer saves partial state on graceful exit, and will simply pick up where it left off next time.
- **Risk**: Resource Contention.
  - **Mitigation**: Single-thread limits are hardcoded. Background footprint will be minimal.
