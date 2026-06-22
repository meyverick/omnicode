## Why

When `mcp-server-qdrant` starts, FastEmbed loads the `all-MiniLM-L6-v2` ONNX model from a local cache directory (default `/tmp/fastembed_cache`). If that cache is incomplete or corrupted (e.g., interrupted download, `/tmp` cleared by reboot), the MCP server crashes on initialization with a misleading `NoSuchFile` error. Users see a generic "MCP server did not initialize in time" failure with no guidance on the root cause or how to fix it. Additionally, `/tmp` is ephemeral; the model cache is lost on every reboot, forcing a re-download each time.

## What Changes

- Add a `verifyFastEmbedModel()` function that checks whether the FastEmbed model cache directory contains the required `model.onnx` file **and** that the file is not corrupted (minimum size threshold + load test via `passage_embed(['warmup'])`).
- If the model is missing, truncated, or corrupted, automatically re-download the model by invoking `uvx --from mcp-server-qdrant python3 -c "from fastembed import TextEmbedding; TextEmbedding('sentence-transformers/all-MiniLM-L6-v2').passage_embed(['warmup'])"` after deleting the corrupted cache.
- Relocate FastEmbed from `/tmp/fastembed_cache` to a persistent cache path by setting `FASTEMBED_CACHE_PATH` for validation, download, and MCP server startup.
- Call `verifyFastEmbedModel()` before spawning the MCP server in both `indexReferences()` and the runtime startup path (before `indexReferences()` runs in the background).
- Log clear status messages: `[omnicode] verifying embedding model...`, `[omnicode] embedding model OK`, `[omnicode] embedding model corrupted, re-downloading...`, `[omnicode] embedding model downloaded`.
- If download fails, log a clear error with remediation instructions and skip indexing gracefully instead of crashing.

## Capabilities

### New Capabilities

- `fastembed-model-preflight`: Verifies the FastEmbed model cache before MCP server startup; re-downloads the model automatically if missing or corrupted.

### Modified Capabilities

- (None — existing indexing and runtime behavior is unchanged when the model is present.)

## Impact

- `src/installer/lib.js`: Add FastEmbed cache helpers and `verifyFastEmbedModel()` function; call it from `indexReferences()` before spawning the MCP server and pass `FASTEMBED_CACHE_PATH` to MCP.
- `src/bin/omnicode-runtime.js`: Call `verifyFastEmbedModel()` before background indexing in the runtime path.
- `test/lib.test.js`: Add tests for `verifyFastEmbedModel()` (model present, model missing, download failure).
