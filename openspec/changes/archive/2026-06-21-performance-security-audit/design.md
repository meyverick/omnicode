## Context

The omnicode codebase now has two rounds of security/performance hardening. Most critical vulnerabilities (shell injection, PID race, unvalidated input) are closed. This audit targets remaining low-severity issues and starting-latency regressions.

The codebase is small (~300 lines of Node.js, ~125 lines of bash). Each finding has a narrow blast radius but is worth documenting for a tool meant to be a daily driver.

## Goals / Non-Goals

**Goals:**

- Document remaining security edge cases (kill-without-wait, empty session ID, PID-reuse window).
- Document startup-latency improvements (hoisted imports, cached lookups, parallel bash init).
- Specify standalone test coverage so `npm test` works without `opencode`/`omniroute` on PATH.

**Non-Goals:**

- Edit any source or test file. This is an audit-only change.
- Introduce new dependencies or change the public CLI interface.
- Change `package.json` engines, license, or publish configuration.

## Decisions

1. **Kill-with-wait for zombie prevention**

   The current `stop_omniroute_if_idle` sends SIGTERM via `kill "$pid"` but never waits for the process to exit. If `omniroute` hangs, the PID file is removed but the process remains. Adding `wait "$pid"` (with `set +e` to allow non-zero exit) ensures the process is reaped. Alternative considered: `kill -0` polling loop. `wait` is simpler and more reliable for a child process.

2. **Hoist `node:sqlite` dynamic import**

   Currently `const { DatabaseSync } = await import("node:sqlite")` runs inside `getLatestSessionId()` on every DB access. Hoisting it to module scope turns a dynamic import into one cold-start cost. Alternative considered: top-level await. Node.js supports it, and this script is ESM. Top-level await is fine since `package.json` has `"type": "module"` and Node 22+.

3. **Cache `getVersion()` result**

   Currently `getVersion()` reads and parses `package.json` on every call. With a module-level cache variable, the first call reads and caches; subsequent calls return the cached string. Alternative considered: importing `package.json` directly with `createRequire`. That works but caches worse (whole JSON object in memory). A simple string cache is lighter.

4. **Cache cwd resolution**

   `getLatestSessionId(directory = realpathSync(process.cwd()))` calls `realpathSync(process.cwd())` even when no DB lookup is needed (after proposal-to-design refactoring, it's already lazy — only called when `sessionId` is null). Still, the default-parameter expression runs synchronously on every `getLatestSessionId()` call. Moving it into the function body avoids the syscall for the `sessionId` path. Already done in v0.0.4 lazy refactor. Current code is correct — no additional change needed.

5. **Parallelize GrayMatter and OpenSpec init in bash**

   Both `graymatter init` and `openspec init` run sequentially in the runtime script. They are independent and can be backgrounded with `&` and joined with `wait`. This shaves 200–500 ms from startup when both are installed. Alternative considered: running them in Node before spawning bash. Adding Node-side async init before `spawn` would increase JS complexity with no benefit over bash `&`+`wait`.

6. **Standalone unit tests**

   The current `npm test` calls `execSync` on the binary, which fails if `opencode`/`omniroute` aren't on PATH. Adding unit tests that import functions directly and mock external dependencies (like `commandExists`, `isProcessRunning`, `getLatestSessionId`) allows tests to pass on a clean checkout. Alternative considered: installing deps in CI only. That still fails for local developer workflow without the full toolchain.

## Risks / Trade-offs

- **Top-level await** works on Node 22+ but surprises some linters. → Mitigation: `engines` is already `>=22`.
- **Parallel bash init** interleaves log output if both graymatter and openspec log to stderr. → Mitigation: each already logs to a separate file; no terminal interleaving.
- **Mock-based tests** may drift from real behavior if `node:sqlite` API changes. → Mitigation: test the DB function with an in-memory SQLite mock (or keep it as a thin integration test).

## Migration Plan

1. Write spec files for the three new capabilities.
2. Write tasks capturing each finding as a task item.
3. Review together before implementation.
