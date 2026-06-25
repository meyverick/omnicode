## Context

The background indexer in `src/installer/lib.js` currently decides what to index by comparing each file's `mtimeMs` to the value stored in `.qdrant/index.json`. It runs on every `omnicode` startup from `src/bin/omnicode-runtime.js`. This design is simple but fragile:

- `mtime` is not a content signature. Tools that preserve timestamps (`cp -p`, `git checkout`, submodule updates) can leave modified files looking unchanged.
- Deleted files are removed from the JSON state but their embeddings remain in Qdrant, polluting semantic search.
- The state file is updated before vectors are confirmed in Qdrant, so a crash can mark files as indexed when they are not.
- Users have no visibility into what the indexer detected or why it skipped work.

References are now git submodules (managed by `scripts/sync-references.js`), so we can also use git metadata to detect changes more reliably than filesystem timestamps.

## Goals / Non-Goals

**Goals:**
- Detect added, modified, and deleted reference files reliably on every startup.
- Remove embeddings for deleted files from Qdrant.
- Make the indexer observable via startup logging and a dry-run mode.
- Update local index state only after successful Qdrant writes.
- Provide a migration path from the old state format to the new format.

**Non-Goals:**
- Real-time monitoring of `./references/` while omnicode is running.
- Deduplicating content across files.
- Changing chunking strategy or embedding model.
- Solving Qdrant unavailability or Docker slowness.

## Decisions

1. **Hybrid change detection**
   - For files inside a git submodule, compare the submodule's current commit SHA in addition to the file hash. If the submodule commit changed, re-index all files in that submodule. This catches bulk updates from `sync-references.js`.
   - For all files, compute a fast content hash (SHA-256 of file bytes). A hash change always means re-index, regardless of `mtime`.
   - Retain `mtime` as a cheap short-circuit: if `mtime` is unchanged and hash is unchanged, skip. This avoids hashing on every start when nothing changed.

2. **Per-file state shape**
   - Old: `{ "/path/to/file.md": 1712345678901 }`
   - New: `{ "version": 2, "files": { "/path/to/file.md": { "mtimeMs": 1712345678901, "hash": "sha256:...", "submoduleCommit": "abc123" } }, "submoduleCommits": { "references/opencode": "abc123" } }`
   - `loadIndexState()` returns an empty object on missing file and normalizes to the new shape. `saveIndexState()` always writes the new shape.

3. **Deletion cleanup**
   - Collect all current file paths from `walkReferencesAsync()`.
   - Compute `deletedPaths = Object.keys(state.files) - currentPaths`.
   - Call a new `deleteQdrantPointsBySource(collectionName, sources)` helper that POSTs `{ filter: { must: [{ key: "source", match: { any: sources } }] } }` to `/collections/{name}/points/delete`.
   - Remove deleted entries from `state.files` immediately after successful deletion.

4. **Atomic batch state updates**
   - Move `saveIndexState()` calls from after each file loop into `flushBatch()`: only save after `embedAndStore()` succeeds.
   - If a batch fails, the next startup will re-detect those files as needing indexing because their hash is still not in the saved state.

5. **Dry-run / status mode**
   - Add `options.dryRun` to `indexReferences()`.
   - In dry-run mode, compute the change set, log summary, skip `embedAndStore()`, skip deletion writes, and return the change summary.
   - Expose `--index-status` in `src/bin/omnicode.js` and pass it through `runRuntime()`.

6. **Schema versioning**
   - State `version: 2`. If `loadIndexState()` reads a file without `version`, treat it as version 1 and ignore it (forces full reindex). Future logic changes can bump the version.

## Risks / Trade-offs

- **Hashing cost**: SHA-256 on every referenced file on every start adds I/O. Mitigation: short-circuit on unchanged `mtime`; hash only when `mtime` differs or state is missing.
- **Submodule commit detection cost**: `git rev-parse HEAD` per submodule on start is cheap but spawns a process. Mitigation: read submodule commit only once per submodule and cache in `submoduleCommits`.
- **Deletion API failure**: If Qdrant is down, deletions cannot be applied. Mitigation: catch and log the error, but do not remove from local state so the deletion is retried next start.
- **Large deletion sets**: Deleting thousands of points by source filter is a single request but may timeout. Mitigation: batch deletion requests into chunks of 100 sources.
- **State migration**: Old `.qdrant/index.json` will be ignored and a full reindex triggered. This is intentional but may cause a slow first start after upgrade.

## Migration Plan

1. Back up existing `.qdrant/index.json` to `.qdrant/index.json.v1` on first read of an old-format file.
2. Treat old format as empty state, forcing full reindex.
3. Future starts use version 2 state normally.
4. Rollback: restore `.qdrant/index.json.v1` and revert code.

## Open Questions

- Should the dry-run mode also report estimated chunk/vector counts? (Could be added later without changing core logic.)
- Should we expose a `--force-reindex` flag that ignores state entirely? It already exists in `src/bin/omnicode.js`; this design preserves it.
