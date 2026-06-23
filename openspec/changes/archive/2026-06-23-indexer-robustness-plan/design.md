## Context

The current concurrent indexing implementation encounters stability and reliability issues under heavy load and during shutdown sequences. Specifically, race conditions in state saving, GC overhead from redundant parsing, and API payload limit errors cause process hangs and warnings, making the system brittle during background tasks.

## Goals / Non-Goals

**Goals:**
- Eliminate atomic write race conditions during concurrent worker thread flushes.
- Reduce indexing memory footprint and GC pressure.
- Avoid external API errors on unsupported or oversized payloads.
- Dynamically scale the number of indexer worker threads depending on the host's CPU limits to optimize performance and prevent starvation.

**Non-Goals:**
- Implement a completely new language parsing backend.
- Refactor the entire architecture of Qdrant interactions.

## Decisions

- **Dynamic Concurrency**: Read `os.cpus().length` to determine the limit. Define `INDEXING_CONCURRENCY` to default to `Math.max(1, Math.floor(os.cpus().length * 0.25))` dynamically. *Rationale*: Allows automatic optimization without user intervention.
- **WASM Parser Caching & Reuse**: Instead of loading the WASM module and instantiating a parser per file, we cache the compiled WASM modules and reuse a limited pool of parsers. *Rationale*: Massively reduces the V8 garbage collection overhead and memory spikes.
- **Worker Queue Processing**: Introduce a concurrent worker queue in `lib.js` bounded by `INDEXING_CONCURRENCY`. *Rationale*: Prevents `EMFILE` limits and CPU saturation.
- **UUID-based Atomic Writes**: Modify `saveIndexState` to create unique temporary files like `index.json.<uuid>.tmp` before renaming. *Rationale*: Fixes race conditions when multiple workers flush simultaneously.
- **MinerU Guardrails**: Filter out image files smaller than 50KB in `isComplexDocument`. *Rationale*: Prevents 413 Payload Too Large errors from the MinerU API, which strictly rejects tiny/icon images.

## Risks / Trade-offs

- **Risk: WASM caching memory buildup** -> **Mitigation:** Ensure the parser pool matches the number of concurrent workers, preventing unlimited instantiation.
- **Risk: Over-provisioning CPU** -> **Mitigation:** Setting the default at 25% CPU core count (floor) ensures at least 75% of the system remains free for the IDE and language servers.
