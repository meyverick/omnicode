# Background Startup Indexing

## Purpose
TBD - Automatically trigger vector indexer in the background on startup.

## Requirements

### Requirement: Background Indexing Trigger
The `omnicode` runtime SHALL automatically trigger the vector indexer asynchronously immediately after the Qdrant MCP server becomes ready.

#### Scenario: Successful background trigger
- **WHEN** the `omnicode` runtime finishes initializing the Qdrant MCP server
- **THEN** it executes `indexReferences()` without awaiting its completion
- **AND** any errors from the asynchronous execution are caught and logged without crashing the runtime
