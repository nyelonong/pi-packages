---
name: route
description: Pick the destination skill for a substantive request: answer, investigate, shape, plan, implement, verify, go-engineering, go-network-resiliency, domain-language, or creation-router. Use before acting on any request that changes a repo or asks for design, debugging, planning, or verification.
---

# Route

Before acting on a substantive request, pick the destination from the table. Trivial talk — greetings and questions with no repo consequence — needs no routing.

## Decision table

| Signal | Destination |
|---|---|
| Question, discussion, no repo mutation | answer directly, no skill |
| Bug, flaky behavior, unexpected result | investigate |
| Completion claim — "done", "tests pass", "fixed" | verify |
| Feature or change, requirements already clear | implement |
| Feature, requirements fuzzy or a position to stress-test | shape |
| Approved spec spanning more than one logical change | plan |
| Any Go code change | go-engineering |
| Go code calling an HTTP, gRPC, or database service | go-network-resiliency |
| Project term unexplained, or the user explains one | domain-language |
| Pi customization: prompt, skill, extension, slash command, tool, workflow | creation-router |

## Rules

- Route to the least process that covers the request. A single-file fix with an existing failing test goes straight to implement; it does not need shape, and a single-change spec does not need plan.
- When two destinations apply, the stricter one wins: investigate before implement, verify before any completion claim, go-engineering overrides the generic loop for Go changes.
- One word from the user overrides the route. Switch immediately; do not re-litigate the table.
- Do not announce the route or restate the request. Read it, pick the destination, act.
