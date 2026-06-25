## 1. State schema and migration

- [x] 1.1 Update `loadIndexState()` to detect old-format state and migrate to new schema with `version`, `files`, and `submoduleCommits`.
- [x] 1.2 Update `saveIndexState()` to always write the new schema.
- [x] 1.3 Back up old-format `.qdrant/index.json` to `.qdrant/index.json.v1` before migration.

## 2. Content hashing and git-aware detection

- [x] 2.1 Add `hashFile(path)` helper using SHA-256 (lazy, cached per run).
- [x] 2.2 Add `getSubmoduleCommit(submodulePath)` helper using `git rev-parse HEAD`.
- [x] 2.3 Map each reference file to its containing submodule path (if any).
- [x] 2.4 Replace `newFiles = files.filter(mtime < state)` with change classification: new, modified, unchanged.

## 3. Deletion cleanup

- [x] 3.1 Add `deleteQdrantPointsBySource(collectionName, sources)` helper with batched filter delete.
- [x] 3.2 Compute deleted paths from `Object.keys(state.files)` minus current file set.
- [x] 3.3 Call deletion cleanup before indexing, retry on failure, only remove from state on success.

## 4. Atomic batch state updates

- [x] 4.1 Move `saveIndexState()` out of per-file loops and into `flushBatch()` after successful `embedAndStore()`.
- [x] 4.2 Ensure cancellation still persists partial state for successfully flushed batches.

## 5. Dry-run / status mode

- [x] 5.1 Add `dryRun` option to `indexReferences()` signature.
- [x] 5.2 In dry-run mode, compute and log change summary without calling Qdrant writes.
- [x] 5.3 Add `--index-status` flag to `parseArgs()` in `src/bin/omnicode.js`.
- [x] 5.4 Pass dry-run flag through `runRuntime()` in `src/bin/omnicode-runtime.js`.

## 6. Logging and observability

- [x] 6.1 Log a startup summary: `index: X new, Y modified, Z deleted, W unchanged`.
- [x] 6.2 Add per-batch progress logs including counts and timing.

## 7. Tests

- [x] 7.1 Add tests for `loadIndexState()` migration from old format.
- [x] 7.2 Add tests for change detection with hash and submodule commit changes.
- [x] 7.3 Add tests for deletion cleanup success and failure paths.
- [x] 7.4 Add tests for atomic state update after successful batch storage.
- [x] 7.5 Add tests for `--index-status` dry-run mode.
- [x] 7.6 Run full test suite and fix failures.

## 8. Final verification

- [x] 8.1 Run `npm test` and ensure all tests pass.
- [x] 8.2 Manually test with a modified reference file whose mtime is preserved.
- [x] 8.3 Manually test deletion of a reference file and verify Qdrant cleanup.
- [x] 8.4 Commit and push.
