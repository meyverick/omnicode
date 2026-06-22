## 1. Audit child process lifecycle

- [x] 1.1 Review `startOmniroute` / `stopOmnirouteIfIdle`: ensure log fd is closed, process group is cleaned on all exit paths
- [x] 1.2 Review `initTool`: ensure `closeSync(log)` is called on ALL exit paths (success, timeout, error)
- [x] 1.3 Review `startMcpServer` / `stopMcpServer`: harden kill sequence with timeout, add process tree cleanup
- [x] 1.4 Review `indexReferences` fire-and-forget path: replace `.catch(() => {})` with explicit error logging

## 2. Audit memory usage

- [x] 2.1 Reduce default concurrency from 10 to 3 in `callQdrantStore()` and `indexReferences()`
- [x] 2.2 Stream chunks in `indexReferences()`: process files and send chunks in batches of 100 instead of buffering all 84710
- [x] 2.3 Add memory pressure check: log warning if RSS > 75% of total system memory before starting MCP or indexing

## 3. Audit error handling

- [x] 3.1 Add `process.on("unhandledRejection")` in `omnicode.js` with descriptive error log and exit code 1
- [x] 3.2 Add `process.on("unhandledRejection")` in `omnicode-runtime.js` with descriptive error log
- [x] 3.3 Review all bare `catch {}` blocks: ensure at minimum a `console.error` log is present for unexpected failures
- [x] 3.4 Audit `writeFileSync` / `readFileSync` calls in `ensureOpencodeConfig`, `saveIndexState`, `ensureQdrantAgentInstructions` for error messages

## 4. Audit file descriptor usage

- [x] 4.1 Review all `openSync` / `closeSync` pairs for guaranteed cleanup
- [x] 4.2 Review `walkReferences` recursive sync I/O: add progress logging for large directories
- [x] 4.3 Verify `child.stdin.end()` is called on all MCP server shutdown paths

## 5. Stress tests

- [x] 5.1 Add test: rapid open/close cycles to verify no process leak
- [x] 5.2 Add test: simulate MCP server crash mid-indexing and verify graceful recovery
- [x] 5.3 Add test: verify zero orphaned processes after SIGINT/SIGTERM
- [x] 5.4 Run full test suite and fix any failures

## 6. Final verification

- [x] 6.1 Run `npm pack --dry-run` to confirm package contents
- [x] 6.2 Commit and push