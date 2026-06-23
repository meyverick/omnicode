# Shared Qdrant Container

## Purpose
TBD - Manage a shared Qdrant container lifecycle and provide workspace collection isolation.

## Requirements

### Requirement: Shared Qdrant Connection
The system SHALL connect to a central Qdrant service on `localhost:6333` rather than using embedded local storage.

#### Scenario: Server URL generation
- **WHEN** generating the Qdrant configuration
- **THEN** it sets `QDRANT_URL=http://localhost:6333` instead of `QDRANT_LOCAL_PATH`

### Requirement: Workspace Collection Isolation
The system SHALL maintain a unique `COLLECTION_NAME` for each project workspace via a `.qdrant/id` file inside a `.qdrant/` directory.

#### Scenario: Project initialization with new collection
- **WHEN** the runtime initializes in a project without a `.qdrant/id` file
- **THEN** it generates a UUID-based collection name (e.g., `references-<uuid>`)
- **AND** it ensures `.qdrant/` is created as a directory if it does not exist
- **AND** it writes this name to the `.qdrant/id` file
- **AND** it uses this name for the `COLLECTION_NAME` environment variable

#### Scenario: Project initialization with existing collection
- **WHEN** the runtime initializes in a project with an existing `.qdrant/id` file
- **THEN** it reads the collection name from the file
- **AND** it uses this name for the `COLLECTION_NAME` environment variable

#### Scenario: Legacy File Migration
- **WHEN** the system resolves the collection name
- **AND** a `.qdrant` file exists instead of a directory
- **THEN** it reads the UUID from the file, removes the file, creates a `.qdrant` directory, and writes the UUID to `.qdrant/id`

#### Scenario: Indexing State
- **WHEN** the background indexer runs
- **THEN** it reads from and writes to `.qdrant/index.json` and `.qdrant/.indexing` without encountering `ENOTDIR` errors

### Requirement: Qdrant Docker Lifecycle Management
The `omnicode` runtime SHALL automatically manage a shared Qdrant Docker container named `omnicode-qdrant`.

#### Scenario: Starting the Qdrant container
- **WHEN** the `omnicode` runtime starts
- **AND** the Docker CLI is available
- **AND** the `omnicode-qdrant` container is not already running
- **THEN** it starts the container using `docker run -d --name omnicode-qdrant -p 6333:6333 qdrant/qdrant`

#### Scenario: Stopping the Qdrant container
- **WHEN** the last active Opencode session exits
- **AND** the `omnicode` runtime cleans up idle services
- **THEN** it forcibly stops and removes the `omnicode-qdrant` container
