## Why

The current background reference indexer uses file modification time (`mtimeMs`) as the only signal for detecting new, edited, or deleted references. This is unreliable on WSL2 and after git operations: copied files, restored files, or files in freshly-updated submodules may retain old `mtime` values and be skipped. Deleted references are also only removed from the local `.qdrant/index.json` state; their vectors remain in Qdrant, causing stale search results. We need a robust, observable change-detection mechanism so that `omnicode` starts always reflect the exact current state of `./references/`.

## What Changes

- Replace `mtime`-only change detection with a hybrid strategy that combines git-aware detection for submodule-backed references with content hashing for standalone files.
- Add a schema version to the index state so future logic changes can force a reindex.
- Remove Qdrant points for deleted files by filtering on `payload.source`.
- Make the indexer log a clear summary of detected changes (new, modified, deleted, unchanged) on every startup.
- Add a `--dry-run-index` / `--index-status` CLI flag to preview what the indexer would do without mutating Qdrant.
- Only update `.qdrant/index.json` after a batch is successfully stored in Qdrant, preventing false "indexed" entries after crashes.

## Capabilities

### New Capabilities
- `indexer-change-detection`: Robust detection of added, modified, and deleted reference files on startup.
- `indexer-deletion-cleanup`: Removal of Qdrant points for files no longer present in `./references/`.

### Modified Capabilities
- `background-startup-indexing`: Startup behavior changes to compute and log a change summary before indexing, and to update state atomically after successful storage.

## Impact

- `src/installer/lib.js`: `indexReferences()`, `loadIndexState()`, `saveIndexState()`, `walkReferencesAsync()`, new helpers for hashing and git state.
- `src/bin/omnicode.js`: New CLI flags `--dry-run-index` / `--index-status`.
- `src/bin/omnicode-runtime.js`: Pass dry-run flag through to `indexReferences()`.
- `test/lib.test.js`: Tests for change detection, deletion cleanup, and atomic state updates.
- `.qdrant/index.json`: New schema with `version`, `files` (hash + mtime + optional `submoduleCommit`), and optional `submoduleCommits` map.
