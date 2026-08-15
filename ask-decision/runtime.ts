import type { DecisionInput } from "./contract.ts";
import { validateDecisionInput } from "./contract.ts";

export type DecisionExecution =
	| { kind: "interactive"; decision: DecisionInput }
	| { kind: "blocked" }
	| { kind: "invalid"; error: string };

export function prepareDecisionExecution(input: unknown, hasUI: boolean): DecisionExecution {
	const parsed = validateDecisionInput(input);
	if (!parsed.ok) return { kind: "invalid", error: parsed.error };
	return hasUI ? { kind: "interactive", decision: parsed.value } : { kind: "blocked" };
}
