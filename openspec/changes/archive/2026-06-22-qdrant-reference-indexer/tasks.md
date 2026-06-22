## 1. File walking and chunking

- [x] 1.1 Add `walkReferences(dir)` to `lib.js`: recursively walks `./references/`, returns list of file paths with mtime, skips `node_modules/` and hidden dirs
- [x] 1.2 Add `chunkFile(content, filePath)` to `lib.js`: splits markdown on `## ` headings; splits other files by line count (50 lines)
- [x] 1.3 Add `loadIndexState(statePath)` and `saveIndexState(statePath, state)` to `lib.js`: reads/writes `.omnicode-index.json` for incremental indexing

## 2. MCP interaction and indexing

- [x] 2.1 Add `callQdrantStore(chunks, env)` to `lib.js`: starts `uvx mcp-server-qdrant` as child process, sends JSON-RPC `initialize`, `tools/list`, `tools/call` (qdrant-store) for each chunk, then shutdown
- [x] 2.2 Add `indexReferences(refsDir, qdrantConfig)` to `lib.js`: orchestrates walk → filter by mtime → chunk → call store → save state
- [x] 2.3 Wire `indexReferences` into `omnicode --index` handler in `omnicode.js` (replace the current placeholder that just configures)

## 3. Background startup indexing

- [x] 3.1 Spawn indexer as async background task after opencode launches in `runRuntime()`
- [x] 3.2 Indexer runs concurrently with opencode (via Promise.all pattern)

## 4. Tests

- [x] 4.1 Add tests for `walkReferences()` (finds files, skips node_modules)
- [x] 4.2 Add tests for `chunkFile()` (splits markdown by heading, splits plain text by line count)
- [x] 4.3 Run the test suite and fix any failures (48 tests passing)

## 5. Final verification

- [x] 5.1 Run `npm pack --dry-run` to confirm package contents
- [x] 5.2 Commit and push
