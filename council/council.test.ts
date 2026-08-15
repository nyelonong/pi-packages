import assert from "node:assert/strict";
import test from "node:test";
import { critiqueRequired, runCouncil } from "./council.ts";
import { DEFAULT_SETTINGS } from "./settings.ts";
import type { CallResult, Opinion } from "./types.ts";

const opinion = (recommendation: string, flags = {}): CallResult<Opinion> => ({ ok: true, model: "m", cost: 1, value: { recommendation, evidence: [], assumptions: [], unknowns: [], ...flags } });

test("critique runs only for disagreement or explicit material triggers", () => {
	assert.equal(critiqueRequired({ architect: opinion("use cache"), skeptic: opinion("use cache") }), false);
	assert.equal(critiqueRequired({ architect: opinion("use cache"), skeptic: opinion("use queue") }), true);
	assert.equal(critiqueRequired({ architect: opinion("use cache", { materialUnverifiedAssumption: true }) }), true);
});

test("council skips critique for agreement and sums only returned costs", async () => {
	let calls = 0;
	const result = await runCouncil({ settings: DEFAULT_SETTINGS, auth: { apiKey: "x" }, question: "Question?", context: "evidence", fetch: async (_url, init) => {
		calls++;
		const model = (JSON.parse(String(init?.body)) as { model: string }).model;
		const content = calls <= 4 ? '{"recommendation":"ship","evidence":[],"assumptions":[],"unknowns":[]}' : '{"recommendation":"ship","rationale":"evidence","survivingDissent":[],"evidenceNeeded":[],"sharedUnverifiedAssumptions":[]}';
		return new Response(JSON.stringify({ model, cost: 0.5, choices: [{ message: { content } }] }));
	} });
	assert.equal(calls, 5);
	assert.equal(result.critiqueRan, false);
	assert.equal(result.cost, 2.5);
});

test("council reports unavailable cost when a request has no returned cost", async () => {
	let calls = 0;
	const result = await runCouncil({ settings: DEFAULT_SETTINGS, auth: { apiKey: "x" }, question: "Question?", context: "evidence", fetch: async (_url, init) => {
		calls++;
		const model = (JSON.parse(String(init?.body)) as { model: string }).model;
		const content = calls <= 4 ? '{"recommendation":"ship","evidence":[],"assumptions":[],"unknowns":[]}' : '{"recommendation":"ship","rationale":"evidence","survivingDissent":[],"evidenceNeeded":[],"sharedUnverifiedAssumptions":[]}';
		return new Response(JSON.stringify({ model, ...(calls === 2 ? {} : { cost: 0.5 }), choices: [{ message: { content } }] }));
	} });
	assert.equal(result.cost, undefined);
});
