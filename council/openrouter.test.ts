import assert from "node:assert/strict";
import test from "node:test";
import { chat } from "./openrouter.ts";

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

test("chat sends a model-specific OpenRouter request and preserves returned cost", async () => {
	let request: Request | undefined;
	const result = await chat({
		auth: { apiKey: "resolved-by-pi", baseUrl: "https://openrouter.ai/api/v1" }, model: "vendor/model", prompt: "private prompt",
		parse: (value) => value as { answer: string }, fetch: async (url, init) => { request = new Request(url, init); return response({ model: "provider/model", usage: { cost: 0.012 }, choices: [{ message: { content: '{"answer":"yes"}' } }] }); },
	});
	assert.equal(result.ok, true);
	if (result.ok) { assert.equal(result.model, "provider/model"); assert.equal(result.cost, 0.012); }
	assert.equal(request?.url, "https://openrouter.ai/api/v1/chat/completions");
	const body = JSON.parse(await request!.text());
	assert.equal(body.model, "vendor/model");
	assert.deepEqual(body.reasoning, { effort: "high" });
});

test("chat rejects non-OpenRouter origins and cancellation without calling fetch", async () => {
	const controller = new AbortController(); controller.abort();
	assert.equal((await chat({ auth: { apiKey: "x", baseUrl: "https://example.com/api/v1" }, model: "a/b", prompt: "x", parse: () => ({}), fetch: async () => { throw new Error("must not fetch"); } })).kind, "auth");
	assert.equal((await chat({ auth: { apiKey: "x" }, model: "a/b", prompt: "x", signal: controller.signal, parse: () => ({}), fetch: async () => { throw new Error("must not fetch"); } })).kind, "cancelled");
});

test("chat accepts fenced JSON and samples malformed output", async () => {
	const fenced = await chat({ auth: { apiKey: "x" }, model: "a/b", prompt: "x", parse: (value) => value as { answer: string }, fetch: async () => response({ choices: [{ message: { content: "```json\n{\"answer\":\"yes\"}\n```" } }] }) });
	assert.equal(fenced.ok, true);
	const malformed = await chat({ auth: { apiKey: "x" }, model: "a/b", prompt: "x", parse: () => undefined, fetch: async () => response({ choices: [{ message: { content: "{}" } }] }) });
	assert.deepEqual(malformed, { ok: false, kind: "malformed", message: "Council model did not follow the required JSON contract.", sample: "{}" });
});
