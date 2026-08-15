import assert from "node:assert/strict";
import test from "node:test";

import { validateDecisionInput } from "./contract.ts";

const validInput = {
	question: "Which cache should we use?",
	options: [
		{ id: "memory", label: "In-memory", description: "Fast and local", recommended: true },
		{ id: "redis", label: "Redis", description: "Shared and durable", recommended: false },
	],
};

test("accepts one question with two to four options and exactly one recommendation", () => {
	assert.deepEqual(validateDecisionInput(validInput), { ok: true, value: validInput });
});

test("rejects inputs without exactly one recommended option", () => {
	assert.deepEqual(validateDecisionInput({ ...validInput, options: validInput.options.map((option) => ({ ...option, recommended: false })) }), {
		ok: false,
		error: "exactly one option must be recommended",
	});
});

test("rejects duplicate option ids and labels", () => {
	assert.deepEqual(
		validateDecisionInput({
			...validInput,
			options: [validInput.options[0], { ...validInput.options[0], label: "Other cache", recommended: false }],
		}),
		{ ok: false, error: "option ids and labels must be unique" },
	);
});

test("rejects a question with fewer than two options", () => {
	assert.deepEqual(validateDecisionInput({ ...validInput, options: [validInput.options[0]] }), {
		ok: false,
		error: "provide two to four options",
	});
});

test("rejects unknown input fields", () => {
	assert.deepEqual(validateDecisionInput({ ...validInput, extra: true }), {
		ok: false,
		error: "unknown decision fields are not allowed",
	});
});

test("rejects blank question and option fields", () => {
	assert.deepEqual(validateDecisionInput({ ...validInput, question: " " }), {
		ok: false,
		error: "question and option fields must not be blank",
	});
});
