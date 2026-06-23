## Why

Currently, Qdrant indexing only happens synchronously when a user manually executes the `omnicode --index` command. To ensure that reference files are always indexed and up to date without requiring manual user intervention, the system should automatically trigger the indexing process in the background immediately upon startup of the `omnicode` runtime (after the MCP server spins up). Because threading limits have recently been constrained, a single-threaded background index run can complete seamlessly without freezing the host system.

## What Changes

- Automatically invoke the `indexReferences()` procedure as a detached/non-blocking Promise in the `omnicode-runtime.js` startup sequence.
- Indexing will only execute automatically if the `references` directory exists and the Qdrant MCP server has successfully initialized.
- Ensure any background errors during indexing are quietly logged and handled without crashing the runtime.

## Capabilities

### New Capabilities
- `background-startup-indexing`: Automatically triggering the Qdrant indexing pipeline asynchronously during system startup.

### Modified Capabilities

- None

## Impact

- **Affected Code**: `src/bin/omnicode-runtime.js`
- **Impact**: Automatically fires an asynchronous task on startup, improving out-of-the-box user experience by ensuring vector search indices are always current.
