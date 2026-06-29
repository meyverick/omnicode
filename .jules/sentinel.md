## 2024-05-24 - Resolve Command Injection in Qdrant MCP server spawn
**Vulnerability:** `src/installer/lib.js` [Command Injection] -> [CRITICAL].
**Learning:** `generateQdrantConfig` generated shell strings (`sh -c` and `cmd.exe /c`) which concatenated `collectionName` unescaped, allowing command execution.
**Prevention:** Replace string concatenation with command argument arrays and an explicit environment mapping.
