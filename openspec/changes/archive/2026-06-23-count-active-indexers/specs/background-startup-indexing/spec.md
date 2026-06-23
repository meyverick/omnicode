## ADDED Requirements

### Requirement: Show Active Indexers Count in CLI Status
The `omnicode status` command output SHALL show the count of active indexers running on the system alongside the `indexing` field.

#### Scenario: Display indexing count when background indexing is active
- **WHEN** the user runs `omnicode status`
- **AND** there are active `omnicode` CLI instances currently doing indexing (represented by the existence of `.indexing` lock files on the system)
- **THEN** the status output includes `indexing: true (<count>)` where `<count>` is the number of active indexers on the system
