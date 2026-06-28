## 2025-02-09 - Prevent Command Injection via execSync
**Vulnerability:** Shell Evaluation (execSync) -> Command Injection Risk.
**Learning:** `execSync` executes commands within a shell environment which introduces critical vulnerabilities when processing strings.
**Prevention:** Refactored shell evaluation `execSync` into array arguments `execFileSync`.
