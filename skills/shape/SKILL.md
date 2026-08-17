---
name: shape
description: Turn an idea into an approved implementation specification. Explore unclear work with one decision at a time; synthesize clear requirements directly.
---

# Shape

Use explore when the request has unresolved scope, behavior, trade-off, or architecture decisions. Read the relevant repository context before proposing a direction.

Before enumerating decisions, check the ask itself. If you cannot state what the user wants in one sentence — who it is for, and what success looks like — the question, not the options, is the problem. Probe the intent first:

- Ask the smallest question that would let you state the intent, through `ask_decision`, with your best guess as the recommended option. A user reacts faster to a wrong guess than to a blank question.
- When the answer sounds like what a thoughtful answer should be — "scalable", "clean", "best practice" — rather than what the user wants, ask what they would build if they did not have to justify it, through `ask_decision`, with the concrete readings as options.
- Stop probing when you can predict the user's answer to the next question you would ask.

Probe answers shape the Goal and Non-goals; decisions shape the decision log. Resolve each decision through `ask_decision`, one at a time and in dependency order. Every option states a recommendation and its reason.

Use synthesis when the requirements are already clear. Do not create clarification work merely to follow a process; draft the specification directly.

Write the draft to `<repository-root>/docs/specs/YYYY-MM-DD-<topic>.md`. Determine the repository root from the active project (for example, Git's top-level directory); if no repository root exists, use the current working directory. Do not commit the draft.

A specification includes:

- Goal.
- Non-goals.
- Constraints.
- Decision log.
- Acceptance criteria.
- Affected roles when the repository defines roles.

Before showing the draft, self-check it under the skeptic persona from the `personas` catalog: unsupported assumptions and counterexamples. Fix findings inline.

Do not plan or implement before the user approves the specification. End every substantive response with `Next:` and one explicit action.
