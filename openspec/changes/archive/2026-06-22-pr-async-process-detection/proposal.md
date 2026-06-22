## Why

PR #2 (`fix: make isProcessRunning async`) was auto-created by Google Jules to replace a synchronous `execFileSync` call with an async alternative. The PR is partially correct but incomplete: it only converts one of three `isProcessRunning` call sites, adds no tests, and the performance improvement is negligible given the 1-second sleep in the polling loop. Reviewing, fixing, and merging the PR will keep the codebase clean and properly SOTA.

## What Changes

- **BREAKING**: None. All changes are additive or replace-in-place.
- Replace all three synchronous `isProcessRunning` call sites in `omnicode-runtime.js` with the async version (`startOmniroute`, `waitForOmniroute`, `stopOmnirouteIfIdle`).
- Add tests for `isProcessRunningAsync` covering both Unix and Windows branches.
- Merge PR #2 into main with revisions.
- The `isProcessRunningAsync` function itself is correct and well-structured — the PR's core logic is sound.

## Capabilities

### New Capabilities

- `async-process-detection`: An async `isProcessRunningAsync()` function using `promisify(execFile)` that avoids event loop blocking, applied consistently across all call sites.

### Modified Capabilities

- (None — this is a refactoring of existing capability `performance-hardening` at the implementation level only.)

## Impact

- `src/installer/lib.js`: Add `isProcessRunningAsync()` alongside existing `isProcessRunning()`.
- `src/bin/omnicode-runtime.js`: Replace all three `isProcessRunning(name)` calls with `await isProcessRunningAsync(name)`.
- `test/lib.test.js`: Add tests for `isProcessRunningAsync`.
- `test/runtime.test.js`: No change needed (static tests still pass).
