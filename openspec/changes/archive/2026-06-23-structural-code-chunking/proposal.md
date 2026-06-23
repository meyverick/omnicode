## Why

The current code chunking algorithm splits source code files sequentially every 50 lines. This naive approach arbitrarily slices functions and classes in half, destroying their semantic context (e.g., separating a function body from its signature). By chunking code structurally (using Abstract Syntax Trees) based on block scopes (functions, classes, methods), we will significantly improve the quality of vector embeddings and context retrieval for LLM code understanding.

## What Changes

- Implementation of a structural code chunker using the `web-tree-sitter` AST parser.
- Introduction of a Dynamic Grammar Loader to lazily download Tree-sitter `.wasm` language parsers (e.g., JavaScript, Python, Go) from a CDN, cache them locally, and use them on-demand to avoid bloating the CLI binary.
- Addition of a manual `omnicode download-language <language>` CLI command to explicitly pre-warm the parser cache (e.g., for offline use).
- Implementation of a hybrid recursive splitter to recursively traverse AST nodes that are larger than the 4000-character Qdrant limit.
- Implementation of "Orphaned Lines" grouping to accurately collect non-block code (e.g., global variables, imports) and associate them with their file.

## Capabilities

### New Capabilities
- `structural-code-chunking`: Core logic for AST-based parsing, recursive hybrid node splitting, and orphaned line capturing for chunk generation.
- `dynamic-grammar-loader`: Mechanism for lazily resolving, downloading, and caching `.wasm` language parsers from a CDN based on file extensions.

### Modified Capabilities


## Impact

- `src/installer/lib.js` (specifically the `chunkFile` function) will be heavily refactored or replaced to route files through the Tree-sitter logic.
- Requires network calls to fetch `.wasm` files when a new language is encountered for the first time.
- Requires `web-tree-sitter` as a new runtime dependency.
- Greatly enhances the relevance of the retrieved context during LLM generation.
