---
name: finish
description: Close a completed plan: run the repository's full gate against the integrated result, then hand the merge decision to the user. Use when a plan's last task is verified.
---

# Finish

When a plan's last task is verified, run the repository's full gate against the integrated result. Per-task evidence proves each task; it does not prove the whole built from them.

Use the repository's documented gate; when none exists, use the widest command set the repository supports: typecheck, lint, and the full test suite.

Then present the merge decision with a recommendation: merge, open a pull request, keep, or discard. The decision is the user's; state your recommendation and its reason first.

Clean up the branch or worktree after the decision. Hand a failing gate to `investigate` when the cause is unknown or `implement` when the cause and required change are clear.

End every substantive response with `Next:` and one explicit action.
