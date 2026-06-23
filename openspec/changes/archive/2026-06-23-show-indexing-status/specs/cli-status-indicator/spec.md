## ADDED Requirements

### Requirement: Indexing Status Indicator
The `omnicode status` command SHALL indicate whether background indexing is currently running.

#### Scenario: Background indexing is active
- **WHEN** the user executes `omnicode status`
- **AND** the background indexer is currently processing files
- **THEN** the status output includes `indexing: true`

#### Scenario: Background indexing is inactive
- **WHEN** the user executes `omnicode status`
- **AND** the background indexer is not running (completed, aborted, or never started)
- **THEN** the status output includes `indexing: false`
