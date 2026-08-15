import type { DecisionInput } from "./contract.ts";

export interface ToolResult {
	content: Array<{ type: "text"; text: string }>;
	details: Record<string, unknown>;
}

export function selectedResult(decision: DecisionInput, optionId: string): ToolResult {
	const option = decision.options.find((candidate) => candidate.id === optionId);
	if (option === undefined) throw new Error("selected option does not exist");
	return {
		content: [{ type: "text", text: `Decision: ${option.label}` }],
		details: {
			decision: { ...decision, answer: { kind: "selected", optionId } },
			status: "answered",
		},
	};
}

export function backResult(decision: DecisionInput, discarded: readonly DecisionInput[]): ToolResult {
	return {
		content: [{ type: "text", text: `Reopen decision: ${decision.question}` }],
		details: { status: "back", decision, discarded, rewind: discarded.length + 1 },
	};
}

export function blockedResult(): ToolResult {
	return {
		content: [{ type: "text", text: "Blocked: user input required in an interactive Pi session." }],
		details: { status: "blocked", reason: "user_input_required" },
	};
}
