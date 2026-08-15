import assert from "node:assert/strict";
import test from "node:test";
import { conversationText } from "./conversation.ts";

test("conversationText includes only user and assistant text messages", () => {
	const result = conversationText([
		{ type: "message", message: { role: "user", content: "Need a design decision." } },
		{ type: "message", message: { role: "tool", content: "secret tool output" } },
		{ type: "message", message: { role: "assistant", content: "Here are the trade-offs." } },
	]);
	assert.equal(result, "user: Need a design decision.\n\nassistant: Here are the trade-offs.");
});
