<!-- graymatter:instructions:begin — managed by `graymatter init`; edits inside this block are overwritten -->
## Memory (GrayMatter)

This project has persistent agent memory via the `graymatter` MCP tools:

- `memory_search` (`agent_id`, `query`) — call at the **start of a task** when prior context might matter.
- `memory_add` (`agent_id`, `text`) — call whenever you learn something **durable**: user preferences, decisions, conventions, gotchas.
- `memory_reflect` (`action`, `agent`, `text`/`target`) — update or forget stale facts. ⚠ takes `agent`, not `agent_id`.
- `checkpoint_save` / `checkpoint_resume` (`agent_id`) — snapshot/restore session state before major refactors or across restarts.

Use a stable `agent_id` of the form `<project>-<role>` (e.g. `myapp-backend`). Store conclusions, not conversation logs. Err on the side of remembering.
<!-- graymatter:instructions:end -->

<!-- qdrant:instructions:begin — managed by `omnicode`; edits inside this block are overwritten -->
## Qdrant MCP (Semantic Search)

Qdrant MCP [configured] -> execute semantic search over `./references/`.
Index [maintained] via omnicode. Storage [isolated] -> `./.qdrant/` (local, zero external servers).
Model -> `BAAI/bge-small-en-v1.5` (384 dimensions).

- `qdrant-store(information, metadata?, collection_name?)` -> embed && store text chunk. `information` -> target text. Default collection -> `references`.
- `qdrant-find(query, collection_name?)` -> execute semantic search via natural-language `query` -> retrieve optimal matches.

**Execution Trigger [CRITICAL]:**
Execute `qdrant-find` prior to codebase mutations -> retrieve reference context, architectural patterns, && documentation -> prevent hallucination.
<!-- qdrant:instructions:end -->

<!-- graymatter_cli:instructions:begin — managed by `omnicode`; edits inside this block are overwritten -->
## Memory CLI (GrayMatter CLI)

If the MCP tools are not directly loaded into the model's schema, agents should use the `graymatter` CLI commands in the workspace instead:

- **Search / Recall Memories**:
  `graymatter recall --agent "<agent_id>" "<query>"` (use at the start of a task to fetch prior context).
- **Add / Remember Memories**:
  `graymatter remember --agent "<agent_id>" "<text>"` (use to store durable facts, user choices, or setup gotchas).
- **Session Checkpoints**:
  `graymatter checkpoint save --agent "<agent_id>"` or `graymatter checkpoint resume --agent "<agent_id>"`.
<!-- graymatter_cli:instructions:end -->
