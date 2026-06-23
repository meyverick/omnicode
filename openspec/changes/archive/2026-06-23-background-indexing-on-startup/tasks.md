## 1. Background Indexing Implementation

- [x] 1.1 In `src/bin/omnicode-runtime.js` inside `runRuntime`, locate the block where `qdrantServer` is successfully started.
- [x] 1.2 Immediately after logging `"[omnicode] qdrant MCP ready"`, invoke `indexReferences(refsDir, qdrantConfig, qdrantServer)` synchronously without `await`.
- [x] 1.3 Chain a `.catch(err => ...)` to the `indexReferences()` call to quietly log any background indexing errors to `console.error` without throwing/crashing the process.
- [x] 1.4 Test `omnicode` startup manually to confirm that the UI launches instantly while the `.qdrant` directory receives indexing activity in the background.
