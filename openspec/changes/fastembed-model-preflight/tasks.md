## 1. Model verification function

- [x] 1.1 Add `getFastEmbedCacheDir()` helper: resolve persistent cache path (`~/.cache/fastembed` on Unix, `%LOCALAPPDATA%\\fastembed` on Windows with temp fallback)
- [x] 1.2 Add `getFastEmbedModelPath()`: return the full `model.onnx` path inside the cache snapshot directory (glob for `models--qdrant--all-MiniLM-L6-v2-onnx/snapshots/*/model.onnx`)
- [x] 1.3 Add `verifyFastEmbedModel()` two-stage validation with `FASTEMBED_CACHE_PATH` set: (1) check `model.onnx` exists and size > 80MB; (2) run `passage_embed(['warmup'])` load test via `uvx` subprocess with 30s timeout to verify ONNX Runtime can load it
- [x] 1.4 If validation fails (missing, truncated, or corrupted), delete the cached model directory, re-download via `uvx --from mcp-server-qdrant python3 -c "..."` with `FASTEMBED_CACHE_PATH` set and 120s timeout, return boolean
- [x] 1.5 Log status messages: `verifying embedding model...`, `embedding model OK`, `embedding model corrupted, re-downloading...`, `embedding model downloaded`, error with remediation instructions on failure

## 2. Integration

- [x] 2.1 Call `verifyFastEmbedModel()` at the start of `indexReferences()` before spawning the MCP server; skip indexing gracefully if it returns false
- [x] 2.2 Pass `FASTEMBED_CACHE_PATH` to `callQdrantStore()` so the MCP server uses the persistent cache
- [x] 2.3 Export `verifyFastEmbedModel` from `lib.js` and import in `omnicode.js` for standalone `omnicode index` subcommand if needed

## 3. Tests

- [x] 3.1 Add unit tests for `getFastEmbedCacheDir()` (returns expected platform path)
- [x] 3.2 Add unit test for `verifyFastEmbedModel()` when model exists and is valid (returns true, no download)
- [x] 3.3 Add unit test for `verifyFastEmbedModel()` when model missing (triggers download, returns true on success)
- [x] 3.4 Add unit test for `verifyFastEmbedModel()` when model exists but is truncated (size < 80MB, triggers re-download)
- [x] 3.5 Add unit test for `verifyFastEmbedModel()` when model exists but load test fails (corrupted ONNX, triggers re-download)
- [x] 3.6 Add unit test verifying `FASTEMBED_CACHE_PATH` is included in the MCP store environment
- [x] 3.7 Run full test suite and fix any failures

## 4. Final verification

- [x] 4.1 Run `npm pack --dry-run` to confirm package contents
- [ ] 4.2 Commit and push
