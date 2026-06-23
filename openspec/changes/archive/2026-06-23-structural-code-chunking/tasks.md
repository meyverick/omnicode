## 1. Setup

- [x] 1.1 Add `web-tree-sitter` as a dependency in `package.json`.
- [x] 1.2 Create a new file `src/installer/tree-sitter.js` to house the structural chunking logic.

## 2. Dynamic Grammar Loader

- [x] 2.1 Implement `getOrDownloadLanguage(extension)` to resolve the Tree-sitter language name from file extensions.
- [x] 2.2 Implement HTTP fetch logic to download the required `.wasm` parser from `unpkg.com` if not locally cached.
- [x] 2.3 Add caching mechanism to store and retrieve the `.wasm` file in a stable app configuration directory (e.g., `~/.config/omnicode/grammars`).

## 3. AST Traversal and Chunking

- [x] 3.1 Implement the recursive hybrid splitter function to traverse large AST nodes and break them down if they exceed the 4000-character limit.
- [x] 3.2 Implement the orphaned lines tracking mask to gather lines of code outside of structural blocks into global/module scoped chunks with file header comments.
- [x] 3.3 Create the main `chunkWithTreeSitter(content, filePath)` entrypoint that parses the code, traverses the tree for block scopes (`function_declaration`, `class_declaration`), and outputs structured chunks.

## 4. Integration & Fallbacks

- [x] 4.1 Update the vector indexer flow in `src/installer/lib.js` to invoke `chunkWithTreeSitter` before the standard `chunkFile` logic for source code files.
- [x] 4.2 Wrap the Tree-sitter invocation in a `try/catch` to gracefully fall back to the legacy linear chunker if the grammar fails to download or parsing fails.
- [x] 4.3 Implement the `omnicode download-language <language>` CLI command to allow users to manually trigger the grammar download logic.
