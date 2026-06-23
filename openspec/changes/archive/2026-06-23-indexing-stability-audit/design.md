## Context

The indexing path in `indexReferences()` (lib.js:497) is entirely synchronous for file I/O. It calls `walkReferences()` which recurses into `./references/` using `readdirSync`/`statSync`, then reads every changed file with `readFileSync`. For 12900 files, this blocks the Node event loop for extended periods — the process cannot respond to signals (Ctrl+C) or handle any async events during this time. If Qdrant's local storage journal is corrupted from a previous crash, the MCP server hangs in Python, and the Node process waits forever on the `tools/call` response.

Current flow per batch:
1. Read 100 files synchronously (blocks event loop)
2. Chunk each file (sync string operations)
3. Send all chunks via JSON-RPC to MCP (async, but waits for response)
4. Save state to disk (sync)
5. Repeat

Qdrant's local storage (`AsyncQdrantLocal`) writes a WAL journal. If the process is killed during a write, the journal can enter an inconsistent state. On next start, the Qdrant client tries to replay the journal and hangs.

## Goals / Non-Goals

**Goals:**
- Make indexing responsive to Ctrl+C by replacing sync I/O with async I/O.
- Add graceful shutdown that saves partial state, kills MCP cleanly, and deregisters signal event listeners to prevent leaks.
- Add crash recovery for Qdrant local storage: detect stale journal and prompt to wipe.
- Add per-batch timing output so the user can identify stuck batches.
- Ensure the process exits cleanly within 5 seconds of Ctrl+C.

**Non-Goals:**
- Changing the MCP server or Qdrant client itself.
- Adding new dependencies (async I/O uses Node built-in `fs.promises`).

## Decisions

1. **Replace `readFileSync` with `fs.promises.readFile`** in the batch loop. This unblocks the event loop between files, allowing signal handlers to fire. Inject `await new Promise(r => setImmediate(r))` inside the batch loop to yield the event loop and prevent CPU starvation from synchronous `chunkFile` operations on massive files.

2. **Replace `walkReferences` with an async generator** that yields file paths. Use `fs.promises.readdir` and `fs.promises.stat`. Keep walking and file reading sequential or limit concurrency to ensure no more than a few files are open simultaneously (preventing EMFILE limits).

3. **Add Ctrl+C handler before indexing** that: sets a `cancelled` flag, calls `stopMcpServer`, saves partial state, and exits. The worker loop checks the flag between batches. Ensure the SIGINT handler is cleanly deregistered (`process.off("SIGINT")`) upon indexing completion or failure to avoid memory leaks.

4. **Add `allowCrashRecovery` option** that detects a stuck MCP init (longer than expected), deletes `.qdrant/.lock` and the WAL file, and retries the MCP startup once.

5. **Add per-batch timing**: log duration of each 100-file batch. If a batch takes > 30s, log a warning.

6. **Keep sync I/O for small operations** (config reads) since they don't block meaningfully, but **convert `saveIndexState` to an atomic write** by writing to a temporary file (`.tmp`) and using `fs.promises.rename` to replace the old state. This prevents catastrophic index corruption if the process is killed during a state save.

7. **Track consecutive chunk timeouts** in `callQdrantStore` to abort batches experiencing MCP server mid-batch deadlock (preventing silent zombie churning).

8. **Wrap `fs.promises.readdir` in a try/catch** inside `walkReferencesAsync` to gracefully ignore `EACCES` protected directories without crashing the process via unhandled rejections.

9. **Enforce `concurrency = 1`** explicitly when `warnIfMemoryPressure()` evaluates to true, overriding `env.QRANT_INDEX_CONCURRENCY` to truly prevent memory spikes.

10. **Attach a no-op `error` listener** to `child.stdin` in `startMcpServer` to absorb `EPIPE` exceptions if the Python server crashes unexpectedly, preventing fatal Node.js IPC unhandled rejections.

11. **Bound the `stderr` string buffer** in `startMcpServer` by only retaining the last log line, preventing an unbounded memory leak (e.g., `ERR_STRING_TOO_LONG`) from verbose Python logging over long runs.

12. **Enforce an absolute character limit** for markdown chunks in `chunkFile` (e.g. max 4000 chars) instead of solely relying on `## ` headings, preventing massive payload OOMs in the FastEmbed tokenizer.

13. **Attach `process.on('exit')`** in `startMcpServer` to forcefully kill the python child process, ensuring the Qdrant DB lock is released even if Node undergoes an abrupt `process.exit(1)` from unhandled rejections.

14. **Call `timeout.unref()`** on the 5-second `SIGKILL` timeout in `stopMcpServer` so the Node process can exit immediately once indexing is successfully completed or aborted, eliminating UX freezing.

15. **Implement dynamic byte-based batching**: Track cumulative byte size of files in the batch loop. Flush to Qdrant when `BATCH_SIZE >= 100` OR `cumulativeBytes > 20_000_000` (20MB) to prevent massive V8 memory accumulation bombs on large text files.

16. **Inject metadata into Qdrant store**: Modify `callQdrantStore` payload mapping to pass `{ information: chunk.text, metadata: { source: chunk.path } }` to the MCP tool, ensuring the Vector DB retains source citations for LLM retrieval.

17. **Detect and purge ghost files**: Cross-reference the keys of `index.json` with the files discovered by `walkReferencesAsync()`. If a file exists in the state but no longer exists on disk, remove it from the state object (and explicitly issue a Qdrant deletion if a delete API is added).

## Risks / Trade-offs

- [Async I/O is slightly slower per-file than sync] → acceptable because it keeps the event loop responsive.
- [`fs.promises` on recursive directory walks may hit fd limits] → walk directories and read files sequentially/generator-style rather than in parallel `Promise.all` spikes to stay within file descriptor bounds.
- [WAL corruption recovery may lose some indexed data] → worse case is re-indexing ~100 files instead of 84710.

## Migration Plan

No migration needed. Existing index state is compatible; corrupted Qdrant storage is detected and recovered on next run.

## Open Questions

- Should we always delete the Qdrant WAL before indexing to avoid corruption entirely? (Deferred — try clean recovery first, then consider aggressive wipe if corruption persists.)
