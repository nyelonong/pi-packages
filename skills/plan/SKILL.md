---
name: plan
description: Decompose an approved specification into ordered, dependency-declared tasks, each independently testable. Use when the approved spec spans more than one logical change; a single-change spec goes straight to implement.
---

# Plan

Use when the approved spec spans more than one logical change. A single-change spec goes straight to `implement`; do not plan ceremony for a change that fits one task.

Write the plan to `<repository-root>/docs/plans/YYYY-MM-DD-<topic>.md`, referencing the spec it implements. Do not commit the plan. Mirror the open tasks into the task tool when one is available; the file stays the source of truth.

A task:

- Changes one bounded area; split a task that would sprawl.
- Declares the tasks it depends on.
- States the evidence that proves it: the command and what passing means, per `verify`.
- Is one commit — code, tests, and evidence together, per `implement`.

Order tasks by dependency. Keep a `next:` line at the top of the plan naming the single next task; update it after each task's evidence passes.

Execute in order. Run a task's evidence yourself before the next starts; a task whose evidence fails goes to `investigate`, not forward. Update the plan as execution reveals reality — split, reorder, or drop tasks. Never edit the spec to match the plan.

After a dead or cleared session, resume by reading the plan and re-running the last finished task's evidence before the `next:` task. The plan and fresh evidence are the state, not conversation memory.

When work is deferred, append one line to `<repository-root>/docs/backlog.md` — the task and why. Propose deferred work back when the plan finishes.
