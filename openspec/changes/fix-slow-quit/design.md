## Context

The `stopOmnirouteIfIdle` function was converted to async in the `pr-async-process-detection` change. The for-loop that polls for process exit after sending SIGTERM has no delay between iterations — 10 calls to `process.kill(pid, 0)` complete in microseconds. OmniRoute (a Node.js process) needs time to process SIGTERM before it exits. Combined with an empty `process.on("exit")` handler, omnicode exits before omniroute has time to die.

## Root Cause

```js
// Current code — no delay between retries
for (let i = 0; i < 10; i++) {
  if (!isPidAlive(pid)) break;
  try { process.kill(pid, 0); } catch { break; }
}
```

This loop completes in <0.1ms. SIGTERM hasn't been handled by the target process yet, so `isPidAlive` always returns true for all 10 iterations. The loop gives up, `process.exit(0)` runs, and omniroute survives because it's detached.

## Fix

Add `await sleep(100)` inside the polling loop. This gives omniroute up to 1 second (10 x 100ms) to process SIGTERM before cleanup gives up. In practice, SIGTERM is handled within 1-2ms on a modern system, so the first or second iteration should detect the exit.

After the fix:
```js
for (let i = 0; i < 10; i++) {
  if (!isPidAlive(pid)) break;
  await sleep(100);
}
```

## Exit Handler

The `process.on("exit")` handler was emptied when cleanup was converted to async. Restore it with a synchronous fallback that reads the PID file, sends SIGTERM (or negative-PID kill), and removes the file — no polling needed in the exit handler because the process is shutting down anyway. The async version in the signal handlers will have already done the polling.

## Risks

- **Slightly slower shutdown**: Adding 100ms delays extends shutdown time by up to 1 second if omniroute is stubborn. Acceptable for a dev tool.
- **Race with signal handler**: If both the exit handler and SIGINT handler try to clean up omnicode, one might find the PID file already removed. Use try/catch around `unlinkSync` and `kill` to handle gracefully.
