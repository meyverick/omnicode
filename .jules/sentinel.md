## 2024-05-24 - Resolve Command Injection in Qdrant Config
**Vulnerability:** Command Injection -> `uvx` shell API usage.
**Learning:** Shell evaluation (e.g. `sh -c` and `cmd.exe /c`) around user-influenced inputs creates command injection risks.
**Prevention:** Executed command as an array passed to `spawn`/`execFile`/child process APIs to prevent shell evaluation.
