# Complex Document Classifier

## Purpose
TBD - Classify documents as complex or simple based on their structure and format.

## Requirements

### Requirement: Document Complexity Classification
The system SHALL classify documents as "complex" or "simple" based on their file extension and internal formatting density before determining the parsing strategy.

#### Scenario: File is a PDF
- **WHEN** the file extension is `.pdf`
- **THEN** it is classified as "complex"

#### Scenario: File contains high density of tables or math
- **WHEN** a markdown or HTML file contains dense tabular data or mathematical LaTeX formatting
- **THEN** it is classified as "complex"

#### Scenario: File is standard source code
- **WHEN** a file is a standard source code file (e.g. `.js`, `.ts`, `.py`) without dense tables/math
- **THEN** it is classified as "simple" and skips MinerU API routing
