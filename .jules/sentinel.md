## 2024-07-02 - Command Injection in Test Suite
**Vulnerability:** test/bin.test.js execSync -> Command Injection.
**Learning:** Test suite execution APIs must be protected from injection payloads even in test environments.
**Prevention:** Replace execSync with execFileSync and pass arguments as an array, including a timeout for DoS resilience.
