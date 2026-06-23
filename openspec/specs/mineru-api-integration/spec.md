# MinerU API Integration

## Purpose
TBD - Support submitting complex documents to the MinerU cloud API for structural extraction and non-blocking concurrent processing.

## Requirements

### Requirement: MinerU Cloud API Interaction
The system SHALL support submitting complex documents to the MinerU online API for structural extraction when a valid `MINERU_API_KEY` is provided.

#### Scenario: Successful document parsing
- **WHEN** a complex document is sent to the MinerU API
- **AND** the task completes successfully
- **THEN** the system downloads and extracts the structured markdown and layout JSON

#### Scenario: Missing API Key
- **WHEN** no `MINERU_API_KEY` is configured in the environment
- **THEN** the system bypasses the MinerU API completely and processes all files via the local simple chunker

#### Scenario: API Exhaustion or Invalid Key
- **WHEN** the MinerU API returns a 401 Unauthorized or 402 Payment Required status
- **THEN** the system logs a warning, disables MinerU routing for the current session, and falls back to the local chunker

#### Scenario: Transient API Failure
- **WHEN** the MinerU API returns a 5xx error or times out
- **THEN** the system retries the request up to 3 times before falling back to the local chunker

### Requirement: Non-Blocking Concurrent Processing
The system SHALL dispatch requests to the MinerU API asynchronously, ensuring that local indexing of other simple files continues uninterrupted while waiting for MinerU API responses.

#### Scenario: Concurrent indexing
- **WHEN** a complex document is dispatched to the MinerU API
- **THEN** the local indexer loop continues processing other standard text files without waiting for the MinerU task to complete
