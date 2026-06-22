## 1. Fix polling loop in stopOmnirouteIfIdle

- [x] 1.1 Add `await sleep(100)` inside the for loop in `stopOmnirouteIfIdle` so SIGTERM has time to be processed before the loop gives up

## 2. Fix exit handler

- [x] 2.1 Restore `process.on("exit")` handler with synchronous fallback: read PID file, send kill, remove file
- [x] 2.2 Ensure sync exit handler uses try/catch so it doesn't throw if the PID file is already cleaned up by the async signal handler

## 3. Final verification

- [x] 3.1 Run the test suite and fix any failures
- [ ] 3.2 Commit and push
