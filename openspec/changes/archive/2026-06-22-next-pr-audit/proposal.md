## Why

Three open PRs from `google-labs-jules` need review. Each targets a different performance concern: busy-wait removal (PR #1), async process detection and command checking (PR #3), and environment variable mutation (PR #4). PR #1 is already superseded by earlier work. PR #4 has no diff. PR #3 is the only one with material changes, but it conflicts with main since previous PRs have already applied similar patterns.

## What Changes

- **PR #1** (Optimize stopOmnirouteIfIdle busy-wait): Already implemented in the `performance-reliability-security-audit` change (async `stopOmnirouteIfIdle`, no busy-wait). Close as superseded.
- **PR #3** (Async concurrency for Windows process detection): Converts both `isProcessRunning` and `commandExists` to async, adds `*Sync` variants, uses `Promise.all` for Windows extension checks. Partial overlap with PR #2 which was already merged. The `commandExists` async conversion is new but low-value (shell command is fast). Close with rationale.
- **PR #4** (Fix process.env mutation in Env.set): Empty diff (0 additions, 0 deletions). No actionable content. Close as inactive.

## Capabilities

### New Capabilities

- None (audit-only, all PRs are closed or superseded).

### Modified Capabilities

- (None.)

## Impact

- No source code changes. PRs are reviewed and closed with comments.
