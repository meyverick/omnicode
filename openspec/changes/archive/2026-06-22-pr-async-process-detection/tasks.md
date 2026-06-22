## 1. Review and merge PR #2

- [x] 1.1 Fetch PR #2 branch and examine the diff locally
- [x] 1.2 Convert `isProcessRunning("omniroute")` in `startOmniroute()` to `await isProcessRunningAsync("omniroute")`
- [x] 1.3 Convert `isProcessRunning("opencode")` in `stopOmnirouteIfIdle()` to `await isProcessRunningAsync("opencode")`
- [x] 1.4 Wrap cleanup signal handlers in async IIFE for SIGINT/SIGTERM

## 2. Tests

- [x] 2.1 Add `isProcessRunningAsync` import to `test/lib.test.js`
- [x] 2.2 Add test: returns true for a known-running process
- [x] 2.3 Add test: returns false for a nonexistent process

## 3. Final verification

- [x] 3.1 Run the test suite and fix any failures
- [x] 3.2 Run `npm pack --dry-run` to confirm package contents
- [ ] 3.3 Commit and push to main
