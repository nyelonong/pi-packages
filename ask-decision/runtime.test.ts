import assert from "node:assert/strict";
import test from "node:test";

import { prepareDecisionExecution } from "./runtime.ts";

test("blocks a valid decision without interactive UI", () => {
	assert.deepEqual(
		prepareDecisionExecution({ question: "Choose", options: [
			{ id: "a", label: "A", description: "First", recommended: true },
			{ id: "b", label: "B", description: "Second", recommended: false },
		] }, false),
		{ kind: "blocked" },
	);
});

test("rejects invalid tool input before opening UI", () => {
	assert.deepEqual(prepareDecisionExecution({ question: "Choose", options: [] }, true), {
		kind: "invalid",
		error: "provide two to four options",
	});
});
