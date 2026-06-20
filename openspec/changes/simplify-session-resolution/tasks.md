## 1. Update Node entrypoint

- [x] 1.1 Add a function to detect whether any OpenCode session exists for the current directory by running `opencode session list`.
- [x] 1.2 Update argument parsing to keep `-s <session_id>` support.
- [x] 1.3 Resolve the launch mode: explicit `-s`, automatic `-c`, or no session flag.
- [x] 1.4 Pass the resolved mode to the Bash runtime script.
- [x] 1.5 Remove `.opencode/session.id` creation and UUID generation logic from the Node entrypoint.

## 2. Update Bash runtime wrapper

- [x] 2.1 Accept a mode argument (`-s <id>`, `-c`, or empty) instead of a raw session ID.
- [x] 2.2 Launch `opencode` with the appropriate session argument.
- [x] 2.3 Remove `.opencode/session.id` management from the Bash script.

## 3. Update tests

- [x] 3.1 Update `test/bin.test.js` to test `-s` passthrough and mode resolution.
- [x] 3.2 Update `test/runtime.test.js` to verify `-c` and no-session launches.
- [x] 3.3 Remove tests for `.opencode/session.id` and UUID generation.
- [x] 3.4 Run the test suite and fix any failures.

## 4. Update documentation

- [x] 4.1 Update `wiki/How-it-works.md` to describe the new session resolution behavior.
- [x] 4.2 Update `wiki/Getting-Started.md` to remove `.opencode/session.id` references.
- [x] 4.3 Update `wiki/Troubleshooting.md` if needed.

## 5. Final verification

- [x] 5.1 Run `npm pack --dry-run` to confirm package contents.
- [x] 5.2 Commit the change and push to origin.
