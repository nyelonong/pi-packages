import type { DecisionInput } from "./contract.ts";
import type { ToolResult } from "./response.ts";
import { selectedResult } from "./response.ts";

export type InteractionAnswer =
	| { kind: "selected"; optionId: string }
	| { kind: "custom"; text: string }
	| { kind: "cancelled" };

export function answerFromInteraction(decision: DecisionInput, answer: InteractionAnswer): ToolResult {
	if (answer.kind === "selected") return selectedResult(decision, answer.optionId);
	if (answer.kind === "custom") {
		const text = answer.text.trim();
		if (!text) throw new Error("custom answer must not be blank");
		return {
			content: [{ type: "text", text: `Decision: ${text}` }],
			details: { decision: { ...decision, answer: { kind: "custom", text } }, status: "answered" },
		};
	}
	return { content: [{ type: "text", text: "Decision cancelled." }], details: { status: "cancelled" } };
}
