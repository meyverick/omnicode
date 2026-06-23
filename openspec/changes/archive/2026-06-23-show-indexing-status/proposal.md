## Why

Users currently have no visibility into whether the background indexer is running when they execute `omnicode status`. Adding an `indexing: true|false` indicator to the status output will clarify the system's current state and help users understand if background tasks are active.

## What Changes

- Modify `omnicode-runtime` to track whether indexing is currently running.
- Expose the current indexing state so other processes can read it.
- Modify the `omnicode status` command to read this state and display `indexing: true` or `indexing: false` accordingly.

## Capabilities

### New Capabilities
- `cli-status-indicator`: Exposes the background indexing state to the CLI and displays it in `omnicode status`.

### Modified Capabilities

## Impact

- `src/bin/omnicode-runtime.js`: Needs to track and expose indexing state.
- `src/bin/omnicode.js` (or wherever `status` is handled): Needs to read and report the exposed indexing state.
