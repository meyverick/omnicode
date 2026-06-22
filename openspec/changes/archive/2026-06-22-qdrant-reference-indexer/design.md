## Context

The `qdrant-mcp-integration` change added config generation and `--index` scaffolding but deferred the actual file crawling and indexing. The Qdrant MCP server provides `qdrant-store` (store text) and `qdrant-retrieve` (search) tools via the MCP protocol (JSON-RPC over stdio). The indexer needs to call `qdrant-store` for each file chunk.

The `./references/twitch_docs/` project has a heading-based chunker (`src/chunker.ts`) that splits files by markdown headings. This pattern is adapted for local file indexing.

## Goals / Non-Goals

**Goals:**

- Recursively walk `./references/` and collect text files (`.md`, `.txt`, `.json`, `.yaml`, `.yml`, `.ts`, `.js`, `.sh`).
- Chunk each file by markdown heading or by line count for non-markdown files.
- Start the Qdrant MCP server as a child process, send `qdrant-store` requests via JSON-RPC for each chunk, then stop the server.
- Track indexed files by modification time using a simple `.omnicode-index.json` state file — skip unchanged files.
- Wire into `omnicode index` and the background startup task.
- Run **without** the twitch_docs code duplicated — use a simple inline chunker written in Node.js.

**Non-Goals:**

- Reusing the twitch_docs crawler (designed for websites, not local files).
- Using Docker or external services (everything runs via `uvx mcp-server-qdrant`).
- Implementing fancy embeddings or ColBERT — the MCP server's default model handles this.

## Decisions

1. **Inline Node.js chunker**

   A simple function that splits markdown on `## ` headings and other files by line count (50 lines per chunk). No need to import the twitch_docs TypeScript chunker — keeping it simple avoids a TypeScript compilation step.

2. **MCP JSON-RPC over stdio**

   The MCP protocol uses JSON-RPC over stdin/stdout. To call `qdrant-store`, the indexer:
   - Starts `uvx mcp-server-qdrant` as a child process with the same env vars from the config
   - Sends an `initialize` request
   - Sends `tools/list` to discover the `qdrant-store` tool
   - Sends `tools/call` for each chunk with `{ name: "qdrant-store", arguments: { information: chunkText } }`
   - Sends a `shutdown`/`exit` notification
   - Waits for the process to exit

3. **Incremental indexing via `.omnicode-index.json`**

   A state file at the project root that maps file paths to their last modification time. The indexer skips files whose mtime hasn't changed. On each run, it updates the file. This makes `omnicode index` efficient for re-indexing after editing a few files.

4. **Background startup indexing**

   After opencode launches, spawn the indexer as a child process via `spawn("node", [indexerScript], { detached: true, stdio: "ignore" }).unref()`. The indexer runs independently and doesn't block opencode.

5. **`omnicode index` mode**

   Runs the same indexer but in the foreground with progress output. The user sees which files are being indexed and can wait for completion.

## Risks / Trade-offs

- **MCP JSON-RPC is undocumented for direct use**: The protocol is designed for MCP clients (like OpenCode). Calling it directly from Node.js may require experimentation. Fallback: use the `qdrant-client` Python library directly via a subprocess.
- **Large `./references/`**: Could take minutes. Background execution avoids blocking.
- **Model download time**: The first run downloads the embedding model via `uvx`. Subsequent runs are fast.

## Migration Plan

1. Add `chunkFile(content, filePath)` to `lib.js`.
2. Add `walkReferences(dir)` to `lib.js`.
3. Add `callQdrantStore(chunks, env)` to `lib.js` (MCP JSON-RPC over stdio).
4. Add `indexReferences(dir)` to `lib.js` (orchestrator: walk, chunk, call store, update state).
5. Wire `indexReferences` into `omnicode --index` handler.
6. Wire background indexer into `runRuntime()`.
7. Add tests for chunking and file walking.
8. Run test suite, fix failures.
