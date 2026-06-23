## 1. Implement Lock File Check in Runtime

- [x] 1.1 In `src/bin/omnicode-runtime.js`, check if `.qdrant/.indexing` lock file exists before triggering the background indexer.
- [x] 1.2 If the lock file exists, log a message `[omnicode] background indexing is already running, skipping` and do not call `indexReferences`.
- [x] 1.3 If the lock file does not exist, proceed with starting the background indexing.
