## Why

AI agents working with this project need clear instructions on how to use the Qdrant MCP server for semantic search over the `./references/` directory. Currently, Qdrant usage instructions must be documented manually. GrayMatter manages its instructions in `AGENTS.md` via a delimited block pattern (`<!-- graymatter:instructions:begin -->...<!-- graymatter:instructions:end -->`). The Qdrant MCP instructions should follow the same pattern so they are consistently maintained and never duplicated.

## What Changes

- Create `src/installer/AGENTS.template.md` containing the Qdrant MCP usage instructions for AI agents, wrapped in `<!-- qdrant:instructions:begin -->` and `<!-- qdrant:instructions:end -->` markers.
- Add `ensureQdrantAgentInstructions()` function that:
  1. Creates `AGENTS.md` from template if it does not exist.
  2. Appends the Qdrant block to `AGENTS.md` if the `qdrant:instructions` block is absent.
  3. Replaces the block content if it already exists.
- Call `ensureQdrantAgentInstructions()` during the qdrant configuration step in `runRuntime()`.

## Capabilities

### New Capabilities

- `qdrant-agent-instructions`: Manages Qdrant MCP usage instructions in `AGENTS.md` using a delimited block pattern, ensuring AI agents always have up-to-date guidance for running semantic queries.

### Modified Capabilities

- (None — no existing spec-level requirements are changing.)

## Impact

- `src/installer/AGENTS.template.md`: New file containing the template instructions block.
- `src/installer/lib.js`: Add `ensureQdrantAgentInstructions()` function.
- `src/bin/omnicode-runtime.js`: Call the function during qdrant configuration in `runRuntime()`.
- `test/lib.test.js`: Add tests for block creation, appending, and overwrite.
- `AGENTS.md`: Updated at runtime with the Qdrant instructions block.
