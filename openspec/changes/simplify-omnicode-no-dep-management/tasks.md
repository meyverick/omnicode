## 1. Package metadata and lifecycle

- [x] 1.1 Remove `postinstall` and `preuninstall` scripts from `package.json`.
- [x] 1.2 Remove `scripts`, `bin`, or other metadata that no longer applies after removing the installer.

## 2. Remove installer and plugin code

- [x] 2.1 Delete `src/installer/install.js`.
- [x] 2.2 Delete `src/installer/commands.js`.
- [x] 2.3 Delete `src/installer/opencode-config.js`.
- [x] 2.4 Reduce `src/installer/lib.js` to utility helpers for runtime directory setup and `command -v` checks.

## 3. Update runtime entrypoint

- [x] 3.1 Update `src/bin/omnicode.js` to fail fast with a clear error if `opencode` or `omniroute` is missing.
- [x] 3.2 Update `src/bin/omnicode.js` to warn and skip GrayMatter/OpenSpec initialization when they are missing.
- [x] 3.3 Update `src/bin/omnicode-runtime.sh` to conditionally call `graymatter` and `openspec` initialization.
- [x] 3.4 Remove any references to `opencode-omniroute-auth` plugin installation or configuration.

## 4. Update tests

- [x] 4.1 Remove tests for dependency installation and plugin config merging.
- [x] 4.2 Add tests for missing `opencode`/`omniroute` failure and missing `graymatter`/`openspec` warnings.
- [x] 4.3 Run the test suite and fix any failures.

## 5. Update documentation

- [x] 5.1 Update README to list manual dependency installation steps before installing `omnicode`.
- [x] 5.2 Update `wiki/Getting-Started.md` and `wiki/Configuration.md` to reflect the simplified model.
- [x] 5.3 Remove any wiki references to automatic installs or the `opencode-omniroute-auth` plugin.

## 6. Final verification

- [x] 6.1 Run `npm pack --dry-run` to confirm the package contents are correct.
- [x] 6.2 Commit the change and push to origin.
