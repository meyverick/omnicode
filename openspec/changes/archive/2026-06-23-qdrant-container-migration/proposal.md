## Why

Currently, the background indexer and the active Opencode session both attempt to spawn their own local Qdrant MCP server concurrently using file-based storage, leading to database lock conflicts and initialization failures. Migrating to a shared Qdrant container (client-server architecture) eliminates these conflicts, allows parallel read/write access, and ensures project isolation by storing a unique collection ID in a project-root `.qdrant` file.

## What Changes

- `omnicode` will automatically start the Qdrant Docker container on launch if it isn't already running.
- The Qdrant Docker container will be automatically stopped when the last `opencode` instance shuts down (managed alongside `omniroute`).
- Update Qdrant MCP server configurations to point to a central Qdrant service (e.g., `http://localhost:6333`) instead of local embedded file paths.
- Introduce logic in `omnicode` to read or generate a `.qdrant` file at the project root containing a unique UUID for the `COLLECTION_NAME`.
- Ensure the background indexer correctly shuts down immediately after its indexing task is complete, releasing any ephemeral resources.
- Pass the dynamically resolved `COLLECTION_NAME` to the Qdrant MCP server environment variables.

## Capabilities

### New Capabilities
- `shared-qdrant-container`: Configuration and connection to a shared Qdrant container over network, using dynamic unique collections per project defined by a `.qdrant` file.

### Modified Capabilities
- `background-startup-indexing`: The background indexer now connects to the shared Qdrant service and strictly shuts down immediately after the indexing operation completes.

## Impact

- `src/installer/lib.js` and `src/bin/omnicode-runtime.js` will be heavily updated to remove local lock mechanics, implement the `.qdrant` collection file resolution, and cleanly shut down the indexer.
- Project repositories will now feature a `.qdrant` file.
- Developers will be required to run a Qdrant container locally.
