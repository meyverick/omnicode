## 1. Audit and close PRs

- [x] 1.1 Close PR #1: "Optimize stopOmnirouteIfIdle by removing synchronous busy-wait loop" — superseded by previous audit work (commit 24b64d5). Comment explaining.
- [x] 1.2 Close PR #3: "Optimize Windows process execution with async concurrency" — async core already accepted in PR #2 merge; `commandExists` async is low-value and would regress existing fixes. Comment explaining.
- [x] 1.3 Close PR #4: "Fix process.env mutation in Env.set" — empty diff, no actionable changes. Comment explaining.
