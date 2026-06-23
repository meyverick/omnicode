## ADDED Requirements

### Requirement: UUID-based Temporary Files for Atomic Renames
When replacing critical files, the system SHALL use unique UUIDs for temporary files to prevent race conditions during concurrent operations.

#### Scenario: Preventing ENOENT race conditions
- **WHEN** multiple concurrent processes or threads need to atomically update a file
- **THEN** they SHALL write to a `.tmp` file containing a UUID
- **AND** atomic rename it to the target filename
