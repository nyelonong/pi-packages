import assert from "node:assert/strict";
import test from "node:test";

import { backResult, blockedResult, selectedResult } from "./response.ts";

const decision = {
	question: "Choose a cache",
	options: [
		{ id: "memory", label: "In-memory", description: "Fast and local", recommended: true },
		{ id: "redis", label: "Redis", description: "Shared", recommended: false },
	],
};

test("returns a structured selected result that persists the decision", () => {
	assert.deepEqual(selectedResult(decision, "memory"), {
		content: [{ type: "text", text: "Decision: In-memory" }],
		details: {
			decision: { ...decision, answer: { kind: "selected", optionId: "memory" } },
			status: "answered",
		},
	});
});

test("returns the prior decision when Back is selected", () => {
	assert.deepEqual(backResult(decision, []), {
		content: [{ type: "text", text: "Reopen decision: Choose a cache" }],
		details: { status: "back", decision, discarded: [], rewind: 1 },
	});
});

test("returns a structured headless block without a persisted answer", () => {
	assert.deepEqual(blockedResult(), {
		content: [{ type: "text", text: "Blocked: user input required in an interactive Pi session." }],
		details: { status: "blocked", reason: "user_input_required" },
	});
});
