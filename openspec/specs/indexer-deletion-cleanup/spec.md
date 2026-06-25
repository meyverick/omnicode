# Indexer Deletion Cleanup

## Purpose
Ensure that embeddings for deleted reference files are removed from Qdrant so semantic search does not return stale results.

## Requirements

### Requirement: Identify deleted reference files
The indexer SHALL compute the set of file paths present in the index state but absent from `walkReferencesAsync()`.

#### Scenario: Reference file is removed
- **WHEN** a previously indexed file is deleted from `./references/`
- **THEN** the indexer SHALL include that path in the deletion set

### Requirement: Delete points by source payload
The indexer SHALL remove all Qdrant points whose `payload.source` matches any deleted path.

#### Scenario: Deletion cleanup succeeds
- **WHEN** the indexer detects deleted paths
- **THEN** it SHALL send a delete-by-filter request to Qdrant for those sources
- **AND** it SHALL remove the corresponding entries from the local index state

### Requirement: Retry deletion on Qdrant failure
If the Qdrant delete request fails, the indexer SHALL leave the deleted paths in the local state so cleanup is retried on the next startup.

#### Scenario: Qdrant is unreachable during deletion
- **WHEN** the indexer attempts to delete points for removed files
- **AND** the Qdrant API returns an error or is unreachable
- **THEN** the indexer SHALL log the failure
- **AND** it SHALL NOT remove the paths from the local index state

### Requirement: Batch large deletion sets
If more than 100 deleted paths are detected, the indexer SHALL split the deletion request into multiple batches.

#### Scenario: Many files deleted at once
- **WHEN** more than 100 previously indexed files are absent
- **THEN** the indexer SHALL issue multiple delete-by-filter requests, each covering at most 100 sources
