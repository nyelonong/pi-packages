import assert from "node:assert/strict";
import test from "node:test";
import { PetController, assistantHasAnswer, needsHumanTool, readEnabled } from "./pet-control.ts";

const toolCallContent = [{ type: "toolCall", id: "t1", name: "bash", arguments: {} }];
const textAnswer = [{ type: "text", text: "done" }];
const thinkingOnly = [{ type: "thinking", thinking: "hmm" }];

test("does not treat an assistant message as an answer when it only schedules tool calls", () => {
	assert.equal(assistantHasAnswer({ role: "assistant", content: toolCallContent }), false);
});

test("treats an assistant message with non-empty text as an answer", () => {
	assert.equal(assistantHasAnswer({ role: "assistant", content: textAnswer }), true);
	assert.equal(assistantHasAnswer({ role: "assistant", content: [{ type: "text", text: "  " }] }), false);
	assert.equal(assistantHasAnswer({ role: "assistant", content: thinkingOnly }), false);
	assert.equal(assistantHasAnswer({ role: "assistant", content: [] }), false);
});

test("flags tools that need human input", () => {
	assert.equal(needsHumanTool("ask_user"), true);
	assert.equal(needsHumanTool("ask_decision"), true);
	assert.equal(needsHumanTool("confirm_plan"), true);
	assert.equal(needsHumanTool("bash"), false);
	assert.equal(needsHumanTool("read"), false);
});

test("pet is hidden while working and shown only on a delivered answer", () => {
	const c = new PetController();
	assert.equal(c.next({ kind: "agent_start" }), "HIDE");
	assert.equal(c.next({ kind: "assistant_answer", message: { content: toolCallContent } }), null);
	assert.equal(c.next({ kind: "assistant_answer", message: { content: textAnswer } }), "SUCCESS");
});

test("pet waits while a human tool is pending and hides again when it resolves", () => {
	const c = new PetController();
	c.next({ kind: "agent_start" });
	assert.equal(c.next({ kind: "human_tool_start", toolCallId: "a1" }), "WAITING");
	assert.equal(c.next({ kind: "assistant_answer", message: { content: textAnswer } }), null);
	assert.equal(c.next({ kind: "human_tool_end", toolCallId: "a1" }), "HIDE");
});

test("pet reports a finished task on settle", () => {
	const c = new PetController();
	c.next({ kind: "agent_start" });
	assert.equal(c.next({ kind: "agent_settled" }), "SUCCESS");
});

test("/pet command maps to show, hide, close", () => {
	const c = new PetController();
	assert.equal(c.next({ kind: "command", command: "show" }), "WORK");
	assert.equal(c.next({ kind: "command", command: "hide" }), "HIDE");
	assert.equal(c.next({ kind: "command", command: "close" }), "CLOSE");
});

test("readEnabled defaults to on and honors a persisted off", () => {
	assert.equal(readEnabled(undefined), true);
	assert.equal(readEnabled(""), true);
	assert.equal(readEnabled("not json"), true);
	assert.equal(readEnabled(JSON.stringify({ enabled: false })), false);
	assert.equal(readEnabled(JSON.stringify({ enabled: true })), true);
});
