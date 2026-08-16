---
name: go-engineering
description: Use for routine Go design, implementation, review, debugging, and refactoring. Establishes a small evidence-led baseline; load a focused skill or reference for APIs, databases, concurrency, security, testing, or outbound network calls when those concerns dominate.
---

# Go Engineering

Start from repository evidence: read `go.mod`, project instructions, nearby code, tests, and CI. Respect the module's declared Go version, build tags, platforms, and existing dependency policy.

## Design

- Prefer clear, idiomatic Go and the standard library.
- Start with concrete types and explicit constructor wiring. Add a narrow interface at the consuming boundary only when substitution is real.
- Keep exported APIs small. Treat them as compatibility commitments.
- Add dependencies only when their value exceeds their maintenance, licensing, security, and transitive cost.
- Do not add abstraction, concurrency, caching, or a framework without a concrete need.

## Correctness

- Return expected failures as errors; reserve panic for violated programmer invariants.
- Add useful context with `%w` when callers need to inspect the cause. Use `errors.Is` and `errors.As` across error chains.
- Keep technical diagnostics separate from user-facing errors. Do not log the same returned error at every layer.
- Pass `context.Context` as the first argument for blocking or request-scoped work. Propagate it; never replace it with `context.Background()` mid-request. Always cancel derived contexts.
- Make ownership explicit. Clone slices or maps only when callers must not share mutable state.
- Close resources promptly and check errors that affect correctness, including iterator, flush, and close errors.

## Concurrency and network calls

Use synchronous code until concurrency has a demonstrated benefit. Before starting a goroutine, identify its owner, exit condition, cancellation path, waiter, error path, channel owner, and bounds on work and memory. Do not hold locks across blocking I/O.

For HTTP, gRPC, database, or other upstream calls, also use `go-network-resiliency`: choose only needed resiliency layers, preserve caller cancellation, retry only safe operations, and distinguish upstream failure from caller or budget expiry.

## Change and validation

Use test-first work for bugs, behavior, public contracts, parsing, state, and reproducible regressions. For mechanical or presentation-only changes, state why a new test has low value and run the smallest fresh proof.

After Go changes, format changed files and run focused tests. Broaden validation by risk:

- concurrent changes: `go test -race` for affected packages;
- dependency or security-boundary changes: review the module diff and run the repository's vulnerability checks;
- performance changes: benchmark before and after; do not claim improvement without measurement;
- shared API or refactor changes: inspect callers and implementations, then run the repository's broader test and static-analysis gates.

Use the repository's documented commands and CI requirements when they are stricter.
