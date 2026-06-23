# structural-code-chunking

## Purpose

TBD

## Requirements

### Requirement: AST-Based Structural Chunking
The `omnicode` runtime SHALL chunk supported source code files using an Abstract Syntax Tree (AST) to preserve logical blocks (e.g., functions, classes, methods) rather than splitting sequentially by line counts.

#### Scenario: Slicing a source file by block scope
- **WHEN** a source code file is processed for indexing
- **AND** a valid Tree-sitter grammar is loaded for its language
- **THEN** the system extracts whole nodes matching block declarations (e.g. `function_declaration`, `class_declaration`) and saves them as contiguous chunks
- **AND** it marks the extracted lines as covered

### Requirement: Recursive Hybrid Splitting
The system SHALL recursively split AST nodes that exceed the maximum chunk character limit (4000 characters) into their logical children.

#### Scenario: Large class is split into individual methods
- **WHEN** the text of a node exceeds 4000 characters
- **AND** the node has structural children (like `method_definition`)
- **THEN** the system iterates over those children, extracting them individually as separate chunks
- **AND** if a leaf node itself exceeds the limit, it is sliced character-wise sequentially as a fallback

### Requirement: Orphaned Lines Capture
The system SHALL collect all lines of code not explicitly covered by a structural block and group them into a single or multiple chunks representing the "Global Scope" or "Module Scope".

#### Scenario: Capturing top-level imports and variables
- **WHEN** all structural block chunks have been extracted from a file
- **THEN** the system scans the source file for uncovered line ranges
- **AND** groups them into chunks with a metadata header specifying their original file and line numbers
