# dynamic-grammar-loader

## Purpose

TBD

## Requirements

### Requirement: Dynamic Tree-sitter Parser Resolution
The system SHALL dynamically resolve and download the required Tree-sitter WebAssembly grammar file based on the target file's extension if it is not already cached locally.

#### Scenario: Downloading a parser for a new language
- **WHEN** the system attempts to index a file (e.g., `.go`)
- **AND** the corresponding grammar file (`tree-sitter-go.wasm`) does not exist in the local cache
- **THEN** it issues an HTTP request to download the `.wasm` file from a trusted CDN (e.g., `unpkg.com` or `jsdelivr.net`)
- **AND** it saves the binary to a local configuration directory (e.g., `~/.config/omnicode/grammars/`)
- **AND** the downloaded parser is subsequently loaded to process the file

### Requirement: Network Failure Graceful Degradation
The system SHALL fall back to the legacy sequential chunking logic if the required `.wasm` grammar file fails to download.

#### Scenario: User is offline or network blocks CDN
- **WHEN** the system attempts to download a grammar file
- **AND** the HTTP request fails due to an offline state, timeout, or 4xx/5xx status
- **THEN** the system logs a warning indicating the failure
- **AND** it continues indexing the file by falling back to the 50-line linear chunking algorithm

### Requirement: ABI Version Compatibility
The system SHALL fetch grammar `.wasm` files from a CDN version that corresponds exactly to the ABI requirements of the bundled `web-tree-sitter` dependency.

#### Scenario: Pinned CDN versioning
- **WHEN** forming the download URL for the `.wasm` file
- **THEN** the URL contains an explicit version or path parameter that guarantees compatibility with the current `omnicode` internal `web-tree-sitter` runtime version to prevent runtime WASM crashes

### Requirement: Manual Language Downloading
The `omnicode` CLI SHALL expose a command to manually download and cache a language parser to pre-warm the environment for offline use.

#### Scenario: Manually download language parser via CLI
- **WHEN** the user runs `omnicode download-language <language>` (e.g., `omnicode download-language python`)
- **THEN** the system triggers the identical lazy-loading download logic used by the indexer
- **AND** it saves the grammar to the local cache directory
- **AND** it outputs a success message indicating the parser is ready for offline use
