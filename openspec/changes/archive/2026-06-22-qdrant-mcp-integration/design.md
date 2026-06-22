## Context

Three open-source components are already in the project:
- `./references/mcp-server-qdrant/` — the Python MCP server for Qdrant
- `./references/twitch_docs/` — a Qdrant test project with indexing logic
- `uvx` — the recommended runner for Python MCP servers

The Qdrant MCP server supports **local mode** (`QDRANT_LOCAL_PATH`) which uses `qdrant-client`'s embedded storage — no external Qdrant daemon needed. It stores vectors on disk at a configurable path and provides `qdrant-store` (index) and `qdrant-retrieve` (search) tools via the MCP protocol.

## Goals / Non-Goals

**Goals:**

- Detect `uvx` and `uvx mcp-server-qdrant` availability.
- Detect `./references/` folder at project cwd.
- Generate `./opencode.jsonc` with the Qdrant MCP entry if missing, or merge the entry if the file exists.
- Index `./references/` into Qdrant on startup (non-blocking background).
- Add `omnicode index` to re-index without restarting.
- Use Qdrant local mode (`QDRANT_LOCAL_PATH`) — no external daemon.

**Non-Goals:**

- Installing Python or `uvx` for the user (they install it themselves, like omniroute).
- Starting/stopping a separate Qdrant process (local mode handles everything inside the MCP server).
- Changing the public CLI interface beyond adding `omnicode index`.

## Decisions

1. **Local mode (`QDRANT_LOCAL_PATH`)**

   No external Qdrant daemon. The MCP server stores vectors at `./.qdrant/` (project root). This keeps indexes per-project and avoids cross-project pollution.

2. **`uvx mcp-server-qdrant` as the command**

   The `uvx` runner auto-downloads and caches the package on first use. No separate `pip install` step. `omnicode` checks `commandExists("uvx")` first, then probes `uvx mcp-server-qdrant --help` to confirm resolution.

3. **Project-local `opencode.jsonc`**

   `omnicode` reads/writes `./opencode.jsonc` in the current working directory. If the file doesn't exist, it creates one with the default schema and the Qdrant MCP entry. If it exists, it merges the entry into the `mcp` field (preserving any existing entries). No global config modification.

4. **Non-blocking startup index**

   Indexing `./references/` runs in the background after opencode launches, same pattern as graymatter/openspec init. The user can start working immediately while indexing completes.

5. **`omnicode index` subcommand**

   A one-shot mode that re-indexes `./references/` without starting the full runtime. Useful after updating references or when the user wants to refresh without restarting.

6. **Qdrant config defaults**

   | Setting | Value |
   |---|---|
   | `QDRANT_LOCAL_PATH` | `./.qdrant/` (project root) |
   | `COLLECTION_NAME` | `references` |
   | `EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` |

   These can be overridden via environment variables if needed.

## Risks / Trade-offs

- **`uvx` not installed**: If `uvx` is missing, Qdrant MCP is skipped silently — no error, no config change. User installs `uvx` later, re-runs `omnicode` to pick it up.
- **`./opencode.jsonc` already has MCP entries**: Merge preserves existing entries. Only the Qdrant entry is added/updated.
- **Python binary not found**: `uvx` requires Python 3.10+. If Python is missing, `uvx` will fail. This is the user's responsibility to install (like omniroute).
- **Indexing large `./references/`**: Could take minutes. Background execution avoids blocking startup. `omnicode index` can be re-run if the user wants to wait.

## Migration Plan

1. Add Qdrant detection and config generation to `omnicode-runtime.js`.
2. Add `omnicode index` argument handling to `omnicode.js`.
3. Add indexing logic (crawl `./references/`, embed, store via MCP server or qdrant-client).
4. Add tests for config generation and indexing.
5. Update `package.json` if needed.
6. Test end-to-end.
