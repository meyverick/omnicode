## MODIFIED Requirements

### Requirement: Background Indexing Trigger
The `omnicode` runtime SHALL automatically trigger the vector indexer asynchronously immediately after the Qdrant MCP server becomes ready, routing complex files to the MinerU API when applicable, and strictly shut down the indexer upon completion.

#### Scenario: Successful background trigger and shutdown
- **WHEN** the `omnicode` runtime finishes initializing the Qdrant MCP server
- **THEN** it executes `indexReferences()` without awaiting its completion
- **AND** the indexer routes complex documents to the MinerU API prior to chunking
- **AND** upon completion or error of the indexing process, it immediately stops the Qdrant MCP server used for indexing
- **AND** any errors from the asynchronous execution are caught and logged without crashing the runtime
