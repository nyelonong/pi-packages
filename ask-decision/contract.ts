export interface DecisionOptionInput {
	id: string;
	label: string;
	description: string;
	recommended: boolean;
}

export interface DecisionInput {
	question: string;
	options: DecisionOptionInput[];
}

export type DecisionInputValidation =
	| { ok: true; value: DecisionInput }
	| { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function parseOption(value: unknown): DecisionOptionInput | undefined {
	if (!isRecord(value)) return undefined;
	if (
		typeof value.id !== "string" ||
		typeof value.label !== "string" ||
		typeof value.description !== "string" ||
		typeof value.recommended !== "boolean"
	) {
		return undefined;
	}
	if (!value.id.trim() || !value.label.trim() || !value.description.trim()) return undefined;
	return { id: value.id, label: value.label, description: value.description, recommended: value.recommended };
}

export function validateDecisionInput(input: unknown): DecisionInputValidation {
	if (!isRecord(input) || typeof input.question !== "string" || !Array.isArray(input.options)) {
		return { ok: false, error: "provide a question and options" };
	}
	if (Object.keys(input).some((key) => key !== "question" && key !== "options")) {
		return { ok: false, error: "unknown decision fields are not allowed" };
	}
	if (!input.question.trim()) return { ok: false, error: "question and option fields must not be blank" };
	if (input.options.length < 2 || input.options.length > 4) {
		return { ok: false, error: "provide two to four options" };
	}
	const parsedOptions: DecisionOptionInput[] = [];
	for (const candidate of input.options) {
		const option = parseOption(candidate);
		if (option === undefined) return { ok: false, error: "question and option fields must not be blank" };
		parsedOptions.push(option);
	}
	if (parsedOptions.filter((option) => option.recommended).length !== 1) {
		return { ok: false, error: "exactly one option must be recommended" };
	}
	const ids = new Set(parsedOptions.map((option) => option.id));
	const labels = new Set(parsedOptions.map((option) => option.label));
	if (ids.size !== parsedOptions.length || labels.size !== parsedOptions.length) {
		return { ok: false, error: "option ids and labels must be unique" };
	}
	return { ok: true, value: { question: input.question, options: parsedOptions } };
}
