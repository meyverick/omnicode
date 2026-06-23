## Why

Running multiple omnicode sessions in the same directory concurrently spawns multiple indexer processes, causing collisions and state corruption in the `.qdrant/index.json` state.

## What Changes

- Add a check for the `.qdrant/.indexing` lock file before spawning background indexing.
- Skip background indexing if `.qdrant/.indexing` is already present.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `background-startup-indexing`: Add requirement to check for existing `.indexing` lock file before triggering the index references function, preventing duplicate concurrent indexers.

## Impact

- `src/bin/omnicode-runtime.js`: Checks for `.indexing` before invoking `indexReferences()`.
