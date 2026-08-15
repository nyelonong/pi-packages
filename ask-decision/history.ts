export type DecisionAnswer =
	| { kind: "selected"; optionId: string }
	| { kind: "custom"; text: string };

export interface DecisionOption {
	id: string;
	label: string;
	description: string;
	recommended: boolean;
}

export interface DecisionRecord {
	question: string;
	options: DecisionOption[];
	answer: DecisionAnswer;
}

interface ToolResultEntry {
	type: "message";
	message: {
		role: "toolResult";
		toolName: string;
		details?: unknown;
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isDecisionOption(value: unknown): value is DecisionOption {
	return (
		isRecord(value) &&
		typeof value.id === "string" &&
		typeof value.label === "string" &&
		typeof value.description === "string" &&
		typeof value.recommended === "boolean"
	);
}

function isDecisionAnswer(value: unknown): value is DecisionAnswer {
	if (!isRecord(value) || typeof value.kind !== "string") return false;
	return (
		(value.kind === "selected" && typeof value.optionId === "string") ||
		(value.kind === "custom" && typeof value.text === "string")
	);
}

function decisionFromEntry(entry: unknown): DecisionRecord | undefined {
	if (!isRecord(entry) || entry.type !== "message" || !isRecord(entry.message)) return undefined;
	const message = entry.message;
	if (message.role !== "toolResult" || message.toolName !== "ask_decision" || !isRecord(message.details)) return undefined;
	const decision = message.details.decision;
	if (!isRecord(decision) || typeof decision.question !== "string" || !Array.isArray(decision.options)) return undefined;
	if (!decision.options.every(isDecisionOption) || !isDecisionAnswer(decision.answer)) return undefined;
	if (decision.options.length < 2 || decision.options.length > 4) return undefined;
	if (decision.options.filter((option) => option.recommended).length !== 1) return undefined;
	if (decision.answer.kind === "selected" && !decision.options.some((option) => option.id === decision.answer.optionId)) {
		return undefined;
	}
	return { question: decision.question, options: decision.options, answer: decision.answer };
}

function rewindFromEntry(entry: unknown): number | undefined {
	if (!isRecord(entry) || entry.type !== "message" || !isRecord(entry.message)) return undefined;
	const message = entry.message;
	if (message.role !== "toolResult" || message.toolName !== "ask_decision" || !isRecord(message.details)) return undefined;
	return message.details.status === "back" && Number.isInteger(message.details.rewind) && (message.details.rewind as number) > 0
		? message.details.rewind as number
		: undefined;
}

export function decisionHistoryFromEntries(entries: readonly unknown[]): DecisionRecord[] {
	const history: DecisionRecord[] = [];
	for (const entry of entries) {
		const rewind = rewindFromEntry(entry);
		if (rewind !== undefined) {
			history.splice(Math.max(0, history.length - rewind));
			continue;
		}
		const decision = decisionFromEntry(entry);
		if (decision !== undefined) history.push(decision);
	}
	return history;
}

export function reopenDecision(history: readonly DecisionRecord[], index: number): {
	decision: DecisionRecord | undefined;
	discarded: DecisionRecord[];
} {
	if (!Number.isInteger(index) || index < 0 || index >= history.length) {
		return { decision: undefined, discarded: [] };
	}
	return { decision: history[index], discarded: history.slice(index + 1) };
}

export function reopenPreviousDecision(history: readonly DecisionRecord[]): {
	decision: DecisionRecord | undefined;
	discarded: DecisionRecord[];
} {
	return reopenDecision(history, history.length - 1);
}
