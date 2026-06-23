## 1. Collection ID Resolution & Configuration

- [x] 1.1 In `src/installer/lib.js`, import `randomUUID` from `node:crypto`.
- [x] 1.2 Implement a `resolveCollectionName()` function that checks for a `.qdrant` file in `process.cwd()`. If found, read and return the collection ID. If missing, generate a new UUID prefixed with `references-`, write it to `.qdrant`, and return it.
- [x] 1.3 Update `generateQdrantConfig()` in `src/installer/lib.js` to remove `QDRANT_LOCAL_PATH` and inject `QDRANT_URL: "http://localhost:6333"`. Ensure `COLLECTION_NAME` is set using `resolveCollectionName()`.
- [x] 1.4 Update `getQdrantStoreEnv()` in `src/installer/lib.js` to propagate `QDRANT_URL` from the config into the environment map.

## 2. Background Indexer Lifecycle Isolation

- [x] 2.1 In `src/bin/omnicode-runtime.js`, remove the explicit `qdrantServer = await startMcpServer(...)` initialization before `indexReferences`.
- [x] 2.2 Update the call to `indexReferences` to pass `null` as the third parameter (`mcpServer`), so the indexer function strictly owns and spins up its own MCP server proxy.
- [x] 2.3 Verify `indexReferences` in `src/installer/lib.js` properly shuts down the MCP server in its `finally` block when `ownsServer` is true.
- [x] 2.4 In `src/bin/omnicode-runtime.js`, remove `qdrantServer` cleanup from the `launchOpencode` closure, `process.on('exit')`, and signal handlers, as Opencode now manages its own proxy and the indexer cleans up itself.

## 3. Docker Lifecycle Management

- [x] 3.1 In `src/installer/lib.js`, add helper functions `startQdrantContainer()` and `stopQdrantContainer()`. The start function should dynamically resolve the absolute path via `join(getDataDir(), "qdrant-storage")` and run `docker run -d --name omnicode-qdrant -p 6333:6333 -v <absolute_path>:/qdrant/storage qdrant/qdrant`, and include a polling loop (e.g., `fetch('http://localhost:6333/readyz')` or `/`) to wait for the HTTP service to become fully ready before returning.
- [x] 3.2 In `src/bin/omnicode-runtime.js`, await `startQdrantContainer()` concurrently with `waitForOmniroute()`.
- [x] 3.3 In `src/bin/omnicode-runtime.js`, update `stopOmnirouteIfIdle()` to also invoke `stopQdrantContainer()` when the last opencode process exits and it shuts down omniroute.
