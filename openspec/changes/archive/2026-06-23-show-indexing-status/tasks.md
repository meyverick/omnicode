## 1. Runtime State Management

- [x] 1.1 In `src/installer/lib.js` or `src/bin/omnicode-runtime.js`, modify the `indexReferences` function to create an empty `.qdrant/indexing.lock` file when indexing begins.
- [x] 1.2 Update the `finally` block in `indexReferences` to ensure the `.qdrant/indexing.lock` file is deleted when indexing completes, fails, or is aborted.
- [x] 1.3 Update the `cleanup` and signal handlers in `src/bin/omnicode-runtime.js` to also delete `.qdrant/indexing.lock` if the process exits abruptly.

## 2. CLI Status Output

- [x] 2.1 Locate the `status` command logic in the `omnicode` CLI (e.g., in `src/bin/omnicode.js`).
- [x] 2.2 Add logic to check for the existence of the `.qdrant/indexing.lock` file.
- [x] 2.3 Modify the `status` output to append `indexing: true` if the lock file exists, and `indexing: false` otherwise.
