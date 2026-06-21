## MODIFIED Requirements

### Requirement: Parallel GrayMatter and OpenSpec initialization

The runtime SHALL initialize GrayMatter and OpenSpec concurrently instead of sequentially.

#### Scenario: Parallel init reduces startup time

- **WHEN** both `graymatter` and `openspec` are installed
- **THEN** their `init` commands SHALL be launched in parallel using `Promise.all` and awaited before starting OmniRoute