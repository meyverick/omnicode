## Context

Currently, the `omnicode` indexer splits all documents by lines or headings regardless of their semantic structure. While efficient for source code, this degrades vector search performance for complex documents (such as PDFs, or complex HTML tables and math equations). MinerU provides advanced document parsing capable of preserving this structure. We need a hybrid pipeline that automatically detects document complexity and offloads processing to the MinerU online API when appropriate, provided the user supplies a valid API key.

## Goals / Non-Goals

**Goals:**
- Implement a document classification heuristic to distinguish complex documents from simple code/text.
- Integrate the official MinerU online API for processing complex documents.
- Provide a robust fallback mechanism that reverts to local chunking if the MinerU API key is missing, invalid, or quota-exhausted.
- Add retry logic for transient API network failures.

**Non-Goals:**
- Running MinerU models locally via Docker or local GPU setups (we rely entirely on the online API).
- Replacing standard code chunking with MinerU (code should still chunk locally to save time and API costs).

## Decisions

- **Complexity Detection Heuristics**: 
  - *Decision*: We will detect file extensions (`.pdf`) and evaluate simple content heuristics (e.g., density of `<table` tags or LaTeX math indicators).
  - *Rationale*: These heuristics are fast and require no machine learning overhead, allowing near-instantaneous classification.

- **MinerU API Client Integration**:
  - *Decision*: We will implement a dedicated module (`mineru-client.js`) that uses native Node.js fetching to POST extraction tasks, poll for completion, and extract the resulting structured payload. This will be executed asynchronously and concurrently.
  - *Rationale*: Isolating this logic keeps the core `lib.js` indexer clean. Running the API calls concurrently ensures that polling MinerU for complex files does not block the indexing of standard simple files. 

- **Fallback & Quota Handling**:
  - *Decision*: The classifier and MinerU paths are strictly guarded by checking `process.env.MINERU_API_KEY`. If an HTTP 401 (Unauthorized) or 402 (Payment Required) is encountered, the integration disables itself for the remainder of the indexing run and falls back to standard local chunking.
  - *Rationale*: Ensures that missing API keys or exhausted quotas never break the indexing process. The feature acts strictly as an enhancement.

## Risks / Trade-offs

- **[Risk] Unpredictable API Latency** → Mitigation: Set strict timeouts and implement polling backoff.
- **[Risk] MinerU API downtime** → Mitigation: Catch all network exceptions and seamlessly fall back to local chunking so the user is never blocked.
