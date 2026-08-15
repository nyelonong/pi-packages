---
name: shape
description: Turn an idea into an approved implementation specification. Explore unclear work with one decision at a time; synthesize clear requirements directly.
---

# Shape

Use explore when the request has unresolved scope, behavior, trade-off, or architecture decisions. Read the relevant repository context before proposing a direction. Resolve each decision through `ask_decision`, one at a time and in dependency order. Every option states a recommendation and its reason.

Use synthesis when the requirements are already clear. Do not create clarification work merely to follow a process; draft the specification directly.

Write the draft to `<workspace-root>/docs/specs/YYYY-MM-DD-<topic>.md`. The workspace root is the direct child of `~/Projects` containing the current working directory. Do not commit the draft.

A specification includes:

- Goal.
- Non-goals.
- Constraints.
- Decision log.
- Acceptance criteria.
- Affected roles when the repository defines roles.

Do not plan or implement before the user approves the specification. End every substantive response with `Next:` and one explicit action.
