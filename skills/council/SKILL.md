---
name: council
description: Use when the user asks for independent evidence-backed views on one consequential design question, or when a durable design trade-off warrants proposing a council through ask_decision.
---

# Council

Council is an advisory workflow for one consequential design question. It is not an executor,
review, debugger, router, ledger, or planning system.

## Entry

Run council when the user invokes it, or suggest it when a design choice has durable trade-offs and
several competent engineers could reasonably disagree. Before any dispatch, use `ask_decision`
to obtain confirmation. Never dispatch from classification alone.

Do not use council for a defect, an existing diff or branch review, a factual question answerable
from source, or routine implementation. Redirect those to `investigate`, normal review, direct
inspection, or `implement`.

Write the request as exactly one question. If it cannot be expressed as one question, use `shape`
first.

## Roster

Launch these named global agents with fresh context:

| Role | Agent | Lens | Bias |
| --- | --- | --- | --- |
| Architect | `council.architect` | Long-term structure, coupling, reversibility | Over-generalizes. |
| Skeptic | `council.skeptic` | Failure modes and unsupported assumptions | Risk-averse. |
| Pragmatist | `council.pragmatist` | Smallest maintainable delivery and cost | Under-invests in structure. |
| Researcher | `council.researcher` | Repository and primary web evidence | Supplies facts without committing. |

Each profile pins its OpenRouter model and thinking level. Members are read-only. The Researcher
may use web research; no member may write, edit, run a shell, commit, push, or launch subagents.

## First round

Use one parallel `subagent` workflow. Give each member only the question, repository target,
relevant constraints and evidence, its lens, and its bias. Do not expose another member's answer.

Every response must contain:

- position and recommendation;
- evidence with paths or source URLs;
- assumptions and unknowns.

## Conditional critique

Run a second parallel round only when first-round answers recommend materially different
directions, conflict on a non-negotiable constraint, or contain a material unverified assumption.

Give every member all first-round answers and all stated biases. Require one claim-specific critique
for every other member, then either a revised position or `position unchanged` with a reason.

Skip this round for evidence-backed agreement. If any dispatch fails or returns empty, name the
missing role. Never fabricate its position.

## Synthesis

The parent synthesizes, without a fifth subagent. Report, in order:

1. roster with resolved model and thinking level, plus whether the critique round ran;
2. one recommendation and why it wins;
3. surviving disagreement, who holds it, and what evidence would settle it;
4. unverified shared assumptions;
5. provider-reported child cost for this council workflow after completion. Read the workflow's
   aggregate child usage when available; otherwise sum `usage.cost.total` from only this workflow's
   child session artifacts. Report `unavailable` when no provider cost data exists; never estimate
   and never substitute the whole-session total.

Do not write a ledger, specification, plan, or target-repository file as part of council.
