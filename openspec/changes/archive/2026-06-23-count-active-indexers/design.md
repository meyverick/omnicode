## Context

Currently, the `omnicode status` CLI command reports the status of `indexing: true | false` depending on whether a `.qdrant/.indexing` lock file exists in the current project directory. It does not look for other indexing operations on the system, which can be useful when multiple CLI sessions are running concurrently in different projects.

## Goals / Non-Goals

**Goals:**
- Add a helper function to check active `opencode` processes, extract their current working directory (CWD), and check for the existence of `.qdrant/.indexing` within those projects.
- Update `omnicode status` to query this count and format output accordingly.

**Non-Goals:**
- Walking the filesystem recursively (since walking files is slow and resource-heavy).

## Decisions

### Decision: Check active process workspaces for `.qdrant/.indexing`
- **Approach**: 
  - On Linux/macOS: Query running `opencode` process IDs (using `pgrep -f opencode` or similar) and read the target symlink `/proc/<PID>/cwd` (or use `lsof`/`pwdx` depending on compatibility) to resolve the process's working directory.
  - On Windows: Run `wmic process where "name='opencode.exe' or name='opencode.cmd'" get ExecutablePath,CommandLine` or parse the process environment to derive workspace locations.
  - Verify if `${Cwd}/.qdrant/.indexing` exists.
- **Alternative**: Recursively craw the entire user directory.
- **Rationale**: Fetching active processes is instant and prevents unnecessary disk I/O.

## Risks / Trade-offs

- *Risk*: Platform compatibility issues reading process working directories.
- *Mitigation*: Fall back to a count of 0 (or just checking the local directory lock) gracefully if `/proc` or `pwdx` isn't accessible due to permission boundaries.
