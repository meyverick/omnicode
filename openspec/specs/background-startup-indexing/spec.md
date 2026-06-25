# Background Startup Indexing

## Purpose
Automatically trigger vector indexing in the background on `omnicode` startup, with observable and atomic state management.

## Requirements

### Requirement: Background Indexing Trigger
The `omnicode` runtime SHALL automatically trigger the vector indexer asynchronously immediately after the Qdrant MCP server becomes ready, routing complex files to the MinerU API when applicable, and strictly shut down the indexer upon completion.

#### Scenario: Successful background trigger and shutdown
- **WHEN** the `omnicode` runtime finishes initializing the Qdrant MCP server
- **THEN** it executes `indexReferences()` without awaiting its completion
- **AND** the indexer routes complex documents to the MinerU API prior to chunking
- **AND** upon completion or error of the indexing process, it immediately stops the Qdrant MCP server used for indexing
- **AND** any errors from the asynchronous execution are caught and logged without crashing the runtime

### Requirement: Prevent Duplicate Concurrent Indexing
The `omnicode` runtime SHALL check if background indexing is already running in the current directory before starting a new indexer.

#### Scenario: Skip indexing when already indexing
- **WHEN** the `omnicode` runtime prepares to trigger background indexing
- **AND** a `.indexing` lock file already exists under `.qdrant/` in the project root
- **THEN** it SHALL NOT invoke `indexReferences()` and SHALL NOT spawn a new indexer process

### Requirement: Show Active Indexers Count in CLI Status
The `omnicode status` command output SHALL show the count of active indexers running on the system alongside the `indexing` field.

#### Scenario: Display indexing count when background indexing is active
- **WHEN** the user runs `omnicode status`
- **AND** there are active `omnicode` CLI instances currently doing indexing (represented by the existence of `.indexing` lock files on the system)
- **THEN** the status output includes `indexing: true (<count>)` where `<count>` is the number of active indexers on the system

### Requirement: Atomic state updates
The indexer SHALL update `.qdrant/index.json` only after the corresponding batch of chunks has been successfully stored in Qdrant.

#### Scenario: Batch storage succeeds
- **WHEN** `flushBatch()` successfully calls `embedAndStore()`
- **THEN** it SHALL append the batch's file metadata to the index state
- **AND** it SHALL save the state to disk

#### Scenario: Batch storage fails
- **WHEN** `embedAndStore()` returns no stored IDs for a batch
- **THEN** `flushBatch()` SHALL NOT update the index state for that batch
- **AND** the files SHALL be re-detected as modified on the next startup

### Requirement: Migrate old index state format
The indexer SHALL detect an old-format `.qdrant/index.json` (missing `version` field), back it up as `.qdrant/index.json.v1`, and treat it as empty.

#### Scenario: First start after upgrade
- **WHEN** the indexer reads a version-1 state file
- **THEN** it SHALL back up the file
- **AND** it SHALL force a full reindex
