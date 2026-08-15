import assert from "node:assert/strict";
import test from "node:test";

import { decisionHistoryFromEntries, reopenDecision, reopenPreviousDecision } from "./history.ts";

test("restores only confirmed ask_decision results from the active branch", () => {
	const entries = [
		{
			type: "message",
			message: {
				role: "toolResult",
				toolName: "ask_decision",
				details: {
					decision: {
						question: "Choose a cache",
						options: [
							{ id: "redis", label: "Redis", description: "Shared cache", recommended: true },
							{ id: "memory", label: "In-memory", description: "Local cache", recommended: false },
						],
						answer: { kind: "selected", optionId: "redis" },
					},
				},
			},
		},
		{
			type: "message",
			message: {
				role: "toolResult",
				toolName: "ask_decision",
				details: { decision: { question: "Cancelled", options: [], answer: { kind: "cancelled" } } },
			},
		},
		{ type: "message", message: { role: "toolResult", toolName: "bash", details: {} } },
	];

	assert.deepEqual(decisionHistoryFromEntries(entries), [
		{
			question: "Choose a cache",
			options: [
				{ id: "redis", label: "Redis", description: "Shared cache", recommended: true },
				{ id: "memory", label: "In-memory", description: "Local cache", recommended: false },
			],
			answer: { kind: "selected", optionId: "redis" },
		},
	]);
});

test("ignores restored decisions whose selected option does not exist", () => {
	assert.deepEqual(
		decisionHistoryFromEntries([
			{
				type: "message",
				message: {
					role: "toolResult",
					toolName: "ask_decision",
					details: {
						decision: {
							question: "Choose a cache",
							options: [
								{ id: "redis", label: "Redis", description: "Shared cache", recommended: true },
								{ id: "memory", label: "In-memory", description: "Local cache", recommended: false },
							],
							answer: { kind: "selected", optionId: "missing" },
						},
					},
				},
			},
		]),
		[],
	);
});

test("removes superseded decisions after a persisted Back result", () => {
	const entries = [
		{
			type: "message",
			message: {
				role: "toolResult",
				toolName: "ask_decision",
				details: {
					decision: {
						question: "Choose a cache",
						options: [
							{ id: "memory", label: "In-memory", description: "Local", recommended: true },
							{ id: "redis", label: "Redis", description: "Shared", recommended: false },
						],
						answer: { kind: "selected", optionId: "memory" },
					},
				},
			},
		},
		{ type: "message", message: { role: "toolResult", toolName: "ask_decision", details: { status: "back", rewind: 1 } } },
	];
	assert.deepEqual(decisionHistoryFromEntries(entries), []);
});

test("reopening a prior decision discards it and every later dependent decision", () => {
	const history = [
		{
			question: "Choose a cache",
			options: [{ id: "redis", label: "Redis", description: "Shared cache", recommended: true }],
			answer: { kind: "selected" as const, optionId: "redis" },
		},
		{
			question: "Choose a TTL",
			options: [{ id: "hour", label: "One hour", description: "Short-lived", recommended: true }],
			answer: { kind: "selected" as const, optionId: "hour" },
		},
	];

	assert.deepEqual(reopenDecision(history, 0), {
		decision: history[0],
		discarded: [history[1]],
	});
});

test("reopening the previous decision returns the latest confirmed decision", () => {
	const history = [
		{
			question: "Choose a cache",
			options: [{ id: "redis", label: "Redis", description: "Shared cache", recommended: true }],
			answer: { kind: "selected" as const, optionId: "redis" },
		},
	];

	assert.deepEqual(reopenPreviousDecision(history), { decision: history[0], discarded: [] });
});

test("reopening with no prior decision returns no decision", () => {
	assert.deepEqual(reopenPreviousDecision([]), { decision: undefined, discarded: [] });
});
