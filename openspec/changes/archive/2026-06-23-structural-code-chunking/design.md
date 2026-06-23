## Context

The current vector indexer in `src/installer/lib.js` chunks source code text sequentially in 50-line blocks. This approach disregards logical scope, splitting classes and functions across chunks. To improve vector retrieval and contextual relevance for LLMs, we will integrate `web-tree-sitter`, a WebAssembly-based AST parser.

Because bundling all `.wasm` language parsers (JavaScript, Go, Rust, Python, etc.) would bloat the `omnicode` CLI footprint, the design must lazily download the required parsers at runtime.

## Goals / Non-Goals

**Goals:**
- Parse supported source code files into an Abstract Syntax Tree (AST).
- Segment text precisely by logical boundaries (e.g., `function_declaration`, `class_declaration`).
- Lazily download `.wasm` grammar files for new languages on demand, caching them locally.
- Handle massive nodes using a threshold-based recursive hybrid splitter.
- Collect out-of-block orphaned lines and package them as global/module context chunks.
- Fall back gracefully to the current linear chunker if network fails or language is unsupported.

**Non-Goals:**
- We will not drop support for Markdown chunking (which is already somewhat structural via header logic).
- We will not bundle large WASM grammar files in the core npm package distribution.

## Decisions

**1. Tree-sitter Runtime**
We will use the `web-tree-sitter` package. It runs cross-platform without native C++ compilation (unlike standard `tree-sitter` node bindings).

**2. Dynamic Grammar Loader (CDN Strategy)**
Instead of distributing 50MB of parsers, we will download the `.wasm` file from `unpkg.com` or `jsdelivr.net` at runtime upon first encountering a file extension. The file will be cached in the application's local config/data directory.
We will also expose an `omnicode download-language <language>` command. This command reuses the exact same lazy-loader logic but triggers it manually to explicitly download and pre-warm the cache, enabling users to prepare their environment for offline work.
*Alternative considered:* Bundling the 3 most common languages (JS, TS, Python) and downloading the rest. *Rejected:* Let's keep it purely dynamic for all languages to reduce initial bundle size, or maybe bundle just JS/TS since the agent mostly writes in that. We will stick to a pure dynamic fetch approach to keep the architecture uniform.

**3. The Orphaned Lines Tracker**
To ensure no code is dropped, the algorithm will maintain a boolean array corresponding to line numbers in the source file. Any line captured inside a structured block chunk is marked `true`. At the end, contiguous `false` lines are grouped and exported as "Global/Module Scope" chunks with their original file name injected as a header comment.

**4. Recursive Hybrid Splitter for Large Blocks**
Nodes exceeding `4000` characters will not be chunked as one block. The algorithm will recurse into the node's children (e.g., methods of a class) and extract them individually. If a leaf node itself exceeds the limit, it will fall back to linear character slicing.

## Risks / Trade-offs

- **Risk:** CDN unavailability or offline usage.
  - **Mitigation:** Wrap the downloader in a `try/catch`. If downloading the grammar fails, log a warning and gracefully degrade to the legacy 50-line chunker.
- **Risk:** Tree-sitter ABI version mismatches between `web-tree-sitter` and the downloaded `.wasm` file.
  - **Mitigation:** The downloader URL must pin the version or strictly match the tree-sitter version requirement of the `web-tree-sitter` runtime version installed.
