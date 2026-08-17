import assert from "node:assert/strict";
import test from "node:test";
import { PERSONAS, ROLES } from "./personas.ts";

test("personas have unique names and non-blank lens and bias", () => {
	assert.ok(PERSONAS.length >= 4);
	assert.equal(new Set(PERSONAS.map((persona) => persona.name)).size, PERSONAS.length);
	for (const persona of PERSONAS) {
		assert.ok(persona.lens.trim().length > 0);
		assert.ok(persona.bias.trim().length > 0);
	}
});

test("ROLES lists the persona names in order", () => {
	assert.deepEqual(ROLES, PERSONAS.map((persona) => persona.name));
	for (const role of ROLES) {
		assert.ok(PERSONAS.some((persona) => persona.name === role));
	}
});
