## Context

`omnicode` currently generates a UUID and stores it in `.opencode/session.id`, then passes it to `opencode -s <uuid>`. OpenCode session IDs are internal identifiers that cannot be invented. The right behavior is to let OpenCode manage session creation and only continue existing sessions when appropriate.

## Goals / Non-Goals

**Goals:**

- Remove UUID generation and `.opencode/session.id` management.
- Pass explicit `-s <session_id>` only when the user provides one.
- Continue the most recent session with `-c` when no ID is provided and sessions exist for the current directory.
- Start a fresh session when no ID is provided and no sessions exist.

**Non-Goals:**

- Querying OpenCode's internal SQLite database.
- Persisting custom session IDs.
- Validating user-provided session IDs against the session list.

## Decisions

1. Resolve the launch mode in Node before calling the Bash runtime.

   `omnicode.js` will run `opencode session list`, parse the output, and decide whether to pass `-c` or nothing. This keeps shell complexity low and makes the logic testable. Alternative considered: do it all in Bash. That makes parsing harder and testing harder.

2. Keep the Bash runtime as a thin launcher.

   The runtime script will receive an optional `SESSION_FLAG` and `SESSION_ID`. It will launch OpenCode with `-s <id>`, `-c`, or no session argument. This matches the existing delegation pattern.

3. Do not validate `-s` values.

   If the user passes an invalid session ID, OpenCode will report the error. Adding our own validation would require parsing the session list and duplicating OpenCode's behavior. Alternative considered: reject invalid IDs up front. That adds coupling and still doesn't prevent all errors.

4. Treat any non-empty `opencode session list` output as "sessions exist".

   We only need to know whether at least one session exists, not parse every row. This makes the parser resilient to minor output changes.

## Risks / Trade-offs

- `opencode session list` output format may change. → Mitigation: use a lenient parser that only checks for the presence of a `ses_` line.
- Running `opencode session list` adds a small delay before launch. → Acceptable; it prevents the bigger failure of `-c` with no sessions.
- Users lose the `.opencode/session.id` file. → This is intentional; sessions are now managed by OpenCode.

## Migration Plan

1. Update `src/bin/omnicode.js` to parse args and resolve `-c`/no flag.
2. Update `src/bin/omnicode-runtime.sh` to accept the resolved mode.
3. Update tests.
4. Update wiki to remove `.opencode/session.id` references.
5. Commit and push.

## Open Questions

- None.
