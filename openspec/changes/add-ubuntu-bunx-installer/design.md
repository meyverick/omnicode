## Context

The repository is being reworked from a legacy `omos` / `oh-my-opencode-slim` configuration workspace into a focused `omnicode` utility. The only current implementation seed is `scripts/omnicode`, a Bash wrapper that assumes `omniroute` and `opencode` already exist on `PATH`, starts OmniRoute in the background with logs and PID tracking, launches OpenCode, and cleans up the OmniRoute process it started when OpenCode exits and no OpenCode process remains.

There is no root package manifest yet, so this project cannot be installed as a normal global npm package. The package must target Ubuntu first, support `npm install -g omnicode`, require `sudo` for the first installation when needed by the global npm prefix or system paths, update OpenCode configuration, and expose a stable `omnicode` command. The user explicitly requested these install/update mechanisms: OpenCode via its install script, OmniRoute and OpenSpec via global npm packages, `opencode-omniroute-auth` via global npm, and GrayMatter via a pinned Linux AMD64 tarball moved into `/usr/local/bin`.

## Goals / Non-Goals

**Goals:**

- Provide a normal global npm package named `omnicode` installed with `npm install -g omnicode`.
- Make plain `omnicode` the runtime command after installation.
- Make `npm uninstall -g omnicode` the uninstall path.
- Refactor project-owned files into a clearer `omnicode` package structure for installer code, command templates, tests, and documentation.
- Verify each required dependency and install or update it when missing or stale.
- Preserve unrelated user OpenCode configuration while ensuring `plugin: ["opencode-omniroute-auth"]` is present in `opencode.jsonc`.
- Install an `omnicode` command on Ubuntu that initializes GrayMatter and OpenSpec for OpenCode, starts OmniRoute in the background without opening a browser, then launches OpenCode with a persisted project-local session ID.
- Keep the installer idempotent so users can safely rerun it after upgrades or partial failures.

**Non-Goals:**

- Supporting Windows, macOS, Arch, Termux, Docker, or non-Ubuntu Linux distributions in the first implementation.
- Replacing OmniRoute's own setup wizard or provider management.
- Migrating all legacy `omos` documentation and wiki content as part of the installer implementation.
- Managing provider API keys beyond installing the OpenCode plugin and leaving authentication to existing OpenCode or plugin flows.
- Designing cross-project session synchronization beyond the local `.opencode/session.id` file in the directory where `omnicode` is run.

## Decisions

1. Add a root npm package named `omnicode` with a `bin` entry for the runtime command.

   The package is the smallest compatible surface for npm distribution: a root `package.json` with `name: "omnicode"`, an executable bin named `omnicode`, install lifecycle wiring, and files required by the runtime command. Alternative considered: use `npm exec omnicode` as the primary entrypoint. That is less familiar than the standard global package flow and does not match the desired install/run/uninstall lifecycle.

2. Reorganize project-owned implementation files into an `omnicode`-focused structure.

   The implementation should move away from ad hoc legacy script placement by adding clear root-owned folders for installer source, installed command templates, tests, and documentation. A minimal target structure is `src/installer/` for installer logic, `src/templates/` for generated command files, and `test/` or `tests/` for package-level tests. Legacy `omos` material should remain archived or isolated and should not be imported by the new package. Alternative considered: leave everything under `scripts/`. That is faster but keeps the new product coupled to legacy workspace conventions.

3. Implement the installer orchestration in Node.js and keep the installed `omnicode` command as Bash.

   Node is a better fit for package install lifecycle checks, JSON/JSONC config mutation, version checks, and subprocess orchestration. Bash remains appropriate for the runtime command because process lifecycle handling for `omniroute --no-open` and `opencode` is already shell-based. Alternative considered: rewrite everything in Node. That would increase risk around terminal process forwarding and cleanup without a clear benefit for the first Ubuntu release.

4. Make dependency checks command-driven and idempotent.

   The installer should use each tool's command when possible (`command -v`, `--version`, `npm view`/`npm install -g`, and fixed install commands) and rerun install/update steps only when needed. Alternative considered: always reinstall everything. That is simpler but slower, more disruptive, and more likely to overwrite user-controlled installations.

5. Preserve OpenCode config while inserting the requested plugin entry.

   The installer should read `~/.config/opencode/opencode.jsonc` when present, preserve unrelated keys, normalize `plugin` to an array, and add `opencode-omniroute-auth` if missing. If parsing JSONC safely is too large for the first pass, the implementation should support comments through a lightweight dependency or a conservative edit strategy rather than overwriting the file. Alternative considered: call `omniroute setup opencode --auth` and use the bundled `@omniroute/opencode-plugin`. That path is explicitly out of scope for the first implementation; the installer must strictly implement `opencode-omniroute-auth`.

