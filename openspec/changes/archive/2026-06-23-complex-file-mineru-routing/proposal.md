## Why

Currently, the `omnicode` indexer splits all files uniformly using simple line- or heading-based chunking. While this is highly effective and fast for source code and simple markdown, it destroys the semantic structure of complex documents such as PDFs or dense HTML containing tables and equations. MinerU is an advanced layout-aware multimodal parsing pipeline that perfectly preserves these structures. We need a hybrid pipeline that selectively routes complex files to the MinerU API to dramatically improve retrieval relevance, while preserving the speed and efficiency of the standard ingestion pipeline for simple text files.

## What Changes

- Add a document classification heuristic at the start of the indexing pipeline to detect complex file types (e.g., `.pdf`, high table/math density).
- Add support for routing complex documents through the online MinerU API for structural parsing, returning clean layout-aware Markdown and JSON.
- Require a `MINERU_API_KEY` to enable the MinerU parsing path.
- Implement graceful dynamic fallbacks: if no API key is provided, if the key is invalid/expired, or if the API quota is exhausted, the system automatically disables the complexity detection and falls back to standard line-based indexing.
- Implement robust retry mechanisms for transient MinerU API failures, eventually falling back to local indexing if the API remains unreachable.

## Capabilities

### New Capabilities
- `complex-document-classifier`: Heuristics for determining if a document is "complex" (e.g., PDFs, dense HTML tables) versus "simple" code/text.
- `mineru-api-integration`: A resilient MinerU API client that handles authentication, retry logic, error handling, quota exhaustion, and graceful fallbacks.

### Modified Capabilities
- `background-startup-indexing`: Updating the indexer pipeline to invoke the classifier routing and MinerU parsing stage before standard chunking (when a valid API key is present).

## Impact

- **Affected code**: `src/installer/lib.js` (indexing loop and chunking logic).
- **APIs**: Integration with MinerU cloud API endpoints (`https://mineru.net/api/v4/extract/task`).
- **Configuration**: Addition of `MINERU_API_KEY` as an environment variable or configuration option.
- **Dependencies**: Minimal new dependencies (e.g., relying on native Node APIs for fetching and ZIP payload parsing if necessary).
