## Why

AI agents working on this project need access to the documentation in `./references/` (upstream codebases, Qdrant test projects, etc.). Currently there's no way for them to search across these files semantically. By integrating Qdrant MCP into `omnicode`, agents can query indexed documentation via vector search without leaving OpenCode.

## What Changes

- Detect if `uvx` is on PATH and `uvx mcp-server-qdrant` resolves.
- Detect if `./references/` exists at the project root (where `omnicode` is run).
- Create or update `./opencode.jsonc` with the Qdrant MCP server entry in the `mcp` field.
- Index `./references/` into Qdrant on startup (background, non-blocking).
- Add `omnicode index` subcommand to re-index without restarting.
- Use Qdrant local mode (`QDRANT_LOCAL_PATH`) at `./.qdrant/` via `qdrant-client` — no external Qdrant daemon needed. Project-local storage keeps indexes per-project.

## Capabilities

### New Capabilities

- `qdrant-mcp-auto-config`: Detects `uvx` + `mcp-server-qdrant`, creates/updates `opencode.jsonc` with the MCP entry.
- `reference-indexer`: Crawls `./references/`, embeds files, stores in Qdrant. Runs on startup and via `omnicode index`.

### Modified Capabilities

- (None — existing capabilities unchanged.)

## Impact

- `src/bin/omnicode.js`: Add `omnicode index` argument handling, add Qdrant auto-config to startup flow.
- `src/bin/omnicode-runtime.js`: Add Qdrant MCP config step, add indexing step, update lifecycle.
- `src/installer/lib.js`: Add helpers for `opencode.jsonc` read/write/merge.
- `test/`: Tests for Qdrant config generation and `omnicode index`.
- `package.json`: Description and keywords may be updated.
