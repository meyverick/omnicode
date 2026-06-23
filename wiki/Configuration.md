# Configuration

## OpenCode config

`omnicode` generates and manages `opencode.jsonc` in the project root. The Qdrant MCP entry is configured with inline shell environment variables passed to `sh -c` to ensure OpenCode passes them correctly when spawning the MCP server.

```jsonc
"qdrant": {
  "type": "local",
  "enabled": true,
  "disabled": false,
  "command": ["sh", "-c", "EMBEDDING_MODEL=... COLLECTION_NAME=... QDRANT_URL=http://localhost:6333 ... uvx mcp-server-qdrant"],
  "env": {
    "QDRANT_URL": "http://localhost:6333",
    "COLLECTION_NAME": "references-<uuid>",
    "EMBEDDING_MODEL": "BAAI/bge-small-en-v1.5",
    "FASTEMBED_CACHE_PATH": "/home/<user>/.cache/fastembed",
    "QRANT_NUM_THREADS": "1",
    "QRANT_INDEX_CONCURRENCY": "1"
  }
}
```

## Environment overrides

| Variable | Default | Description |
|---|---|---|
| `QRANT_NUM_THREADS` | auto (25% of CPU cores) | ONNX Runtime thread limit |
| `QRANT_INDEX_CONCURRENCY` | auto (25% of CPU cores) | Concurrent chunk requests |

Collection names include a UUID to prevent collisions across projects sharing the same Qdrant server.

## Paths touched

| Path | Purpose |
|---|---|
| `~/.local/share/omnicode/omniroute.log` | OmniRoute background log |
| `~/.local/share/omnicode/graymatter-init.log` | GrayMatter init output |
| `~/.local/share/omnicode/openspec-init.log` | OpenSpec init output |
| `~/.local/share/omnicode/omniroute.pid` | OmniRoute PID |
| `~/.local/share/omnicode/qdrant.pid` | Qdrant MCP PID |
| `~/.local/share/omnicode/qdrant-storage/` | Qdrant Docker volume |
| `./.qdrant/index.json` | Indexed file state |
| `./.qdrant/collection-name` | Collection UUID |
| `./.qdrant/opencode.jsonc` | MCP config |

## Package structure

- `src/bin/omnicode.js` — CLI entrypoint.
- `src/bin/omnicode-runtime.js` — Node.js runtime (OmniRoute lifecycle, Qdrant container, background indexing).
- `src/installer/lib.js` — shared helpers (file walking, chunking, MCP lifecycle, state management).
- `src/installer/AGENTS.template.md` — Qdrant MCP agent instructions.
- `src/installer/mineru-client.js` — MinerU OCR client for PDF/image processing.
- `src/installer/tree-sitter.js` — structural code chunking.
- `test/` — package tests (65 tests).
- `wiki/` — technical wiki tracked in the main repository.
- `references/` — upstream reference repositories as Git submodules.
