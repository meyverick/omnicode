## Why

`omnicode` should become the focused entrypoint for running OpenCode through OmniRoute on Ubuntu instead of remaining a legacy `oh-my-opencode-slim` workspace. A normal global npm package gives users the familiar lifecycle: install with `npm install -g omnicode`, run with `omnicode`, and uninstall with `npm uninstall -g omnicode`.

## What Changes

- Add a new npm package named `omnicode` that installs globally with `npm install -g omnicode`.
- Refactor the project folder structure around the new `omnicode` package and command implementation, separating installer source, runtime command templates, tests, and legacy archived material.
- Verify each required dependency is installed and up to date, installing or updating when needed:
  - OpenCode via `curl -fsSL https://opencode.ai/install | bash`.
  - OmniRoute via `npm install -g omniroute`.
  - OmniRoute OpenCode plugin via `npm install -g opencode-omniroute-auth`.
  - OpenSpec via `npm install -g @fission-ai/openspec@latest`.
  - GrayMatter via the pinned Linux AMD64 release tarball and install into `/usr/local/bin`.
- Ensure OpenCode config contains the OmniRoute plugin entry in `opencode.jsonc` without removing unrelated config.
- Expose the Ubuntu `omnicode` command-line utility through the npm-managed global package bin.
- Define `npm uninstall -g omnicode` as the uninstall path; uninstall removes only the npm-managed `omnicode` command/package and informs the user that OmniRoute, `opencode-omniroute-auth`, GrayMatter, and OpenSpec were touched by install and remain installed.
- Update the `omnicode` runtime flow to initialize project tooling before launching OpenCode:
  - `graymatter init --only opencode`.
  - `openspec init --force --tools opencode`.
  - Start `omniroute --no-open` in the background using the same log/PID managed lifecycle as the legacy script.
  - Resolve an OpenCode session from `.opencode/session.id`, creating `.opencode/` and a new UUID when missing, then launch `opencode -s <session_id>`.

## Capabilities

### New Capabilities

- `ubuntu-npm-installer`: Covers the npm installer, dependency verification/update behavior, OpenCode plugin configuration, project folder structure refactor, and the installed `omnicode` Ubuntu command runtime sequence.

### Modified Capabilities

- None.

## Impact

- Adds a root-level package/distribution path because the repo currently has no root `package.json` for global npm installation.
- Reorganizes project-owned source folders so implementation files are structured around `omnicode` rather than legacy `omos` helpers.
- Affects `scripts/omnicode` or its successor installed command wrapper.
- Creates or reads project-local `.opencode/session.id` files in directories where users run `omnicode`.
- Writes user-level config and global package-managed binaries on Ubuntu, including OpenCode config under the user config directory and `omnicode` on `PATH`.
- `npm uninstall -g omnicode` affects only the npm-managed `omnicode` package/command; dependency cleanup remains manual and explicitly communicated.
- Depends on shell access, `curl`, `tar`, `npm` package execution, and `sudo` for the first installation.
- Keeps legacy `omos`/`oh-my-opencode-slim` files out of the new installer path.
