## ADDED Requirements

### Requirement: Environment Variable Propagation for Qdrant
The runtime module SHALL propagate concurrency settings by dynamically injecting environment variables into the generated Qdrant configuration.

#### Scenario: Setting OMP_NUM_THREADS
- **WHEN** `INDEXING_CONCURRENCY` is determined
- **THEN** the `generateQdrantConfig` function SHALL set `OMP_NUM_THREADS` and related threading variables in the generated shell command
- **AND** ensure backward compatibility for standard thread variables when invoked externally
