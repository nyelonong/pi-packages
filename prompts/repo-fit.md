---
description: Assess whether a GitHub repository is useful for the stated needs
argument-hint: "<GitHub-URL-or-owner/repo> [evaluation criteria]"
---
Assess the GitHub repository `$1`. If `$1` is empty or is neither a GitHub URL nor `owner/repo`, use `ask_decision` to obtain a valid reference and stop. Resolve `owner/repo` input to its GitHub URL if needed.

Use `${@:2}` as optional evaluation criteria. If no criteria are supplied, evaluate practical adoption fit, maintenance, security, licensing, integration effort, and alternatives.

Inspect the repository's README, documentation, source layout, recent activity, releases, license, dependencies, issues, and discussions when available. Use web research and repository inspection. Do not run untrusted repository code or installation scripts.

Produce a concise report with these sections:

## Summary
One paragraph describing the repository and its current maturity.

## 5W+1H
- **What:** What it provides and its main capabilities.
- **Who:** Maintainers, intended users, and notable adopters when verifiable.
- **Why:** The problem it solves and why it exists.
- **When:** Release cadence, recent activity, maturity, and appropriate adoption stage.
- **Where:** Primary ecosystem, platforms, integrations, and deployment context.
- **How:** Architecture, workflow, installation or integration path, and important dependencies.

## Assessment
State strengths, risks, maintenance signals, security or licensing concerns, and credible alternatives when relevant. Clearly separate verified facts from inferences.

## Recommendation
Give a direct verdict: **beneficial**, **possibly beneficial**, or **not beneficial**. Explain it against the supplied evaluation criteria or the default criteria.

## Next step
Recommend exactly one action: adopt, trial, watch, or skip. Include a short, concrete first step.
