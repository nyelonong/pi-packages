---
description: Diagnose the last tool failure before deciding whether to retry
---
Classify the last failure as one of: recognized proxy timeout/disconnect, another transient timeout or connection failure, validation or schema error, missing prerequisite, wrong working directory, permission issue, test failure, or unknown.

State the evidence, then choose exactly one next action:

- For a confirmed proxy timeout/disconnect on a confirmed read-only operation, retry the identical operation once now. Do not alter its inputs.
- For another confirmed read-only transient failure, retry the identical operation once only when the evidence supports it.
- Correct the input or prerequisite for every non-transient failure.
- Stop and report the blocker when the cause is outside this workspace, the operation could have made a write, or the operation's authority is unknown.

Never retry a potentially mutating operation: a proxy failure can occur after the remote side accepted it. Do not change files or make remote writes. After a retry, report its result; otherwise end with the command or observation that will prove the next action worked.
