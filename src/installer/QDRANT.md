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
