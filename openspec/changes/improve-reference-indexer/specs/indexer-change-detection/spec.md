# Indexer Change Detection

## Purpose
Reliably detect new, modified, and unchanged reference files on every `omnicode` startup, regardless of filesystem timestamp quirks.

## ADDED Requirements

### Requirement: Detect new files
The indexer SHALL identify any file returned by `walkReferencesAsync()` that does not exist in the current index state.

#### Scenario: New reference file added
- **WHEN** a new file appears in `./references/`
- **THEN** the indexer SHALL include it in the set of files to index

### Requirement: Detect modified files by content hash
The indexer SHALL consider a file modified if its SHA-256 content hash differs from the hash stored in the index state, even when the file's `mtime` is unchanged.

#### Scenario: File content changes but mtime is preserved
- **WHEN** a referenced file's content changes but its modification timestamp is preserved
- **THEN** the indexer SHALL still treat it as modified and re-index it

### Requirement: Detect submodule-level changes
For files located inside git submodules, the indexer SHALL also consider the submodule's current commit SHA. If the commit changed since the last index, all files in that submodule SHALL be treated as potentially changed.

#### Scenario: Submodule is updated to a new commit
- **WHEN** `sync-references.js` updates a submodule to a new commit
- **THEN** the indexer SHALL detect the commit change
- **AND** it SHALL re-evaluate all files within that submodule

### Requirement: Skip unchanged files
The indexer SHALL NOT re-index files whose stored `mtime`, hash, and submodule commit all match the current values.

#### Scenario: No changes since last index
- **WHEN** startup runs and no reference files changed
- **THEN** the indexer SHALL log that all files are up to date
- **AND** it SHALL NOT spawn embedding or Qdrant operations

### Requirement: Compute a startup change summary
Before indexing begins, the indexer SHALL log counts of new, modified, deleted, and unchanged files.

#### Scenario: Mixed changes on startup
- **WHEN** the indexer detects a mix of new, modified, and unchanged files
- **THEN** it SHALL log a single summary line with the counts before processing

### Requirement: Support dry-run preview
The indexer SHALL support a dry-run mode in which it computes and logs the change summary without writing vectors to Qdrant or mutating the index state.

#### Scenario: User runs index dry-run
- **WHEN** `omnicode` is started with `--index-status`
- **THEN** the indexer SHALL compute new, modified, and deleted file sets
- **AND** it SHALL print the summary
- **AND** it SHALL NOT call `embedAndStore()` or `deleteQdrantPointsBySource()`

## MODIFIED Requirements

None.

## REMOVED Requirements

None.
