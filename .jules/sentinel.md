## 2024-06-25 - Replace execSync with execFileSync to prevent shell injection
**Vulnerability:** test/bin.test.js passed unvalidated arguments to execSync -> Command Injection / Shell Injection risk.
**Learning:** execSync evaluates commands in a shell environment, which is vulnerable to injection if arguments are not properly sanitized.
**Prevention:** Use execFileSync which bypasses the shell and executes the command directly with arguments passed as an array.
