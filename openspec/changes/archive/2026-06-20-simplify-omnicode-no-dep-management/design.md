## Context

The initial `omnicode` implementation tried to be a full installer: it verified and installed OpenCode, OmniRoute, OpenSpec, GrayMatter, and the `opencode-omniroute-auth` plugin automatically. This made the package heavy, required `sudo` for first install, and caused long or hanging installs from GitHub. The user wants a much thinner wrapper that assumes dependencies are already managed by the user.

## Goals / Non-Goals

**Goals:**

- Convert `omnicode` into a thin runtime wrapper.
- Remove all dependency installation/update logic.
- Remove the `opencode-omniroute-auth` plugin configuration.
- Require `opencode` and `omniroute` to be installed; fail clearly if they are missing.
- Warn and skip initialization when GrayMatter or OpenSpec is missing.
- Update documentation so users know they must install dependencies themselves.

**Non-Goals:**

- Providing any install or update commands for dependencies.
- Preserving the previous postinstall lifecycle behavior.
- Keeping the OpenCode plugin configuration logic.

## Decisions

1. Remove the `postinstall` and `preuninstall` scripts.

   npm lifecycle hooks added complexity and required network access during install. Removing them makes the package installable offline once the tarball is downloaded. Alternative considered: keep postinstall but skip it when tools exist. That still leaves unnecessary code and surprising behavior.

2. Delete the installer command files and OpenCode config merger.

   `src/installer/install.js`, `src/installer/commands.js`, and `src/installer/opencode-config.js` are no longer needed. The remaining helper code in `src/installer/lib.js` can be reduced to command presence checks and runtime directory setup. Alternative considered: keep the files unused. That leaves dead code and confusing structure.

3. Make `omnicode` fail fast on missing critical tools.

   `opencode` and `omniroute` are hard requirements; without them the command cannot function. Failing immediately with a clear message is better than trying to install them. Alternative considered: open a browser or print install instructions. That adds scope; a simple error message and manual instructions in the README is enough.

4. Make GrayMatter and OpenSpec optional with warnings.

   These tools enhance the workflow but are not strictly required to launch OpenCode. Skipping their initialization with a warning preserves usability when they are absent. Alternative considered: fail on missing optional tools. That would make the wrapper too strict.

## Risks / Trade-offs

- Users may expect `omnicode` to still install everything. → Update README and wiki prominently to describe manual dependency installation.
- Removing plugin config may break users who relied on it. → This is intentional and documented as a breaking change.
- The package becomes less "batteries included." → In exchange it becomes smaller, faster, and more predictable.

## Migration Plan

1. Remove installer source files and lifecycle scripts.
2. Simplify `src/bin/omnicode.js` to only check for `opencode` and `omniroute`.
3. Update `src/bin/omnicode-runtime.sh` to conditionally run `graymatter` and `openspec` initialization.
4. Update tests to remove install and config merge tests.
5. Update README and wiki pages to list manual install steps.
6. Commit and push.

## Open Questions

- None.
