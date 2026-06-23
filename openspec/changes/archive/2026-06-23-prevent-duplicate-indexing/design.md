## Context

Background: When `omnicode` starts up, if the references directory and Qdrant are present, it launches background indexing. However, if there are multiple sessions run from the same workspace directory, they will attempt to run duplicate indexers concurrently.

## Goals / Non-Goals

**Goals:**
- Detect if another indexer is already active for the current workspace before calling `indexReferences()`.
- Avoid executing duplicate background indexing runs.

**Non-Goals:**
- Checking for indexing runs in other workspaces (only local workspace indexing conflicts are in-scope).

## Decisions

- **Checking lock file existence**: We will check if `.qdrant/.indexing` exists using `fs.existsSync` inside `src/bin/omnicode-runtime.js` before invoking `indexReferences()`.
- **Reasoning**: This is lightweight, doesn't require polling, and leverages the existing `.indexing` lock file format.

## Risks / Trade-offs

- **Risk**: Stale lock file after crash prevents future indexing.
- **Mitigation**: The runtime already clears `.qdrant/.indexing` on startup, but we should make sure that check is robust or log a warning if indexing is skipped due to the lock.
