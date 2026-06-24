## Context

The current indexing path:

```
indexReferences()
  → startMcpServer()       # spawns uvx mcp-server-qdrant (Python, ~200MB)
  → callQdrantStore()
    → for each chunk:
        server.request("qdrant-store")   # JSON-RPC over stdio
        → mcp-server-qdrant embeds + stores in Qdrant
  → stopMcpServer()
```

This requires spawning a full MCP server just to call `qdrant-store` in a loop. The MCP server (FastMCP + JSON-RPC) adds ~100ms overhead per chunk for protocol framing, and the Python process holds the ONNX model (~100MB) plus the Qdrant client connection.

Since a Qdrant Docker container already runs at `http://localhost:6333`, the embedding is the only part that needs Python (FastEmbed). Storage can be a simple HTTP POST.

## Goals / Non-Goals

**Goals:**
- Replace the MCP JSON-RPC loop in `callQdrantStore()` with a batch-embed Python subprocess + direct Qdrant HTTP API calls.
- Remove MCP server spawning from the indexing path (`indexReferences()` and `callQdrantStore()`).
- Keep `startMcpServer` / `stopMcpServer` for the query path (OpenCode's `qdrant-find` tool).

**Non-Goals:**
- Changing how OpenCode spawns or uses the MCP server for queries.
- Changing the chunking, file walking, or state management logic.
- Removing Qdrant's REST API dependency (Docker container is still required).

## Decisions

1. **Batch embed via Python subprocess, store via Node.js HTTP**

   The Python subprocess reads a JSON array of texts from stdin, batch-embeds them with FastEmbed, and writes the embeddings array to stdout. Node.js receives the embeddings and POSTs them to Qdrant's REST API at `localhost:6333`.

   This avoids per-chunk JSON-RPC overhead while keeping FastEmbed access. The Python process is spawned once per batch, embeds all chunks in a single call, and exits.

2. **Upsert points via Qdrant REST API**

   Qdrant's `PUT /collections/{name}/points` accepts an array of points. Each point is:
   ```json
   {
     "id": <uuid>,
     "vector": [384 floats],
     "payload": { "source": "/path/to/file", "text": "chunk content" }
   }
   ```
   Node.js sends this via `fetch()` (Node 22+ built-in). No Python HTTP client needed.

3. **Collection auto-creation**

   Before the first batch, check if the collection exists via `GET /collections/{name}`. If not, create it via `PUT /collections/{name}` with the correct vector config (384 dimensions, Cosine distance).

4. **Concurrency**

   Embedding is sequential (FastEmbed processes one batch synchronously). Storage upload can be parallel — send points in chunks of 100 per POST. Each POST is independent.

5. **Preserve MCP server for queries**

   `startMcpServer` and `stopMcpServer` remain exported for OpenCode's config, but are no longer called from `indexReferences` or `callQdrantStore`. The `opencode.jsonc` `disabled: false` config handles the query MCP server lifecycle.

## Risks / Trade-offs

- [Batch embedding is slower for small sets] → Acceptable; for 84710 chunks, batch embedding is faster because FastEmbed processes vectors as a matrix, not one at a time.
- [Python subprocess must load model on each invocation] → Only invoked once per `indexReferences` call. The model stays cached in the subprocess for the batch duration.
- [Qdrant HTTP API adds network latency over localhost] → ~1ms per POST vs ~50ms per JSON-RPC call through stdio. Net improvement.
- [No more MCP server env var propagation issues] → The embedding subprocess inherits `FASTEMBED_CACHE_PATH` from Node, solving the stale env problem.

## Migration Plan

No migration needed. The existing `callQdrantStore` signature is preserved. Callers pass the same arguments. Internal behavior changes transparently.

## Open Questions

- Should we keep `cleanQdrantStaleData()` as a safety measure even though MCP server no longer accesses local storage? (Yes — can be reused if the Docker container's storage becomes stale.)
