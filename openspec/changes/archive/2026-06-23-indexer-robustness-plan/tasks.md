## 1. Concurrency and Queue Configuration

- [x] 1.1 Calculate default concurrency via `os.cpus().length` and set `INDEXING_CONCURRENCY` dynamically in configuration generation
- [x] 1.2 Read `INDEXING_CONCURRENCY` from `opencode.jsonc` settings
- [x] 1.3 Update Qdrant connection configuration to inject `OMP_NUM_THREADS` and `RAYON_NUM_THREADS` variables based on concurrency settings

## 2. Core Worker Implementations

- [x] 2.1 Refactor file walking/indexing loop into an asynchronous bounded worker queue limited to `INDEXING_CONCURRENCY`
- [x] 2.2 Implement UUID-based temporary file atomic saving (`index.json.<uuid>.tmp` -> `index.json`) for concurrent workers
- [x] 2.3 Filter MinerU unsupported small assets (< 50KB) in `isComplexDocument`

## 3. Tree-Sitter Optimizations

- [x] 3.1 Implement WASM module compilation caching in `tree-sitter.js`
- [x] 3.2 Refactor parser instantiation to utilize a reusable worker pool rather than continuous GC allocation

## 4. Final Validation

- [x] 4.1 Run unit and integration tests to ensure queue safety
- [x] 4.2 Verify no race conditions trigger during simulated massive indexing aborts
