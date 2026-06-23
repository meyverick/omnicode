## Context

The current `callQdrantStore()` sends one chunk at a time via JSON-RPC:

```
for each chunk:
  send tools/call request → wait for response → store response → next chunk
```

With 84710 chunks and ~50ms per request (embedding + storage), this takes ~70 minutes. The MCP server is idle most of the time while waiting to receive the next request.

## Goals / Non-Goals

**Goals:**

- Send up to 10 chunks concurrently using a semaphore pattern.
- Reduce total indexing time from hours to 2-5 minutes for a full index.
- Keep the JSON-RPC protocol unchanged (initialize, notify, concurrent tools/call, exit).
- Handle response ordering: responses can arrive in any order.

**Non-Goals:**

- Changing the JSON-RPC protocol or the MCP server.
- Adding new dependencies (semaphore is implemented with a simple counter).
- Changing the chunking or file walking logic.

## Decisions

1. **Concurrency with a simple counter semaphore**

   Use a counter-based semaphore instead of a library. Track how many requests are in-flight. When a response arrives, decrement the counter and send the next pending chunk. Initial concurrency of 10 — tunable via environment variable `OMNICODE_INDEX_CONCURRENCY`.

2. **Response matching by JSON-RPC ID**

   Each chunk gets a unique JSON-RPC `id`. The response includes the same `id`. When a response arrives on stdout, parse the JSON and match by `id` to determine which chunk was stored. This allows out-of-order responses.

3. **Buffered stdout parsing**

   The MCP server sends responses as JSON lines on stdout. A single `data` event might contain multiple responses or partial responses. Build a buffer and split by newlines, parsing complete JSON objects.

4. **Graceful degradation on error**

   If a chunk fails (MCP error, timeout), log a warning and continue with the next chunk. Don't stop the entire batch on a single failure.

5. **Timeout per chunk**

   Individual chunk requests timeout after 30 seconds. If a response doesn't arrive within 30 seconds of sending the request, log a warning and move on. This prevents one slow chunk from blocking the entire batch.

## Risks / Trade-offs

- **MCP server load**: 10 concurrent requests might overload the embedding model. The concurrency limit can be lowered via environment variable.
- **Out-of-order responses**: JSON-RPC IDs handle this correctly — responses are matched to their requests regardless of arrival order.
- **Memory**: 84710 chunks in memory could be ~200-500MB. Acceptable for a one-shot indexer.

## Migration Plan

1. Rewrite `callQdrantStore()` to use a concurrent batch approach.
2. Add a buffer-based JSON-RPC response parser.
3. Add concurrency limit via `OMNICODE_INDEX_CONCURRENCY` env var.
4. Run the test suite.
5. Test with full `./references/` index.
