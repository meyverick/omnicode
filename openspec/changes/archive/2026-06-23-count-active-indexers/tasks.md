## 1. Implement Active Indexer Counter in Installer Lib

- [x] 1.1 In `src/installer/lib.js`, add a helper function `countActiveIndexers()` that lists all active `opencode` processes.
- [x] 1.2 For each process, inspect its working directory (`/proc/<pid>/cwd` on Linux, or equivalent fallback).
- [x] 1.3 Check if `${cwd}/.qdrant/.indexing` exists for each resolved working directory and return the unique count.

## 2. Update Status CLI Output

- [x] 2.1 In `src/bin/omnicode.js`, update `getProcessStatus()` to call `countActiveIndexers()`.
- [x] 2.2 In `src/bin/omnicode.js`, update `printStatus()` to format output as `indexing: true (<count>)` if active indexers are found.
