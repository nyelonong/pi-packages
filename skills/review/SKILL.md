---
name: review
description: Check completed work against its specification first, then against quality, before it is claimed done. Use after implement, before a completion claim or a merge.
---

# Review

Review the change against the spec before quality: a change that reads well but misses the spec is worse than one that meets it and reads badly.

Check the spec's acceptance criteria first, then quality:

- Spec: every acceptance criterion is met or explicitly waived. Findings cite the criterion.
- Quality: the change follows the repository's own standards, the same bar `implement` applies. Findings cite the rule. Run the quality pass under the skeptic persona from the `personas` catalog.

Label findings by severity:

- Critical: misses an acceptance criterion, or violates a rule with real consequences. Blocks completion.
- Minor: would improve the change but does not block it.

Report findings with a repo-relative path and line where applicable. A finding with no location is not a finding.

Use a fresh context when one is available: dispatch the review through the subagent tool so the reviewer has not written the code it checks. A review by the author is weaker but still runs; say so in the report. A subagent's review is a claim, not evidence — the findings stand on their own, and the completion claim still needs `verify`.

Do not change production code while reviewing. Hand critical findings to `implement`; hand spec violations whose cause is unclear to `investigate`.

End every substantive response with `Next:` and one explicit action.
