## 1. Core Integrations

- [x] 1.1 Create `src/installer/mineru-client.js` module to encapsulate API logic.
- [x] 1.2 Implement MinerU task submission endpoint interaction (`POST`) in the client, including retry logic for 5xx errors.
- [x] 1.3 Implement MinerU task status polling endpoint interaction (`GET`) and layout extraction download logic in the client.

## 2. Document Classification

- [x] 2.1 Add heuristic `isComplexDocument(filePath, content)` function, checking for `.pdf` extensions or high density of layout tags (`<table`, `$$`).

## 3. Pipeline Integration & Fallbacks

- [x] 3.1 Update `indexReferences` in `src/installer/lib.js` to invoke the document classification heuristic before standard chunking.
- [x] 3.2 Add conditional concurrent routing in `indexReferences`: if `isComplexDocument` is true and `process.env.MINERU_API_KEY` is present, dispatch the file to the MinerU client asynchronously so it does not block the indexing of other simple files.
- [x] 3.3 Implement 401/402 handling in `indexReferences`: if MinerU returns unauthorized or quota exhausted, disable the feature dynamically for the remainder of the indexing run and log a warning.
- [x] 3.4 Implement graceful fallback: if MinerU fails, is disabled, or is not configured, fall back to proceeding with standard local chunking.
