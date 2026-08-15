---
name: implement
description: Use before changing production code. Choose risk-based TDD or proportional verification, then implement the smallest correct change.
---

# Implement

Classify the change before editing code.

Use TDD when it changes a bug, stateful logic, business rule, validation, parser, integration behavior, public contract, or reproducible regression:

1. Write one failing test for an observable behavior.
2. Run it and confirm it fails for the intended reason.
3. Make the smallest change that passes it.
4. Run the focused test and relevant typecheck.

Use direct implementation only for simple wiring, presentation, copy, generated code, mechanical refactors, or one-off internal scripts. State why a new test has low value, then run the smallest relevant fresh proof: typecheck, focused existing test, lint, build, or manual smoke check.

Tests prove outcomes at a public or meaningful internal boundary. Do not add tests that mirror private implementation steps, assert mock calls alone, or chase coverage.

For a deterministically reproducible bug, add a focused regression test. If reproduction depends on an unavailable environment or nondeterministic condition, record the strongest manual or operational evidence instead.

Use `ask_decision` for every unresolved decision requiring the user's answer. Do not leave an open question in prose.

Before claiming a change is complete, state the fresh evidence and its limits.

Commit once per logical, reviewable change: production code, its tests, and verification belong together. Do not commit individual red-green loops, helpers, or intermediate UI steps. Keep a refactor separate only when it is independently useful.