6. Require `sudo` for first-install system changes and rely on npm to expose `omnicode` globally.

   The first Ubuntu implementation should require `sudo` when the global npm prefix or system-managed assets require it. npm should manage the `omnicode` binary through the package `bin` entry, while system-managed assets such as `graymatter` still go under `/usr/local/bin`. Alternative considered: copying a separate installer-managed `/usr/local/bin/omnicode` command. That creates duplicate ownership and complicates `npm uninstall -g omnicode`.

7. Persist OpenCode sessions per project in `.opencode/session.id`.

   On each `omnicode` run, the command should ensure `.opencode/` exists in the current working directory. If `.opencode/session.id` exists and contains a non-empty value, the command should use that value with `opencode -s <session_id>`. If it is missing or empty, the command should generate a UUID, write it to `.opencode/session.id`, and launch `opencode -s <generated_uuid>`. If the user passes `omnicode -s <session_id>`, the command should update `.opencode/session.id` with that manual session ID before launching OpenCode. Alternative considered: keep `-s` as a one-run override. That would surprise users who expect the project session file to reflect the active session.

8. Preserve the legacy background OmniRoute lifecycle.

   The command should continue starting `omniroute --no-open` with `nohup` in the background, writing logs and PID under `~/.local/share/omnicode`, reusing an existing OmniRoute process when present, and stopping only the process it started when no OpenCode process remains. Alternative considered: run OmniRoute in the foreground or use a supervisor. That would change the current UX and complicate the simple Ubuntu command.

9. Make uninstall intentionally narrow.

   `npm uninstall -g omnicode` should remove only the npm-managed `omnicode` package and command. It must not uninstall OmniRoute, `opencode-omniroute-auth`, GrayMatter, OpenSpec, or edit the user's OpenCode config, because those tools/config entries may be used outside `omnicode`. The package should clearly communicate before/during uninstall where npm lifecycle support allows, and in docs, that those touched dependencies remain installed. Alternative considered: remove every dependency installed by `omnicode`. That is unsafe because global tools and OpenCode config can be shared with other workflows.

## Risks / Trade-offs

- Running remote install scripts and global npm installs can fail because of network, permissions, `sudo`, or npm configuration issues. → Print each command before execution, stop on failure, and make reruns safe.
- GrayMatter installation uses a pinned Linux AMD64 tarball and `sudo mv`. → Detect architecture and Ubuntu/Linux before running; fail clearly on unsupported platforms.
- Updating `opencode.jsonc` can damage comments or formatting if handled as plain JSON. → Use JSONC-aware parsing/writing or a narrow append strategy; back up the file before writing.
- Version freshness checks vary by tool. → Treat missing tools as install-required; for up-to-date checks, use robust checks where available and document any best-effort checks.
- Starting `omniroute --no-open` on every `omnicode` run can conflict with an existing OmniRoute process. → Reuse the existing wrapper behavior that detects a running OmniRoute process and only starts one when needed.
- Project-local `.opencode/session.id` might be stale or manually edited. → Treat it as an opaque OpenCode session ID, trim whitespace, regenerate only when missing or empty, persist explicit `-s` overrides, and avoid validating against OpenCode internals.
- Folder refactoring can accidentally mix legacy `omos` files into the new package. → Keep package `files` explicit and add tests/pack validation to verify only intended installer assets ship.
- Users may expect uninstall to remove every dependency the installer touched. → Keep uninstall narrow, print the remaining tools explicitly, and document manual cleanup responsibility.

## Migration Plan

1. Create the new project folder structure for package metadata, installer source, command template, tests, and docs.
2. Add the root package and npm-managed `omnicode` bin without importing legacy `omos` helpers.
3. Move or adapt `scripts/omnicode` into the installer-managed command template, preserving background OmniRoute behavior and adding `.opencode/session.id` session persistence.
4. Implement installer dependency checks and config mutation behind an idempotent command.
5. Add focused tests for command generation, OpenCode config merge behavior, session ID behavior, and install-plan decisions that can run without modifying the real system.
6. Implement the narrow uninstall path and user notice.
7. Document the Ubuntu install command, uninstall behavior, and the runtime behavior.

Rollback is manual beyond `npm uninstall -g omnicode`: npm uninstall removes the `omnicode` package/command only. OmniRoute, `opencode-omniroute-auth`, GrayMatter, OpenSpec, and OpenCode config changes remain in place unless the user removes them manually.

## Resolved Decisions

- The published npm package name SHALL be `omnicode`.
- The install command SHALL be `npm install -g omnicode`.
- The run command SHALL be `omnicode`.
- The uninstall command SHALL be `npm uninstall -g omnicode`.
- The first installer implementation SHALL require `sudo` and SHALL NOT provide a user-local fallback.
- The first installer implementation SHALL strictly use `opencode-omniroute-auth` and SHALL NOT offer the bundled `@omniroute/opencode-plugin` path.
- A manual `omnicode -s <session_id>` override SHALL update `.opencode/session.id`.
- Package uninstall SHALL remove only the npm-managed `omnicode` package/command and SHALL inform the user where npm lifecycle support allows, and in docs, that OmniRoute, `opencode-omniroute-auth`, GrayMatter, and OpenSpec remain installed.
