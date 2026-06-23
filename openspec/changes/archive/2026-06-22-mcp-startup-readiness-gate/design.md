## Context

The current startup sequence in `runRuntime()` (`omnicode-runtime.js:187-194`) launches OpenCode and starts Qdrant indexing as a fire-and-forget background task:

```
launchOpencode()                   // awaits
indexReferences(refsDir)           // .catch(() => {}), no await
```

Inside `indexReferences()`, model validation (`verifyFastEmbedModel()`) and MCP server startup (`callQdrantStore()`) happen after OpenCode has already started. OpenCode loads `opencode.jsonc` at startup and attempts to connect to configured MCP servers. If the model cache needs downloading or the MCP server isn't ready yet, OpenCode sees a broken or missing MCP connection.

Additional complication: `callQdrantStore()` spawns a fresh `uvx mcp-server-qdrant` process, sends chunks, then exits it. There is no long-lived MCP daemon. Each indexing run starts from scratch.

## Goals / Non-Goals

**Goals:**
- Block OpenCode launch until FastEmbed model validation completes successfully.
- Start the Qdrant MCP server as a long-lived daemon before OpenCode launches.
- Wait for the MCP server to respond to JSON-RPC `initialize` before proceeding.
- Keep the MCP server running while OpenCode is active; kill it after OpenCode exits.
- Keep chunk indexing as a background task that reuses the already-running MCP server.
- Skip MCP server startup gracefully if model validation fails or `uvx` is unavailable; OpenCode still launches.

**Non-Goals:**
- Changing the chunk indexing logic or parallelism (handled by `parallel-chunk-indexing`).
- Changing the `verifyFastEmbedModel()` function behavior (already finalized).
- Supporting runtime MCP server restart after failure.
- Changing the `omnicode index` CLI subcommand behavior.

## Decisions

1. **Extract MCP server lifecycle from `callQdrantStore()`**

   Split `callQdrantStore()` into two parts:
   - `startMcpServer(env)` — spawns `uvx mcp-server-qdrant`, sends `initialize`, waits for response, returns `{ child, stdin, stdout }`.
   - `callQdrantStore(chunks, env, mcpServer)` — accepts an already-initialized MCP server connection, sends chunks, returns results. If no `mcpServer` argument is provided, falls back to spawning its own (backward compatible).

   Alternative considered: Having `callQdrantStore()` detect whether a server is already running via a PID file or socket — rejected as fragile. Explicit parameter is cleaner.

2. **Long-lived MCP daemon in the runtime**

   `runRuntime()` starts the MCP server after model validation and keeps a reference to it. The server stays alive while OpenCode runs. After OpenCode exits, the runtime sends the `exit` JSON-RPC notification and kills the child process.

   The server PID is stored in a variable (not a PID file) because it lives only for the runtime process lifetime.

3. **Synchronous readiness barrier**

   The runtime sequence becomes:

   ```
   verifyFastEmbedModel()     // await — synchronous barrier
   startMcpServer()           // await — synchronous barrier
   launchOpencode()           // await — OpenCode starts with MCP already ready
   indexReferences(mcpServer) // background, reuses existing MCP connection
   stopMcpServer()            // after OpenCode exits
   ```

   If either preflight or MCP start fails, log a warning and proceed without Qdrant indexing (skip to `launchOpencode()` directly).

4. **`opencode.jsonc` MCP config must not trigger a second MCP server**

   `ensureOpencodeConfig()` sets `disabled: true` on the Qdrant MCP config entry. OpenCode reads the config and sees the Qdrant server as disabled, so it does not attempt to start its own instance. Omnicode manages the server lifecycle directly (starts before OpenCode, stops after OpenCode exits).

   OpenCode's MCP client can still connect to a server started externally — the `disabled` flag only controls whether OpenCode spawns the process itself.

5. **`opencode.jsonc` MCP config must point to the long-lived server**

   The Qdrant config in `opencode.jsonc` retains the `command` and `env` fields for reference (the `disabled: true` flag prevents auto-start). This lets users inspect the configuration while omnicode controls the lifecycle.

## Risks / Trade-offs

- [Long-lived MCP daemon consumes memory while OpenCode runs] → The MCP server idles when not indexing. Memory impact is ~200MB for the ONNX model. Acceptable for an optional feature.
- [MCP server may crash or be killed externally] → The runtime does not restart it. Indexing will fail gracefully on next chunk dispatch.
- [Background indexing shares the MCP server with OpenCode] → OpenCode may use the MCP server for queries while indexing is in progress. This is acceptable — Qdrant handles concurrent reads and writes.
- [Startup delay from model download + MCP init] → Model download (if needed) is 30-120s. MCP init is ~5-10s. This delay moves from "after OpenCode starts" to "before OpenCode starts". Acceptable: the user waits once per clean install or cache eviction.

## Migration Plan

No migration needed. The changes are additive and backward compatible. `callQdrantStore()` retains its full signature with an optional `mcpServer` parameter.

## Open Questions

- None resolved.