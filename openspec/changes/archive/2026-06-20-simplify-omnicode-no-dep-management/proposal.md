## Why

The current `omnicode` package tries to install and update OpenCode, OmniRoute, OpenSpec, GrayMatter, and the `opencode-omniroute-auth` plugin automatically. This adds complexity, long install times, sudo requirements, and ownership confusion. The tool should be a thin wrapper instead: it should assume the user has installed the required tools and only warn or fail when something is missing.

## What Changes

- Remove dependency installation and update logic from the package.
- **BREAKING**: `npm install -g omnicode` will no longer run `postinstall` remediation.
- **BREAKING**: `omnicode` will no longer install or update OpenCode, OmniRoute, OpenSpec, GrayMatter, or any plugin.
- Remove the `opencode-omniroute-auth` plugin management from OpenCode config.
- `omnicode` will fail with a clear error if `opencode` or `omniroute` is missing.
- `omnicode` will print a warning and skip `graymatter init --only opencode` if GrayMatter is missing.
- `omnicode` will print a warning and skip `openspec init --force --tools opencode` if OpenSpec is missing.
- Update tests, documentation, and README to reflect the simplified model.

## Capabilities

### New Capabilities

- `simplified-dependency-behavior`: Covers presence checks for `opencode` and `omniroute`, optional GrayMatter and OpenSpec warnings, and removal of automatic installs and plugin configuration.

### Modified Capabilities

- None.

## Impact

- Removes `src/installer/install.js`, `src/installer/commands.js`, and most dependency logic from `src/installer/lib.js`.
- Removes `postinstall` and `preuninstall` lifecycle scripts from `package.json`.
- Updates `src/bin/omnicode-runtime.sh` to conditionally run `graymatter` and `openspec` initialization.
- Removes `src/installer/opencode-config.js` and its tests.
- Updates README and wiki to describe manual dependency installation.
- Makes the package smaller and faster to install.
