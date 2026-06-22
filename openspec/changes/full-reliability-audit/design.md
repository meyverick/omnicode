## Context

The user experienced two full system crashes while running omnicode with Chrome and OpenCode open — a pattern that correlates with the introduction of parallel chunk indexing (10 concurrent MCP requests) and the long-lived MCP daemon. The crashes suggest resource exhaustion (RAM/swap thrashing, OOM killer) rather than a process crash within omnicode. The project now has the following concurrent resource consumers during a typical session:

| Consumer | Memory | CPU | Duration |
|---|---|---|---|
| Chrome browser | 500MB-2GB | variable | entire session |
| OpenCode | 100-300MB | variable | entire session |
| MCP server (ONNX model) | ~200MB RSS | idle until used | entire session |
| Omniroute | ~50MB | low | entire session |
| Parallel chunk indexing | 40MB+ chunks + response buffers | 10 concurrent workers | indexing period |

On a system with 8GB RAM, this adds up quickly. The audit must identify all resource pressure points, process lifecycle gaps, and error handling weaknesses.

## Goals / Non-Goals

**Goals:**
- Audit all child process lifecycle paths for leaks, orphans, and incomplete cleanup.
- Audit memory usage: chunk buffering, MCP model load, concurrent request overhead.
- Audit error handling: unhandled rejections, try/catch gaps, silent failure paths.
- Audit file descriptor usage: open log handles, stdio pipes, recursive sync I/O.
- Fix all identified issues with concrete mitigations.
- Add stress/reliability tests.
- Reduce default concurrency from 10 to a safer value.

**Non-Goals:**
- Rewriting the architecture (no new frameworks or major refactors).
- Adding external monitoring dependencies.
- Changing the chunking or file walking logic.
- Performance optimization beyond stability.

## Decisions

1. **Reduce default concurrency from 10 to 3**

   The MCP server processes one request at a time internally. Concurrency of 10 only adds queuing pressure on the server's event loop and memory for buffered responses. A concurrency of 3 is enough to keep the pipeline full without spiking memory.

2. **Stream chunks instead of buffering all**

   `indexReferences()` currently loads all chunks into `allChunks` before calling `callQdrantStore()`. This means 84710 chunks (~40MB) sit in memory before any are sent. Switch to a streaming approach: read and send chunks in batches (e.g., 100 at a time) to keep the working set small.

3. **Add process-level OOM watch**

   Use `process.memoryUsage()` before the MCP server start and before indexing to warn if RSS exceeds a threshold (e.g., 75% of system total memory). If the system is under memory pressure, reduce concurrency further or skip indexing.

4. **Harden child process cleanup**

   Replace bare try/catch in `stopMcpServer()` with explicit kill sequence with timeout. Add a process tree cleanup guarantee in the runtime's `process.on("exit")` handler for the MCP server. Ensure `closeSync` is always called for log file descriptors.

5. **Add global unhandled rejection handler**

   Add `process.on("unhandledRejection")` in both `omnicode.js` and `omnicode-runtime.js` that logs the error and exits with code 1 (Node.js default behavior, but explicit makes it visible).

6. **Audit sync I/O usage**

   The file walking and chunking use synchronous `readFileSync`/`readdirSync`/`statSync`. For 12900 files, this blocks the event loop for seconds. Move to streaming or async alternatives where feasible; at minimum, add progress logging so the user knows the system is not hung.

## Risks / Trade-offs

- [Lower concurrency increases indexing time] → From ~2-5 min to ~5-15 min for full index. Acceptable for stability.
- [Streaming chunks adds complexity to `indexReferences`] → The batch approach is simpler: process N files, send N chunks, free memory, repeat.
- [Memory check adds latency to startup] → `os.totalmem()` and `process.memoryUsage()` are instant syscalls, negligible cost.

## Migration Plan

No migration needed. Changes are backward compatible; concurrency reduction is transparent. Existing `OMNICODE_INDEX_CONCURRENCY` env var override is preserved.

## Open Questions

- Should the MCP server be killed and restarted between indexing sessions to free the ONNX model memory while OpenCode is idle? (Deferred — depends on how long indexing takes.)
- Should we add a `--memory-limit` flag or respect system cgroup limits? (Out of scope for this audit.)