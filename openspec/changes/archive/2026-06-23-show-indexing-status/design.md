## Context

The `omnicode status` command provides system state, but currently lacks visibility into the background indexing process. The indexer runs asynchronously inside `omnicode-runtime`, making its state inaccessible to simple status checks unless explicitly exposed.

## Goals / Non-Goals

**Goals:**
- Provide clear `indexing: true` or `indexing: false` output when running `omnicode status`.
- Track the indexer's state accurately within the `omnicode-runtime` process.

**Non-Goals:**
- Provide detailed indexing progress (e.g., % complete, file counts, or ETA).

## Decisions

**Decision 1: State Exposure Mechanism**
- *Rationale*: We will use a file-based state mechanism. `omnicode-runtime` will manage an `indexing.lock` or `indexing.state` file in the `.qdrant` directory. It will create this file when indexing begins and remove it when indexing completes, errors, or aborts. `omnicode status` will simply check for the presence of this file. This approach is highly decoupled, requires no IPC or HTTP endpoints, and accurately reflects the state.

## Risks / Trade-offs

- [Risk] Orphaned state file on crash → The `omnicode-runtime` signal handlers (`SIGINT`, `SIGTERM`) must ensure the state file is cleaned up if the process terminates abruptly to prevent `omnicode status` from showing a false `true`.
