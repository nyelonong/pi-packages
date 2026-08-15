---
name: verify
description: Prove a completion claim with fresh, proportional evidence after the last relevant change.
---

# Verify

Name the claim being verified. Run the smallest relevant command after the last relevant change. Use the repository's documented gate when it exists; otherwise choose the narrowest command that proves the claim.

Report the command, pass or fail result, passed and skipped test counts where applicable, and what the evidence does not cover. Do not treat stale output, a subagent report, a coverage number, or a process milestone as evidence.

When automation cannot prove a user-visible change, perform a concrete manual smoke check. Report the exact steps and observed result.

Do not change production code while verifying. Hand a failure to `investigate` when the cause is unknown or `implement` when the cause and required change are clear.

End every substantive response with `Next:` and one explicit action.
