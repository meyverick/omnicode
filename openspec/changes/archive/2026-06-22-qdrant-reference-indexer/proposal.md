## Why

The Qdrant MCP integration added detection, config generation, and the `--index` subcommand scaffolding, but the actual file crawling and indexing logic was deferred. Without an indexer, the `./.qdrant/` database stays empty and the Qdrant MCP server has nothing to serve. This change implements the indexer: walking `./references/`, reading text and markdown files, chunking them, and storing vectors via the MCP server's `qdrant-store` tool.

The `./references/twitch_docs/` project demonstrates the chunking and MCP interaction pattern (heading-based chunking, `qdrant-store` tool calls). This change adapts that approach for local file indexing.

## What Changes

- Implement file crawler: recursively walk `./references/`, collect `.md`, `.txt`, and other text files.
- Implement chunker: split each file by heading or by content size into chunks suitable for embedding.
- Implement indexer: start the Qdrant MCP server as a child process, call `qdrant-store` for each chunk via JSON-RPC over stdio, then stop the server.
- Wire the indexer into both `omnicode index` (standalone) and the startup background task.
- Handle incremental indexing (skip files already indexed based on file modification time).

## Capabilities

### New Capabilities

- `reference-indexer`: Crawls `./references/`, chunks files, stores vectors in Qdrant via MCP server tools. Runs on startup (background) and via `omnicode index`.

### Modified Capabilities

- (None — the `qdrant-mcp-auto-config` capability from the previous change is extended to trigger indexing automatically.)

## Impact

- `src/bin/omnicode-runtime.js`: Add indexing call after opencode launches (background).
- `src/bin/omnicode.js`: Wire `--index` to call the indexer instead of just configuring.
- `src/installer/lib.js`: Add `indexReferences()` function with crawling, chunking, and MCP interaction logic.
- `test/`: Tests for file walking, chunking, and MCP interaction.
