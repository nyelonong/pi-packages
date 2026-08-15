import assert from "node:assert/strict";
import test from "node:test";
import { formatCouncil } from "./report.ts";
import { DEFAULT_SETTINGS } from "./settings.ts";
import type { CouncilResult } from "./types.ts";

test("formatCouncil uses comparison tables, an ASCII diagram, and USD cost", () => {
	const opinion = { recommendation: "Use pub/sub", evidence: ["Fan-out is required"], assumptions: ["At-least-once"], unknowns: ["Broker"] };
	const result: CouncilResult = {
		firstRound: {
			architect: { ok: true, model: "a/model", cost: 0.1, value: opinion },
			skeptic: { ok: true, model: "s/model", cost: 0.1, value: opinion },
			pragmatist: { ok: true, model: "p/model", cost: 0.1, value: opinion },
			researcher: { ok: true, model: "r/model", cost: 0.1, value: opinion },
		},
		critiqueRound: { architect: { ok: true, model: "a/model", cost: 0.1, value: { critiques: ["Saga is premature"] } } },
		critiqueRan: true,
		cost: 0.27087175,
		synthesis: { ok: true, model: "x-ai/grok-4.6", cost: 0.1, value: {
			recommendation: "Use durable fan-out.", rationale: "The roles agree.", architectureDiagram: "Publisher --> Topic --> Consumers", quorum: { recommendation: "Use pub/sub", supporters: ["architect", "skeptic"], dissenters: ["researcher"] }, survivingDissent: [], evidenceNeeded: [], sharedUnverifiedAssumptions: [],
		} },
	};
	const report = formatCouncil(result, DEFAULT_SETTINGS);
	assert.match(report, /\| Role \| Position \| Evidence \| Assumptions \| Unknowns \|/);
	assert.match(report, /\| Role \| Critiques \| Revised position \|/);
	assert.match(report, /```text\nPublisher --> Topic --> Consumers\n```/);
	assert.match(report, /\$0\.270872 USD/);
});
