## Context

Three open PRs by `google-labs-jules` await review. PR #2 (the previous one) was merged with extensions. These three target related performance concerns.

## PR Analysis

### PR #1 — Remove busy-wait in stopOmnirouteIfIdle

- Removes `for (let i = 0; i < 10; i++)` busy-wait loop
- Claims 71% reduction in execution time (0.125ms → 0.036ms)
- **Superseded**: Our `performance-reliability-security-audit` already replaced the busy-wait with async `stopOmnirouteIfIdle` and added a max-10-retry interval-based approach. The busy-wait loop was removed on main in commit 24b64d5.
- **Action**: Close with note explaining it's superseded.

### PR #3 — Async concurrency for Windows process detection

- Converts `isProcessRunning` and `commandExists` to async using `promisify(execFile)`
- Adds `isProcessRunningSync` and `commandExistsSync` for signal handlers
- Uses `Promise.all` for Windows `.exe`/`.cmd`/`.bat` extension checks
- Updates all call sites across src/ and test/
- Claims ~19.5% improvement on a benchmark that may not reflect real-world usage
- **Partial overlap**: `isProcessRunningAsync` was already added and applied to all call sites in our PR #2 merge. The new contribution here is `commandExists` async.
- **Conflict**: The PR was created from a branch based on older main (before `pgrep -x` → `-f` fix, before `isProcessRunningAsync`, before `isPidAlive` was exported). Applying it as-is would regress those fixes.
- **Verdict**: Low value. `commandExists` calls `which`/`where` which are fast shell commands (~0.5-2ms). The async benefit is negligible. Closing with rationale keeps the codebase simpler.

### PR #4 — Fix process.env mutation in Env.set

- Empty diff (0 additions, 0 deletions)
- Might reference an upstream file or be from an empty branch
- **Action**: Close as inactive.

## Action Plan

1. Close PR #1 with note: superseded by previous audit changes.
2. Close PR #3 with note: async core accepted in PR #2; `commandExists` async is low-value; avoid regression.
3. Close PR #4 with note: no diff found.
