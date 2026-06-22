## Context

`AGENTS.md` at the repository root contains instructions for AI agents working on the project. GrayMatter manages its own section using a delimited block pattern:

```html
<!-- graymatter:instructions:begin — managed by `graymatter init`; edits inside this block are overwritten -->
...content...
<!-- graymatter:instructions:end -->
```

Content outside the markers is preserved. Content inside the markers is replaced on every `graymatter init`. The Qdrant MCP instructions should follow the same pattern with `qdrant:instructions:begin/end` markers. The marker comment includes the text "managed by `omnicode`" to indicate which tool owns the block.

The current `ensureOpencodeConfig()` in `lib.js` already writes MCP config to `opencode.jsonc` during startup. The agent instructions management is a natural companion — both configure the Qdrant integration for consuming tools (OpenCode config for OpenCode itself, AGENTS.md for AI agents).

## Goals / Non-Goals

**Goals:**
- Create `src/installer/AGENTS.template.md` containing the canonical Qdrant MCP usage instructions for AI agents.
- Add `ensureQdrantAgentInstructions()` that manages the `qdrant:instructions` block in `AGENTS.md` (create, append, or replace).
- Call it during the qdrant configuration step in `runRuntime()`.
- Match the GrayMatter block pattern exactly, using `qdrant:instructions:begin/end` markers.

**Non-Goals:**
- Changing how GrayMatter manages its own block.
- Adding custom markers or block syntax beyond the existing pattern.
- Removing existing content from `AGENTS.md` outside the qdrant block.

## Decisions

1. **Follow GrayMatter's block pattern exactly**

   The marker format is `<!-- <name>:instructions:begin — managed by <tool>; edits inside this block are overwritten -->` and `<!-- <name>:instructions:end -->`. The qdrant block uses:

   ```html
   <!-- qdrant:instructions:begin — managed by `omnicode`; edits inside this block are overwritten -->
   ```

   This matches the existing convention, so agents see a familiar structure.

2. **Template file in `src/installer/`**

   `AGENTS.template.md` lives alongside `lib.js` in `src/installer/`. It contains the full qdrant block including markers. The template is imported at build time via `readFileSync` — no runtime generation of instruction text.

   Alternative considered: Hardcoding the string in `lib.js` — rejected because the template is easier to maintain and review as a standalone file.

3. **Three-mode block management**

   The function reads the current `AGENTS.md` content and checks for the `qdrant:instructions` block:

   - **Not found, file exists**: Append the block at the end of the file.
   - **Not found, file missing**: Create the file from template.
   - **Found**: Replace only the content between the markers. Content before and after the block is preserved.

   This mirrors graymatter's own block management behavior.

4. **Integration timing**

   Call `ensureQdrantAgentInstructions()` inside the qdrant configuration path of `runRuntime()`, right after `ensureOpencodeConfig()`. This ensures the instructions are written once when Qdrant is first configured.

## Risks / Trade-offs

- [Block markers in AGENTS.md may conflict with other tools] → Unlikely — the marker namespace uses the tool name (`qdrant:instructions`), which is specific enough.
- [Template content becomes stale] → The template in `src/installer/` is source-controlled. Updates to it are applied on next runtime invocation.

## Migration Plan

No migration needed. The function only modifies `AGENTS.md`, which is not shipped. Existing content is preserved.

## Open Questions

- None resolved.
