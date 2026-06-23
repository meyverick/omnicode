# How it works

## Runtime flow

When you run `omnicode`, the entrypoint at `src/bin/omnicode.js`:

1. Verifies `opencode`, `omniroute` are on `PATH`.
2. Resolves the session launch mode from the OpenCode SQLite DB.
3. Calls the Node.js runtime module (`src/bin/omnicode-runtime.js`).

The runtime then:

1. Initializes GrayMatter and OpenSpec quietly (logs to `~/.local/share/omnicode/`).
2. Starts `omniroute --no-open` in the background, or reuses an existing instance.
3. Starts a **Qdrant Docker container** (`qdrant/qdrant`) for vector storage, if Docker is available.
4. Configures the Qdrant MCP server in `opencode.jsonc` with inline environment variables.
5. Launches OpenCode with the resolved session argument.
6. Begins **background indexing** of `./references/` using an async file walker with per-file read and chunking.
7. On OpenCode exit, stops the Qdrant container and cleans up OmniRoute if no other sessions remain.

## Qdrant indexing pipeline

The indexing flow in `src/installer/lib.js`:

1. **`walkReferencesAsync()`** — async generator that recursively walks `./references/` using `fsPromises.readdir`/`stat`. Skips hidden files and `node_modules`.
2. **`chunkFile()` / MinerU / tree-sitter** — splits files into chunks. Markdown uses heading-based splitting. PDFs/images use MinerU OCR. Code files use tree-sitter AST-based structural chunking.
3. **Batch processing** — files are processed in batches of 100 to limit memory. Each batch is sent to Qdrant via `callQdrantStore()`.
4. **`callQdrantStore()`** — sends chunks as JSON-RPC `tools/call` requests to `mcp-server-qdrant`, which embeds them via FastEmbed and stores in Qdrant.
5. **State tracking** — `index.json` tracks file mtimes per batch. State is saved atomically (write to `.tmp`, rename).

### Crash recovery

- Stale Qdrant `.lock` files and WAL journals are cleaned before MCP startup.
- Ctrl+C during indexing sets a `cancelled` flag, stops the MCP server, and saves partial state.
- `--force-reindex` wipes the `.qdrant/` directory and all state before re-indexing.

## Background OmniRoute lifecycle

OmniRoute is started as a detached Node.js child process.

- Logs and PID files: `~/.local/share/omnicode/`.
- If OmniRoute is already running, the existing process is reused.
- Only the process started by `omnicode` is stopped when OpenCode exits and no other sessions remain.

## Session resolution

- `-s <id>` → launches `opencode -s <id>` directly.
- `-c` or no args + existing session → reads latest session ID from OpenCode's SQLite DB.
- No args + no session → launches `opencode` with no session flag.
