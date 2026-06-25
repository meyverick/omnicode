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
