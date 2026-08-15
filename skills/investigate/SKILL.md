---
name: investigate
description: Diagnose a bug, flaky behavior, or unexpected result through evidence before proposing any fix.
---

# Investigate

Read the relevant code, configuration, logs, tests, and recent changes before proposing a cause.

Reproduce the issue when practical. Reduce it to the smallest failing behavior. State observations separately from hypotheses. Test one hypothesis at a time with the smallest relevant evidence.

When the issue cannot be reproduced, collect the available logs, versions, configuration, and affected paths. State the strongest supported hypothesis and the exact missing evidence. Do not guess a fix.

Use `ask_decision` only when the repository evidence and user request cannot resolve a decision.

Do not change production code or prescribe an implementation. Stop with the supported cause and hand the fix to `implement`.

End every substantive response with `Next:` and one explicit action.
