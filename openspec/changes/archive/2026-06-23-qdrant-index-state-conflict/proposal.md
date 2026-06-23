## Why

The recent migration to a shared Qdrant container introduced a `.qdrant` file at the project root to store a unique UUID for workspace collection isolation. However, the background indexer still attempts to use `.qdrant` as a directory to store its `index.json` state file. This causes an `ENOTDIR` crash when the indexer tries to access `.qdrant/index.json`. We need to convert the UUID storage from a top-level file to a file within the `.qdrant` directory to prevent this conflict.

## What Changes

- Convert `.qdrant` from a file to a directory.
- Update `resolveCollectionName()` to store the collection ID in `.qdrant/id` instead of `.qdrant`.
- Revert or preserve the background indexer's behavior to safely use `.qdrant` as a directory for its `index.json` and `.indexing` files.

## Capabilities

### New Capabilities

- `index-state-isolation`: Isolates the background indexing state files alongside the collection identifier within the `.qdrant/` directory to prevent file/directory conflicts.

### Modified Capabilities

## Impact

- `src/installer/lib.js`: Updates `resolveCollectionName()` to write to and read from `.qdrant/id`.
- `src/installer/lib.js`: Updates `resolveCollectionName()` to handle migrating existing `.qdrant` files by converting them to directories containing the `.qdrant/id` file.
