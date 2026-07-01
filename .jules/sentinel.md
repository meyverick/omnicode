## 2025-02-23 - Command Injection in Qdrant MCP Config
**Vulnerability:** Command string interpolation via `cmd.exe /c` && `sh -c` -> Unprotected shell APIs. -> Command Injection Risk.
**Learning:** Hardcoded shell evaluations using string interpolations pose a direct command execution threat, violating the zero-trust execution model.
**Prevention:** Executed command processes via un-evaluated argument arrays `["uvx", "mcp-server-qdrant"]` -> passed runtime values explicitly via environment object parameter -> bypassing the shell processor completely.
