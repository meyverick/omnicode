## Context

In the previous migration (`qdrant-container-migration`), the system was updated to store a UUID collection identifier inside a file named `.qdrant` at the project root. This UUID allows multiple project workspaces to isolate their embeddings inside a shared Docker container.

However, the background indexer (located in `src/installer/lib.js`) and the `omnicode status` command (`src/bin/omnicode.js`) were not fully updated to account for `.qdrant` becoming a file. They still attempt to use `.qdrant` as a directory for storing `index.json` and `.indexing`. When `fs` tries to write to or read from `.qdrant/index.json`, it encounters an `ENOTDIR` error, causing the background indexer to crash.

## Goals / Non-Goals

**Goals:**
- Fix the `ENOTDIR` crash occurring in the background indexer.
- Revert the structure of `.qdrant` to be a directory.
- Move the UUID collection ID storage to a file inside the `.qdrant` directory (e.g., `.qdrant/id`).
- Ensure a smooth migration for projects that currently have a `.qdrant` file.

**Non-Goals:**
- Change how Qdrant itself or the shared Docker container works.
- Change the contents or format of `index.json`.

## Decisions

1. **Nested ID File Strategy**
   - **Decision:** Convert `.qdrant` back to a directory and store the collection UUID inside `.qdrant/id`.
   - **Rationale:** This keeps all Qdrant-related state (configuration and indexing cache) self-contained within a single `.qdrant` directory, matching the user's preference and minimizing disruption to existing status and indexer scripts.
   - **Alternative:** Create a new `.omnicode` directory for the index state. Rejected because splitting Qdrant state and configuration across two hidden project files/folders (`.qdrant` and `.omnicode`) is unnecessary fragmentation.

2. **Legacy File Migration**
   - **Decision:** If `.qdrant` exists and is a file, the `resolveCollectionName()` function will read its contents, delete the file via `fs.unlinkSync()`, create the `.qdrant` directory, and write the contents to `.qdrant/id`.
   - **Rationale:** The previous feature was just launched and may already be generating `.qdrant` files in user workspaces. A transparent, on-the-fly migration ensures users won't experience crashes or lose their isolated collection pointers upon upgrading to this fix.

## Risks / Trade-offs

- **[Risk] Migration edge cases** → If `.qdrant` is a file but lacks permissions to be deleted, the script might crash. We will wrap the migration in a try-catch block and fallback to generating a new ID if it fails to convert cleanly.
