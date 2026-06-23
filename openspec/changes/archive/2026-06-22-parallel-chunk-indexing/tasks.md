## 1. Parallel chunk processing

- [x] 1.1 Add buffer-based JSON-RPC response parser: accumulate stdout, split by newlines, parse complete JSON objects, match by `id`
- [x] 1.2 Implement concurrency-limited semaphore: track in-flight requests, dispatch next chunk when a slot opens
- [x] 1.3 Rewrite `callQdrantStore()` to send chunks concurrently instead of sequentially
- [x] 1.4 Add per-chunk timeout (30s) and error handling (log warning, continue)

## 2. Configuration

- [x] 2.1 Add `OMNICODE_INDEX_CONCURRENCY` env var support (default 10)
- [x] 2.2 Pass concurrency limit through from `indexReferences()` to `callQdrantStore()`

## 3. Tests

- [x] 3.1 Run the test suite and fix any failures
- [ ] 3.2 Verify full index completes in reasonable time (2-5 min for 84710 chunks)

## 4. Final verification

- [ ] 4.1 Run `npm pack --dry-run` to confirm package contents
- [ ] 4.2 Commit and push
