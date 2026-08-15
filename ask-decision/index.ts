import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { prepareDecisionExecution } from "./runtime.ts";
import { decisionHistoryFromEntries, reopenPreviousDecision } from "./history.ts";
import { answerFromInteraction } from "./interaction.ts";
import { backResult, blockedResult } from "./response.ts";

const PARAMETERS = Type.Object({
	question: Type.String({ description: "The single decision the user must make." }),
	options: Type.Array(
		Type.Object({
			id: Type.String(),
			label: Type.String(),
			description: Type.String(),
			recommended: Type.Boolean(),
		}, { additionalProperties: false }),
		{ minItems: 2, maxItems: 4 },
	),
}, { additionalProperties: false });

export default function (pi: ExtensionAPI): void {
	pi.registerTool({
		name: "ask_decision",
		label: "Ask Decision",
		description: "Ask the user to resolve one blocking decision with concrete options.",
		promptSnippet: "Ask the user to resolve one decision with recommended options.",
		promptGuidelines: [
			"Use ask_decision for every question that requires the user's answer. Do not leave open questions in prose.",
			"Use ask_decision only when repository evidence and the user request cannot resolve the decision.",
		],
		parameters: PARAMETERS,
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const execution = prepareDecisionExecution(params, ctx.hasUI);
			if (execution.kind === "invalid") throw new Error(execution.error);
			if (execution.kind === "blocked") return blockedResult();
			const parsed = execution.decision;

			const history = decisionHistoryFromEntries(ctx.sessionManager.getBranch());
			const options = [
				...parsed.options.map((option) => `${option.label}${option.recommended ? " (Recommended)" : ""} — ${option.description}`),
				"Type something else",
				"Back to previous decision",
			];
			while (true) {
				const choice = await ctx.ui.select(parsed.question, options);
				if (choice === undefined) {
					const cancel = await ctx.ui.confirm("Cancel decision?", "Cancel this unresolved decision?");
					if (cancel) return answerFromInteraction(parsed, { kind: "cancelled" });
					continue;
				}
				const index = options.indexOf(choice);
				if (index === parsed.options.length + 1) {
					const reopened = reopenPreviousDecision(history);
					if (reopened.decision === undefined) {
						ctx.ui.notify("No previous decision to reopen.", "info");
						continue;
					}
					return backResult(reopened.decision, reopened.discarded);
				}
				if (index === parsed.options.length) {
					const text = await ctx.ui.input("Type your answer:");
					if (text === undefined) continue;
					if (!text.trim()) {
						ctx.ui.notify("Custom answer must not be blank.", "warning");
						continue;
					}
					const confirmed = await ctx.ui.confirm("Confirm answer?", text);
					if (!confirmed) continue;
					return answerFromInteraction(parsed, { kind: "custom", text });
				}
				const selected = parsed.options[index];
				if (selected === undefined) throw new Error("selected option does not exist");
				const confirmed = await ctx.ui.confirm("Confirm decision?", `${selected.label}: ${selected.description}`);
				if (!confirmed) continue;
				return answerFromInteraction(parsed, { kind: "selected", optionId: selected.id });
			}
		},
	});
}
