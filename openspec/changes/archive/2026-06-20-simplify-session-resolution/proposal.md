## Why

The current `omnicode` runtime generates a UUID for `.opencode/session.id` and passes it to `opencode -s <uuid>`. OpenCode rejects arbitrary IDs and only accepts session IDs that already exist in its session store. Passing invented IDs or `-c` when no session exists causes OpenCode to fail or behave incorrectly. We need a simpler session resolution model that uses only real OpenCode sessions.

## What Changes

- **BREAKING**: `omnicode` will no longer generate or persist UUIDs in `.opencode/session.id`.
- `omnicode -s <session_id>` will pass the provided ID directly to `opencode -s <session_id>`.
- When no session ID is provided, `omnicode` will check whether any session exists for the current directory via `opencode session list`.
- If at least one session exists, `omnicode` will launch with `opencode -c` to continue the most recent session.
- If no session exists, `omnicode` will launch `opencode` without a session flag so OpenCode creates a new session.
- The `.opencode/session.id` file will no longer be created or updated by `omnicode`.

## Capabilities

### New Capabilities

- `session-resolution`: Covers how `omnicode` decides whether to pass `-s`, `-c`, or no session flag to OpenCode based on user input and existing OpenCode sessions.

### Modified Capabilities

- None.

## Impact

- `src/bin/omnicode.js` and `src/bin/omnicode-runtime.sh` will be updated.
- `test/bin.test.js` and `test/runtime.test.js` will be updated.
- Wiki pages `How-it-works.md` and `Getting-Started.md` will be updated to remove references to `.opencode/session.id`.
- The project-local session persistence behavior changes from explicit UUID files to OpenCode-managed sessions.
