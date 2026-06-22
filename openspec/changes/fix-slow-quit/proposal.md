## Why

When a user runs `omnicode` and quits immediately (Ctrl+C during startup), two bugs appear:

1. It takes 5-10 seconds to exit (the `waitForOmniroute` polling loop keeps running before the signal handler takes effect).
2. Even after quitting, `omnicode --status` shows omniroute still running — the cleanup `for` loop has no delay between retries, so it gives up in microseconds before omniroute has time to process SIGTERM.

Both bugs stem from the same root causes.

## What Changes

- Add `await sleep(100)` between polling iterations in `stopOmnirouteIfIdle` so SIGTERM has time to be processed before we give up (fixes the orphaned omniroute).
- Ensure the `waitForOmniroute` loop exits promptly when `process.exit()` is called (the signal handler already calls `cleanup()` first).
- Restore the `process.on("exit")` handler with a synchronous fallback so the PID file is cleaned up even if `process.exit()` is called outside the signal handler.

## Capabilities

### New Capabilities

- `reliable-cleanup`: Ensures omniroute is properly killed and the PID file is cleaned up when `omnicode` exits, regardless of how it exits.

### Modified Capabilities

- (None.)

## Impact

- `src/bin/omnicode-runtime.js`: Add delay to `stopOmnirouteIfIdle` polling loop, restore `process.on("exit")` handler.
