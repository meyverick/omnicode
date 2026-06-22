## Context

FastEmbed stores the `all-MiniLM-L6-v2` ONNX model in a local cache (default `/tmp/fastembed_cache`). The `mcp-server-qdrant` MCP server calls `TextEmbedding(model_name)` with no `cache_dir` override, but FastEmbed respects the `FASTEMBED_CACHE_PATH` environment variable. The default cache lives in `/tmp`, which can be cleared by reboots or OS cleanup. When the `model.onnx` file is missing but the snapshot directory exists (partial download), FastEmbed skips re-download and crashes with `NoSuchFile`. This surfaces as an opaque "MCP server did not initialize in time" error.

The current flow in `indexReferences()` (lib.js:285) spawns the MCP server directly without any model validation. The runtime path (`omnicode-runtime.js:190`) fires `indexReferences()` in the background, so the failure is silent.

## Goals / Non-Goals

**Goals:**
- Detect a missing or corrupted FastEmbed model cache before spawning the MCP server.
- Automatically re-download the model if the cache is invalid.
- Relocate FastEmbed model storage to a persistent cache directory through `FASTEMBED_CACHE_PATH`.
- Log clear status messages so users understand what is happening.
- Gracefully skip indexing if download fails, instead of crashing or hanging.

**Non-Goals:**
- Downloading the model from a custom mirror or offline source.

## Decisions

1. **Two-stage validation: size check + load test**

   Stage 1 (fast): Check that `model.onnx` exists and is larger than 80MB (expected ~90MB). A truncated or corrupted file will be significantly smaller. This is instant.

   Stage 2 (thorough): If the size check passes, run `passage_embed(['warmup'])` via `uvx` to verify the model loads correctly in ONNX Runtime. This takes 5-10s but catches files that exist at the right size but are internally corrupted.

   If either stage fails, delete the cache directory and re-download.

   Alternative considered: Existence check only — rejected because a truncated download leaves a `model.onnx` that exists but crashes on load.

2. **Use persistent cache via `FASTEMBED_CACHE_PATH`**

   Use a platform-aware persistent cache directory: `~/.cache/fastembed` on Unix-like systems and `%LOCALAPPDATA%\\fastembed` on Windows. Set `FASTEMBED_CACHE_PATH` on every validation, download, and MCP server subprocess.

   `FASTEMBED_CACHE_PATH` support was verified with `TextEmbedding(...).model.cache_dir`, so this change treats it as an implementation assumption rather than a task to investigate.

   Alternative considered: Continue using `/tmp/fastembed_cache` and repair on every run — rejected because reboot or OS cleanup would keep causing unnecessary downloads.

3. **Re-download via `uvx` subprocess**

   If the model is missing or corrupted, run `uvx --from mcp-server-qdrant python3 -c "from fastembed import TextEmbedding; TextEmbedding('sentence-transformers/all-MiniLM-L6-v2').passage_embed(['warmup'])"` as a subprocess with `FASTEMBED_CACHE_PATH` set to the persistent cache. This is the same command FastEmbed uses internally, and it populates the configured cache.

   Alternative considered: Direct `curl` download of the `.onnx` from HuggingFace — rejected because FastEmbed also needs tokenizer/config files, and a partial cache might be missing those too. A full re-download is safer.

4. **Call `verifyFastEmbedModel()` from `indexReferences()` only**

   The preflight runs inside `indexReferences()` before spawning the MCP server. The runtime path (`omnicode-runtime.js:190`) already calls `indexReferences()`, so no separate call is needed in the runtime.

   Alternative considered: Separate call in the runtime before `indexReferences()` — rejected as redundant since `indexReferences()` already gates the MCP spawn.

5. **120-second download timeout**

   The model is ~90MB. A 120-second timeout is generous for most connections. If it times out, log the error and skip indexing.

6. **Delete corrupted model cache before re-download**

   If validation fails, delete the cached model directory before re-downloading. This avoids FastEmbed's "snapshot exists, skip download" logic that causes the original crash while preserving unrelated cache directories if they exist.

## Risks / Trade-offs

- [Warmup validation adds startup latency] → Only runs when indexing has chunks to store; it prevents a later MCP startup failure and uses the persistent cache on subsequent runs.
- [Download adds 30-120s to first run] → Only triggers when model is missing or corrupted. Subsequent runs reuse the persistent cache.
- [`uvx` might not be installed] → `detectQdrantMcp()` already gates on `uvx` existence before indexing. No additional check needed.
- [Network failure during download] → 60s timeout + error message with manual remediation instructions.

## Migration Plan

No migration needed. The preflight runs automatically on every `omnicode index` and background indexing call. Existing `/tmp/fastembed_cache` contents are not migrated; the model is downloaded into the persistent cache on first use.

## Open Questions

- None.
