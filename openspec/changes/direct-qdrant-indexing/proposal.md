## Why

The current indexer spawns a full MCP server (`uvx mcp-server-qdrant` — a Python process with FastEmbed + uvx + JSON-RPC stdio) for every indexing session. This adds ~200MB RSS overhead, requires MCP process lifecycle management (PID file, lock cleanup, duplicate detection), and introduces env var propagation issues between OpenCode-spawned and omnicode-spawned servers. Since a Qdrant Docker container already runs at `http://localhost:6333`, embedding + storing chunks can be done with a minimal Python script that POSTs vectors directly to Qdrant's REST API — no MCP server needed for indexing. The MCP server is still required for querying (`qdrant-find` via OpenCode), but indexing should bypass it entirely.

## What Changes

- Replace `callQdrantStore()` — remove the MCP JSON-RPC loop; use a lightweight Python subprocess that batch-embeds chunks and stores via Qdrant REST API.
- Add `embedAndStore(chunks, env)` — spawns `uvx --from mcp-server-qdrant python3 ...` to batch-embed the chunks array, then returns embeddings. Node.js POSTs the vectors + payloads to `http://localhost:6333/collections/{name}/points`.
- Keep `startMcpServer` / `stopMcpServer` for the query path only (OpenCode still needs an MCP server for `qdrant-find`).
- Remove MCP server spawning from `indexReferences()` and `callQdrantStore()`.
- Remove `cleanQdrantStaleData()`, `getQdrantPidFile()`, `isQdrantRunning()` if no longer needed.

## Capabilities

### New Capabilities

- `direct-qdrant-indexing`: Indexes reference chunks by embedding via a lightweight Python subprocess and storing directly to Qdrant HTTP API, bypassing the MCP server entirely.

### Modified Capabilities

- (None — indexing behavior is unchanged from the caller's perspective.)

## Impact

- `src/installer/lib.js`: Replace `callQdrantStore()` internals. Remove MCP spawning from `indexReferences()`. Add `embedAndStore()`.
- `src/bin/omnicode.js`: Remove MCP PID conflict check if `isQdrantRunning` is removed.
- `test/`: Update tests for the new store path.
- `opencode.jsonc`: Unchanged — MCP config is still needed for queries.