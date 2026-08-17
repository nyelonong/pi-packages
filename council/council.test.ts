import assert from "node:assert/strict";
import test from "node:test";
import { critiqueRequired, deriveContext, runCouncil } from "./council.ts";
import { DEFAULT_SETTINGS } from "./settings.ts";
import { ROLES } from "./types.ts";
import type { CallResult, Opinion } from "./types.ts";

const opinion = (recommendation: string, flags = {}): CallResult<Opinion> => ({ ok: true, model: "m", cost: 1, value: { recommendation, evidence: [], assumptions: [], unknowns: [], ...flags } });

test("deriveContext creates a brief with the configured synthesis model", async () => {
	const result = await deriveContext({ settings: DEFAULT_SETTINGS, auth: { apiKey: "x" }, question: "Question?", conversation: "user: relevant constraint", fetch: async (_url, init) => {
		const body = JSON.parse(String(init?.body)) as { model: string };
		assert.equal(body.model, "x-ai/grok-4.6");
		return new Response(JSON.stringify({ usage: { cost: 0.1 }, choices: [{ message: { content: '{"brief":"relevant constraint"}' } }] }));
	} });
	assert.deepEqual(result, { ok: true, model: "x-ai/grok-4.6", cost: 0.1, usage: { inputTokens: undefined, outputTokens: undefined, cost: 0.1 }, value: { brief: "relevant constraint" } });
});

test("critique runs only for disagreement or explicit material triggers", () => {
	assert.equal(critiqueRequired({ architect: opinion("use cache"), skeptic: opinion("use cache") }), false);
	assert.equal(critiqueRequired({ architect: opinion("use cache"), skeptic: opinion("use queue") }), true);
	assert.equal(critiqueRequired({ architect: opinion("use cache", { materialUnverifiedAssumption: true }) }), true);
});

test("council reports first round and synthesis phases", async () => {
	const phases: string[] = [];
	let calls = 0;
	const result = await runCouncil({ settings: DEFAULT_SETTINGS, auth: { apiKey: "x" }, question: "Question?", context: "evidence", onPhase: (phase) => phases.push(phase), fetch: async (_url, init) => {
		calls++;
		const model = (JSON.parse(String(init?.body)) as { model: string }).model;
		const content = calls <= ROLES.length ? '{"recommendation":"ship","evidence":[],"assumptions":[],"unknowns":[]}' : '{"recommendation":"ship","rationale":"evidence","survivingDissent":[],"evidenceNeeded":[],"sharedUnverifiedAssumptions":[]}';
		return new Response(JSON.stringify({ model, cost: 0.5, choices: [{ message: { content } }] }));
	} });
	assert.equal(calls, ROLES.length + 1);
	assert.equal(result.critiqueRan, false);
	assert.equal(result.cost, (ROLES.length + 1) * 0.5);
	assert.deepEqual(phases, ["first round", "synthesis"]);
});

test("council reports unavailable cost when a request has no returned cost", async () => {
	let calls = 0;
	const result = await runCouncil({ settings: DEFAULT_SETTINGS, auth: { apiKey: "x" }, question: "Question?", context: "evidence", fetch: async (_url, init) => {
		calls++;
		const model = (JSON.parse(String(init?.body)) as { model: string }).model;
		const content = calls <= ROLES.length ? '{"recommendation":"ship","evidence":[],"assumptions":[],"unknowns":[]}' : '{"recommendation":"ship","rationale":"evidence","survivingDissent":[],"evidenceNeeded":[],"sharedUnverifiedAssumptions":[]}';
		return new Response(JSON.stringify({ model, ...(calls === 2 ? {} : { cost: 0.5 }), choices: [{ message: { content } }] }));
	} });
	assert.equal(result.cost, undefined);
});
