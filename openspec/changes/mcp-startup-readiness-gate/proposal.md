## Why

OpenCode currently launches concurrently with the Qdrant MCP server startup. The runtime fires `indexReferences()` as a background promise (`omnicode-runtime.js:190`) while OpenCode starts immediately. If the FastEmbed model cache is missing or corrupted, the model download and MCP initialization race against OpenCode loading its MCP configuration from `opencode.jsonc`. This causes one of two failures: OpenCode loads a broken MCP entry and shows cryptic errors, or the MCP server initializes too late for OpenCode to register it. The startup needs a synchronous readiness gate that blocks OpenCode until the model is verified and the MCP server is ready to serve requests.

## What Changes

- Move `verifyFastEmbedModel()` from `indexReferences()` into the runtime's synchronous startup sequence, before OpenCode launches.
- After model verification, start the Qdrant MCP server as a long-lived subprocess (not inside `callQdrantStore()`) and wait for its `initialize` response before proceeding.
- Spawn OpenCode only after both the model preflight and MCP readiness check succeed.
- Keep chunk indexing as a background task after OpenCode launches (unchanged).
- If MCP readiness fails, log a clear warning and start OpenCode without Qdrant indexing — the user can fix the issue and re-run.

## Capabilities

### New Capabilities

- `mcp-startup-readiness-gate`: Blocks OpenCode launch until FastEmbed model validation and Qdrant MCP server readiness are confirmed; starts MCP server as a standalone daemon instead of inside `callQdrantStore()`.

### Modified Capabilities

- (None — no existing spec-level requirements are changing.)

## Impact

- `src/bin/omnicode-runtime.js`: Add model preflight and MCP readiness check before `launchOpencode()`; refactor MCP server lifecycle to start before OpenCode.
- `src/installer/lib.js`: Extract MCP start logic from `callQdrantStore()` into a reusable `startMcpServer()` function that returns a child process reference; keep `callQdrantStore()` for chunk storage only.
- `test/runtime.test.js`: Add tests for the new readiness gate.
- `test/lib.test.js`: Update tests for extracted MCP start function.