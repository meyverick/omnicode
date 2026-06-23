## Why

When invoking `omnicode status`, the status output shows `indexing: true` or `false` based on the presence of the `.qdrant/.indexing` lock file in the current project workspace. However, it does not show how many active indexing tasks are currently running across the entire system. Because users can run multiple sessions and backgrounds, displaying the exact count of active indexers on the system provides immediate transparency.

## What Changes

- Modify `omnicode status` output to display the count of active indexers on the system when indexing is true.
- Format the indexing field in the status output to display: `indexing: true (<count>)` where `<count>` is the number of active indexers currently running across the user's projects.

## Capabilities

### Modified Capabilities

- `background-startup-indexing`: Update the indexing status requirements to include displaying the count of active indexing instances on the system.

## Impact

- `src/bin/omnicode.js`: Modify status formatting to query and display the active indexer count.
- `src/installer/lib.js`: Add helper logic to count active `.indexing` lock files across active `opencode` processes by locating their working directory paths.
