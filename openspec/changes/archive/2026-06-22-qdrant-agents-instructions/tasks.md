## 1. Template file

- [x] 1.1 Create `src/installer/AGENTS.template.md` with the Qdrant MCP usage instructions block wrapped in `<!-- qdrant:instructions:begin -->` and `<!-- qdrant:instructions:end -->` markers
- [x] 1.2 Ensure the template is referenced from `package.json`'s `files` array so it ships with the npm package

## 2. Block management function

- [x] 2.1 Add `ensureQdrantAgentInstructions()` function that reads `AGENTS.md`, checks for the qdrant block, and creates/appends/replaces as needed
- [x] 2.2 Import the template content via `readFileSync` at module level
- [x] 2.3 Export the function from `lib.js`

## 3. Integration

- [x] 3.1 Call `ensureQdrantAgentInstructions()` in `runRuntime()` after Qdrant config is written

## 4. Tests

- [x] 4.1 Add unit test: AGENTS.md missing → created from template
- [x] 4.2 Add unit test: AGENTS.md exists without qdrant block → block appended
- [x] 4.3 Add unit test: AGENTS.md exists with qdrant block → block content replaced
- [x] 4.4 Add unit test: Content outside the block is preserved on replace
- [x] 4.5 Run full test suite and fix any failures

## 5. Final verification

- [x] 5.1 Run `npm pack --dry-run` to confirm package contents include the template
- [x] 5.2 Commit and push
