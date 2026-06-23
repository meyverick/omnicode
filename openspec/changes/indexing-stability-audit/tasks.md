## 1. Remove double model load in `omnicode index`

- [x] 1.1 Remove `verifyFastEmbedModel()` call from `indexReferences()` — the MCP server loads the model itself during init
- [x] 1.2 Move size check into `startMcpServer()` as a fast pre-flight before spawning, using `statSync` only (no warmup)
- [x] 1.3 Verify `omnicode index` no longer spawns a Python warmup process before MCP

## 2. Make indexing responsive to Ctrl+C

- [x] 2.1 Add `cancelled` flag in `indexReferences()`, checked between batches and between files within a batch
- [x] 2.2 Add `process.on("SIGINT")` handler before indexing that sets `cancelled = true`, logs "index interrupted, saving partial state...", and calls `stopMcpServer`. Deregister handler via `process.off("SIGINT")` on index finish/failure to prevent leaks.
- [x] 2.3 Replace `readFileSync` with `fs.promises.readFile` in the batch loop and inject `await new Promise(r => setImmediate(r))` to yield event loop between file chunking, updating the loop to flush to Qdrant dynamically (>20MB cumulative) instead of purely by file count to prevent V8 OOMs
- [x] 2.4 Replace `walkReferences` with `walkReferencesAsync` using `fs.promises.readdir` (wrapped in try/catch to ignore EACCES/EPERM) and `fs.promises.stat`, walking sequentially/generator-style to avoid EMFILE limits
- [x] 2.5 Convert `saveIndexState` to an atomic write: write JSON to a `.tmp` file via `fs.promises.writeFile`, then atomically rename it to `index.json` using `fs.promises.rename` to prevent catastrophic state corruption on fatal crashes
- [ ] 2.6 Verify Ctrl+C exits within 5 seconds during indexing
## 3. Add batch timing and progress output

- [x] 3.1 Log per-batch duration after each 100-file batch
- [x] 3.2 Log a warning if a batch takes > 30 seconds
- [x] 3.3 Track consecutive chunk timeouts in `callQdrantStore`; abort the batch and trigger recovery if >3 consecutive chunks timeout

## 4. Add Qdrant crash recovery

- [x] 4.1 Before starting MCP in `indexReferences`, delete stale `.qdrant/.lock` and WAL journal files if they exist
- [x] 4.2 Add a `--force-reindex` flag that wipes the `.qdrant/` directory and all state before indexing
- [x] 4.3 Ensure `warnIfMemoryPressure()` actually forces `concurrency = 1` inside `indexReferences`, rather than letting the env var override it

## 5. IPC Safety and Memory Leaks

- [x] 5.1 Attach a no-op `error` listener to `child.stdin` in `startMcpServer()` to safely absorb `EPIPE` crashes if the Python MCP server dies unexpectedly
- [x] 5.2 Cap the `stderr` string buffer in `startMcpServer()` to only retain the last log line, preventing an unbounded memory leak over long index runs
- [x] 5.3 Add `timeout.unref()` to the 5-second `SIGKILL` timer in `stopMcpServer()` to prevent the CLI from hanging during successful exits
- [x] 5.4 Modify `chunkFile()` to enforce an absolute character limit (e.g., 4000) for markdown chunks, fallback-splitting them if headers are missing to prevent FastEmbed Python OOMs
- [x] 5.5 Attach `process.on('exit')` in `startMcpServer()` to explicitly kill the child process, preventing orphaned database locks if Node.js crashes via unhandled rejection

## 6. Data Pipeline Integrity

- [x] 6.1 Modify `callQdrantStore` payload mapping to pass `{ information: chunk.text, metadata: { source: chunk.path } }`, enabling semantic retrieval source citations
- [x] 6.2 Implement ghost file detection: cross-reference `state` keys with files from `walkReferencesAsync()`. Remove missing files from `state` (and explicitly delete from Qdrant if supported) to prevent stale LLM hallucinations

## 7. Tests

- [x] 6.1 Add test: Ctrl+C mid-indexing saves partial state
- [x] 6.2 Run full test suite and fix any failures

## 8. Final verification

- [x] 7.1 Run `npm pack --dry-run` to confirm package contents
- [x] 7.2 Commit and push