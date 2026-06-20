## 1. Package Entry Point

- [x] 1.1 Define the new project folder structure for installer source, runtime command templates, tests, and documentation.
- [x] 1.2 Move or replace legacy script placement so new implementation files live in the `omnicode` package structure.
- [x] 1.3 Add a root `package.json` named `omnicode` with a `bin` entry that supports `npm install -g omnicode` followed by plain `omnicode` execution.
- [x] 1.4 Add the installer source file under the new source path and include a shebang suitable for npm/bin execution.
- [x] 1.5 Define package `files` so only intended installer assets, command templates, tests, and docs are included when packed.

## 2. Installer Platform And Command Helpers

- [x] 2.1 Implement Ubuntu/Linux AMD64 platform detection that exits before changes on unsupported hosts.
- [x] 2.2 Implement first-install `sudo` requirement detection and clear failure messaging when elevated privileges are unavailable.
- [x] 2.3 Implement subprocess helpers that print commands, stream output, and fail fast with useful errors.
- [x] 2.4 Implement command/version detection helpers for installed CLI tools.
- [x] 2.5 Add a dry-run or test seam so install decisions can be tested without mutating the real system.

## 3. Dependency Verification And Remediation

- [x] 3.1 Verify and install/update OpenCode with `curl -fsSL https://opencode.ai/install | bash` when required.
- [x] 3.2 Verify and install/update OmniRoute with `npm install -g omniroute` when required.
- [x] 3.3 Verify and install/update `opencode-omniroute-auth` with `npm install -g opencode-omniroute-auth` when required.
- [x] 3.4 Verify and install/update OpenSpec with `npm install -g @fission-ai/openspec@latest` when required.
- [x] 3.5 Verify and install GrayMatter from the pinned v0.6.0 Linux AMD64 tarball into `/usr/local/bin` when required.

## 4. OpenCode Configuration

- [x] 4.1 Resolve the Ubuntu OpenCode config path as `~/.config/opencode/opencode.jsonc`.
- [x] 4.2 Create OpenCode config when missing with `plugin: ["opencode-omniroute-auth"]`.
- [x] 4.3 Merge `opencode-omniroute-auth` into an existing plugin array without duplicating it.
- [x] 4.4 Preserve unrelated OpenCode config keys and create a backup before writing changes.
- [x] 4.5 Ensure the first implementation does not configure `@omniroute/opencode-plugin`.

## 5. omnicode Command Installation

- [x] 5.1 Add or adapt the `omnicode` command template with executable permissions preserved in the repository.
- [x] 5.2 Rely on npm global bin handling to expose the package-managed `omnicode` command on `PATH`.
- [x] 5.3 Ensure reinstalling with `npm install -g omnicode` replaces the package-managed command without duplicates.
- [x] 5.4 Detect and warn if the npm global bin directory is not currently on `PATH`.

## 6. Uninstall Behavior

- [x] 6.1 Treat `npm uninstall -g omnicode` as the uninstall path that removes only the npm-managed package/command.
- [x] 6.2 Ensure uninstall does not remove OmniRoute, `opencode-omniroute-auth`, GrayMatter, OpenSpec, or OpenCode config entries.
- [x] 6.3 Communicate through npm lifecycle output where supported and documentation that OmniRoute, `opencode-omniroute-auth`, GrayMatter, and OpenSpec were touched by install and remain installed.

## 7. omnicode Runtime Behavior

- [x] 7.1 Run `graymatter init --only opencode` before launching OpenCode.
- [x] 7.2 Run `openspec init --force --tools opencode` before launching OpenCode.
- [x] 7.3 Preserve existing background OmniRoute startup behavior using `nohup omniroute --no-open`, runtime logs, and PID tracking under `~/.local/share/omnicode`.
- [x] 7.4 Reuse an already running OmniRoute process without starting a duplicate background process.
- [x] 7.5 Stop the OmniRoute process started by `omnicode` when OpenCode exits and no other OpenCode process remains.

## 8. Project Session Persistence

- [x] 8.1 Check for `.opencode/session.id` in the current working directory when `omnicode` starts.
- [x] 8.2 Create `.opencode/` when it is missing.
- [x] 8.3 Generate a UUID and write it to `.opencode/session.id` when the file is missing or empty.
- [x] 8.4 Launch `opencode -s <session_id>` using the session ID read from or written to `.opencode/session.id`.
- [x] 8.5 Preserve manual session resume with `omnicode -s <session_id>` by writing `<session_id>` to `.opencode/session.id` and launching `opencode -s <session_id>`.

## 9. Tests And Verification

- [x] 9.1 Add tests for installer install-plan decisions using mocked command availability and versions.
- [x] 9.2 Add tests for OpenCode config creation, merge, preservation, and duplicate prevention.
- [x] 9.3 Add tests or shellcheck-compatible validation for the generated `omnicode` command syntax, background OmniRoute behavior, and session option handling.
- [x] 9.4 Add tests for `.opencode/session.id` reuse, UUID creation, empty-file replacement, manual `-s` persistence, and `.opencode/` directory creation.
- [x] 9.5 Add tests for uninstall removing only `omnicode` and preserving dependency/config state.
- [x] 9.6 Run the available focused tests and a package metadata validation command such as `npm pack --dry-run`.

## 10. Documentation

- [x] 10.1 Update README documentation to describe the new `omnicode` purpose, project structure, and commands: `npm install -g omnicode`, `omnicode`, and `npm uninstall -g omnicode`.
- [x] 10.2 Document installed tools, `sudo` requirement, paths touched, background OmniRoute lifecycle, rerun behavior, and manual rollback steps.
- [x] 10.3 Document uninstall behavior: only `omnicode` is removed; OmniRoute, `opencode-omniroute-auth`, GrayMatter, OpenSpec, and OpenCode config remain installed/touched.
- [x] 10.4 Document `.opencode/session.id` project session behavior and that `omnicode -s <session_id>` updates the session file.
- [x] 10.5 Note that legacy `omos` / `oh-my-opencode-slim` content is not part of the new installer path.
