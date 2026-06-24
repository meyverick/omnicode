## 1. Batch embedding subprocess

- [x] 1.1 Add `batchEmbed(texts, env)` function: spawn `uvx --from mcp-server-qdrant python3 -c "..."` that reads JSON array of texts from stdin, batch-embeds with FastEmbed, outputs JSON array of vectors to stdout
- [x] 1.2 Handle Python subprocess error: log warning, return empty embeddings array, skip storage
- [x] 1.3 Verify the subprocess respects `FASTEMBED_CACHE_PATH` from env

## 2. Qdrant REST API storage

- [x] 2.1 Add `createQdrantCollection(collectionName, dimensions)` function: `PUT /collections/{name}` with 384 dims and Cosine distance
- [x] 2.2 Add `ensureQdrantCollection(collectionName)` function: `GET /collections/{name}`, create if missing
- [x] 2.3 Add `upsertQdrantPoints(collectionName, points)` function: `PUT /collections/{name}/points` with batch of up to 100 points
- [x] 2.4 Add `embedAndStore(chunks, env)` orchestrator: ensure collection exists, batch-embed chunks, upload points in parallel batches of 100

## 3. Replace `callQdrantStore` internals

- [x] 3.1 Rewrite `callQdrantStore()` to call `embedAndStore()` instead of MCP JSON-RPC loop
- [x] 3.2 Remove MCP server spawning: no longer call `startMcpServer` from `indexReferences()`
- [x] 3.3 Update `indexReferences()` error handling for the new non-MCP path
- [x] 3.4 Remove `ownsServer` logic and `server.closed` checks (no longer relevant)

## 4. Tests

- [x] 4.1 Add unit test for `batchEmbed()` with a fake Python subprocess
- [x] 4.2 Add unit test for `ensureQdrantCollection()` / `upsertQdrantPoints()` with a fake HTTP server
- [x] 4.3 Add integration test for `embedAndStore()` end-to-end
- [x] 4.4 Run full test suite and fix any failures

## 5. Final verification

- [x] 5.1 Run `npm pack --dry-run` to confirm package contents
- [x] 5.2 Commit and push