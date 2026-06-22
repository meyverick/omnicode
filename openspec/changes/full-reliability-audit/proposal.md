## Why

The user experienced two full system crashes while running omnicode with Chrome and OpenCode open — something that never happened before the parallel indexing and MCP readiness gate features were introduced. The crash symptoms (system freeze, forced reboot) suggest resource exhaustion (RAM/swap) or process-level instability rather than a software crash within omnicode. The project has accumulated several reliability-sensitive features over recent changes: parallel chunk indexing (10 concurrent JSON-RPC requests), a long-lived MCP daemon loading a ~90MB ONNX model, background subprocess management (omniroute, uvx, graymatter, openspec), and automated file descriptor usage (logs, PID files, MCP stdin/stdout). A comprehensive audit is needed to identify, quantify, and fix all reliability, robustness, and stability issues before more features are added.

## What Changes

- Audit all child process lifecycle management: orphan detection, cleanup on crash, exit signal handling.
- Audit memory and file descriptor usage: MCP server model load, parallel chunk workers, omniroute process, graymatter/openspec init tools.
- Audit error handling in all async paths: unhandled rejections, try/catch gaps, silent failures in background promises.
- Audit resource limits: default concurrency values, timeout durations, max file handles.
- Fix identified issues with concrete mitigations: reduce default concurrency, add resource monitoring, harden process cleanup, add OOM safeguards.
- Add stress tests for long-running sessions with heavy indexing load.

## Capabilities

### New Capabilities

- `reliability-audit`: Systematic audit of process lifecycle, resource usage, error handling, and crash resilience across all omnicode subsystems.

### Modified Capabilities

- (None — no existing spec-level requirements are changing; this is a cross-cutting quality audit.)

## Impact

- All source files in `src/`: Each file is reviewed and potentially hardened.
- `test/`: New stress tests and reliability regression tests added.
- Default configuration values may change (e.g., concurrency, timeouts).
- No new dependencies introduced.