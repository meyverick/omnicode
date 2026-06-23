## Why

`omnicode index` causes a full system freeze on a powerful machine every time it runs. Previous fixes (single MCP server, reduced concurrency, ORT thread limits, stale lock cleanup) addressed symptoms but the root cause remains. The indexing pipeline has multiple systemic issues that together cause OOM or 100% CPU hang:

1. **Qdrant local storage corruption after crash**: MCP server uses `AsyncQdrantLocal` which writes a journal/WAL. If `omnicode` or the MCP process is killed mid-index, the storage state is undefined. On next `omnicode index`, the MCP server hangs indefinitely trying to replay a corrupted journal, consuming 100% CPU.
2. **Synchronous file I/O blocking the event loop**: `walkReferences()` + batch loop use `readFileSync`/`readdirSync`/`statSync` for 12900 files. This blocks the Node event loop for seconds, making the process unresponsive to signals.
3. **No progress feedback during freeze**: User sees no output during the hang, forcing hard reset instead of Ctrl+C.
4. **Memory pressure from file content**: All 12900 files are read and chunked into memory per-batch. Each batch currently holds up to 100 files regardless of size, risking massive V8 heap OOMs on large text files.
5. **Edge-case unreliability**: Mid-batch python deadlocks cause hours of silent timeouts, `EACCES` protected directories crash the index, broken memory overrides cause OOM, and MCP IPC flaws cause `EPIPE` crashes and unbounded `stderr` memory leaks. Unbounded markdown chunking causes Python OOMs, unhandled rejections create orphaned MCP processes permanently locking the database, fatal crashes during state saves permanently corrupt the index, missing chunk metadata breaks LLM retrieval, and undeleted ghost files poison the vector DB over time.

## What Changes

- Replace all synchronous file I/O in the indexing hot path with sequential or bounded async alternatives to prevent EMFILE file descriptor exhaustion.
- Add a `QDRANT_LOCAL_PATH` wipe option for recovery after crashes, or add exclusive lock with timeout to fail fast.
- Add periodic progress output with batch timing so the user can see indexing is alive.
- Add a `--resume` flag that skips previously indexed files without re-reading them.
- Add Ctrl+C handler during indexing that cleanly shuts down MCP, saves partial state, and deregisters signal listeners upon completion.
- Add batch abort logic, graceful `EACCES` handling, strict concurrency overrides, `EPIPE` error absorption, bounded `stderr` buffers, markdown chunk size limits, `process.on('exit')` cleanup, `timeout.unref()` for graceful exits, atomic state saving, dynamic byte-based batching, ghost file detection, and chunk metadata injection.

## Capabilities

### New Capabilities

- `indexing-stability-audit`: Deep audit and hardening of the indexing pipeline for reliability, responsiveness, and crash recovery.

### Modified Capabilities

- (None — no existing spec-level requirements are changing.)

## Impact

- `src/installer/lib.js`: Replace sync I/O in `walkReferences`, `saveIndexState`, and batch loop with sequential or bounded async alternatives; add `setImmediate` event loop yields; add `EACCES` handling, timeout aborts, concurrency overrides, `EPIPE` absorption, bounded `stderr`, hard markdown chunk limits, `process.on('exit')` cleanup, `timeout.unref()`, atomic writes, dynamic byte batching, ghost file cleanup, and chunk metadata injection.
- `src/bin/omnicode.js`: Add signal handlers for graceful shutdown during indexing with proper lifecycle cleanup of event listeners.
- `test/`: Update tests for async I/O paths.
