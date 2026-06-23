## 1. Extract MCP server startup from `callQdrantStore()`

- [x] 1.1 Add `startMcpServer(env)` function: spawn `uvx mcp-server-qdrant`, send JSON-RPC `initialize`, wait for response, return `{ child, stdin, stdout }`; set `FASTEMBED_CACHE_PATH` in env
- [x] 1.2 Add `stopMcpServer(mcpServer)` function: send JSON-RPC `exit` notification, close stdin, kill child process
- [x] 1.3 Add optional `mcpServer` parameter to `callQdrantStore()`: if provided, use existing MCP connection instead of spawning a new one; fall back to `startMcpServer()` if omitted
- [x] 1.4 Verify backward compatibility: `callQdrantStore(chunks, env)` still works without a server reference

## 2. Block OpenCode launch behind model preflight + MCP start

- [x] 2.1 In `runRuntime()`, call `verifyFastEmbedModel()` synchronously before `launchOpencode()`; exit the Qdrant path early if validation fails
- [x] 2.2 In `runRuntime()`, call `startMcpServer()` after model validation; exit the Qdrant path if MCP init fails
- [x] 2.3 Move `indexReferences()` call to background after `launchOpencode()` completes, passing the already-running MCP server
- [x] 2.4 After OpenCode exits, call `stopMcpServer()` to clean up the long-lived MCP daemon

## 3. Tests

- [x] 3.1 Add unit tests for `startMcpServer()` (successful init, init timeout, error handling)
- [x] 3.2 Add unit test for `callQdrantStore()` with pre-initialized MCP server
- [x] 3.3 Add runtime tests verifying the readiness barrier: model fails → OpenCode starts without Qdrant; MCP fails → OpenCode starts without Qdrant; both succeed → MCP is ready before OpenCode
- [x] 3.4 Run full test suite and fix any failures

## 4. Final verification

- [x] 4.1 Run `npm pack --dry-run` to confirm package contents
- [x] 4.2 Commit and push
