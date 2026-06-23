# indexer-fault-tolerance

## Purpose

TBD

## Requirements

### Requirement: UUID-based Atomic State Saving
The indexer SHALL save its persistent state using an atomic write strategy that guarantees isolation between concurrent worker threads.

#### Scenario: Concurrent state flushes
- **WHEN** multiple worker threads attempt to save the index state simultaneously
- **THEN** each thread SHALL write to a temporary file named `index.json.<uuid>.tmp`
- **AND** atomically rename it to `index.json` to prevent corruption or `ENOENT` race conditions

### Requirement: MinerU API Payload Guardrails
The document classifier SHALL filter out extremely small UI assets and icons to prevent 413 Payload Too Large errors from the external MinerU API.

#### Scenario: Image smaller than threshold
- **WHEN** `isComplexDocument` encounters an image file smaller than 50KB
- **THEN** it SHALL return `false` to skip complex external processing
