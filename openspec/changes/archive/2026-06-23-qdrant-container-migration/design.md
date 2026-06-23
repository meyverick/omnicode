## Context

The current vector index architecture utilizes an embedded local Qdrant database running inside the `.qdrant` folder. Because Qdrant MCP servers are bound via `stdio`, both the background indexer (managed by `omnicode`) and the active TUI session (managed by `opencode`) launch parallel Python server processes. This leads to a severe storage lock conflict over the SQLite and WAL directories inside `.qdrant`, effectively bricking the semantic search functionality within the Opencode interface as its tool calls continuously fail. 

## Goals / Non-Goals

**Goals:**
- Transition the `omnicode` background indexer and Opencode MCP server to operate as network clients connecting to a centralized Qdrant service (e.g., Docker container on `localhost:6333`).
- Implement project-level isolation using a unique `COLLECTION_NAME` resolved via a root `.qdrant` file.
- Ensure the background indexer gracefully and explicitly shuts down its temporary Qdrant server connection the moment indexing completes.
- Autonomously manage the lifecycle of the Qdrant Docker container (start on launch, kill on final exit) alongside `omniroute`.

**Non-Goals:**
- We will not install Docker automatically; we assume Docker is already installed on the host machine.

## Decisions

1. **Client-Server Architecture:** We will drop `QDRANT_LOCAL_PATH` from `generateQdrantConfig` and instead use `QDRANT_URL=http://localhost:6333`. This delegates lock management entirely to the Qdrant daemon, enabling concurrent reads and writes.
2. **`.qdrant` Identifier File:** Since multiple workspaces will share the same Qdrant daemon, writing to the default `"references"` collection will pollute the search space. We will introduce a startup check that reads or writes a `.qdrant` file in the project root containing a unique UUID string (e.g., `references-123e4567`). This UUID will be injected as `COLLECTION_NAME`.
3. **Explicit Indexer Shutdown:** We will refactor the lifecycle within `omnicode-runtime.js` and `lib.js` so that `indexReferences()` terminates the MCP server immediately after flushing the final batch, rather than keeping the process suspended until Opencode exits.
4. **Docker Lifecycle Management:** `omnicode-runtime.js` will orchestrate the Qdrant container lifecycle similar to `omniroute`. It will invoke `docker run -d --name omnicode-qdrant -p 6333:6333 qdrant/qdrant` if the container isn't running, and `docker rm -f omnicode-qdrant` when the last Opencode session exits.

## Risks / Trade-offs

- **[Risk]** The user does not have Docker installed.
  **Mitigation:** The initialization step will check if the `docker` command exists and gracefully warn the user, falling back to attempting a connection if a manual service is running.
