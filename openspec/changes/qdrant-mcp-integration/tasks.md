## 1. Qdrant detection and config generation

- [x] 1.1 Add `detectQdrantMcp()` to `lib.js`: checks `commandExists("uvx")`, probes `uvx mcp-server-qdrant --help`
- [x] 1.2 Add `generateQdrantConfig()` to `lib.js`: returns the MCP entry JSON object with defaults
- [x] 1.3 Add `ensureOpencodeConfig()` to `lib.js`: reads/creates/merges `./opencode.jsonc`, adds Qdrant entry to `mcp` field

## 2. Runtime integration

- [x] 2.1 Add Qdrant config step to `runRuntime()`: runs after omniroute starts, before opencode launches
- [ ] 2.2 Add background indexing step: spawns indexer process after opencode launches
- [x] 2.3 Wire `detectQdrantMcp()` result into config generation (skip if uvx/mcp-server-qdrant not available)

## 3. `omnicode index` subcommand

- [x] 3.1 Add `--index` arg handling to `parseArgs()` in `omnicode.js`
- [ ] 3.2 Add indexing logic: crawl `./references/`, embed files, store in Qdrant via MCP server tools
- [x] 3.3 Run indexer as standalone mode (no runtime startup, just index and exit)

## 4. Tests

- [x] 4.1 Add tests for `detectQdrantMcp()` (tries uvx, returns boolean)
- [x] 4.2 Add tests for `generateQdrantConfig()` (returns correct JSON structure)
- [x] 4.3 Add tests for `ensureOpencodeConfig()` (creates if missing, merges if exists)
- [x] 4.4 Run the test suite and fix any failures

## 5. Final verification

- [x] 5.1 Run `npm pack --dry-run` to confirm package contents
- [ ] 5.2 Commit and push
