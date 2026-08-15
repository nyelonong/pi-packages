import assert from "node:assert/strict";
import test from "node:test";

import { answerFromInteraction } from "./interaction.ts";

const decision = {
	question: "Choose a cache",
	options: [
		{ id: "memory", label: "In-memory", description: "Fast and local", recommended: true },
		{ id: "redis", label: "Redis", description: "Shared", recommended: false },
	],
};

test("returns a custom answer when the free-text row is confirmed", () => {
	assert.deepEqual(answerFromInteraction(decision, { kind: "custom", text: "Use Memcached" }), {
		content: [{ type: "text", text: "Decision: Use Memcached" }],
		details: {
			decision: { ...decision, answer: { kind: "custom", text: "Use Memcached" } },
			status: "answered",
		},
	});
});

test("returns cancellation without persisting a decision", () => {
	assert.deepEqual(answerFromInteraction(decision, { kind: "cancelled" }), {
		content: [{ type: "text", text: "Decision cancelled." }],
		details: { status: "cancelled" },
	});
});
