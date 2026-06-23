## ADDED Requirements

### Requirement: Qdrant Directory Structure
The system SHALL use `.qdrant/` as a directory at the project root for storing all vector database related configuration and state.

#### Scenario: Collection ID Resolution
- **WHEN** the system resolves the collection name
- **THEN** it reads from or writes to the file `.qdrant/id`
- **AND** it ensures `.qdrant` is created as a directory if it does not exist

#### Scenario: Legacy File Migration
- **WHEN** the system resolves the collection name
- **AND** a `.qdrant` file exists instead of a directory
- **THEN** it reads the UUID from the file, removes the file, creates a `.qdrant` directory, and writes the UUID to `.qdrant/id`

#### Scenario: Indexing State
- **WHEN** the background indexer runs
- **THEN** it reads from and writes to `.qdrant/index.json` and `.qdrant/.indexing` without encountering `ENOTDIR` errors
