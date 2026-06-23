## ADDED Requirements

### Requirement: Prevent Duplicate Concurrent Indexing
The `omnicode` runtime SHALL check if background indexing is already running in the current directory before starting a new indexer.

#### Scenario: Skip indexing when already indexing
- **WHEN** the `omnicode` runtime prepares to trigger background indexing
- **AND** a `.indexing` lock file already exists under `.qdrant/` in the project root
- **THEN** it SHALL NOT invoke `indexReferences()` and SHALL NOT spawn a new indexer process
