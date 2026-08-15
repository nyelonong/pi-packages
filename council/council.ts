import { chat, type OpenRouterAuth } from "./openrouter.ts";
import { ROLES, type CallResult, type CouncilResult, type Critique, type Decision, type Opinion, type Role, type CouncilSettings } from "./types.ts";

const ROLE_DETAILS: Record<Role, { lens: string; bias: string }> = {
	architect: { lens: "Long-term structure, coupling, and reversibility.", bias: "Over-generalizes." },
	skeptic: { lens: "Failure modes, unsupported assumptions, and counterexamples.", bias: "Risk-averse." },
	pragmatist: { lens: "Smallest maintainable delivery and operational cost.", bias: "Under-invests in structure." },
	researcher: { lens: "Evidence and prior art.", bias: "Supplies facts without committing." },
};

function strings(value: unknown): string[] | undefined {
	return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : undefined;
}

export function parseOpinion(value: unknown): Opinion | undefined {
	if (!value || typeof value !== "object") return undefined;
	const item = value as Record<string, unknown>;
	if (!Object.keys(item).every((key) => ["recommendation", "evidence", "assumptions", "unknowns", "nonNegotiableConflict", "materialUnverifiedAssumption"].includes(key))) return undefined;
	const evidence = strings(item.evidence), assumptions = strings(item.assumptions), unknowns = strings(item.unknowns);
	if (typeof item.recommendation !== "string" || !evidence || !assumptions || !unknowns) return undefined;
	if (item.nonNegotiableConflict !== undefined && typeof item.nonNegotiableConflict !== "boolean") return undefined;
	if (item.materialUnverifiedAssumption !== undefined && typeof item.materialUnverifiedAssumption !== "boolean") return undefined;
	return { recommendation: item.recommendation, evidence, assumptions, unknowns, nonNegotiableConflict: item.nonNegotiableConflict as boolean | undefined, materialUnverifiedAssumption: item.materialUnverifiedAssumption as boolean | undefined };
}

function parseCritique(value: unknown): Critique | undefined {
	if (!value || typeof value !== "object") return undefined;
	const item = value as Record<string, unknown>;
	if (!Object.keys(item).every((key) => ["critiques", "position", "unchanged"].includes(key))) return undefined;
	const critiques = strings(item.critiques), position = parseOpinion(item.position);
	if (!critiques || !position || (item.unchanged !== undefined && typeof item.unchanged !== "boolean")) return undefined;
	return { critiques, position, unchanged: item.unchanged as boolean | undefined };
}

function parseDecision(value: unknown): Decision | undefined {
	if (!value || typeof value !== "object") return undefined;
	const item = value as Record<string, unknown>;
	if (!Object.keys(item).every((key) => ["recommendation", "rationale", "survivingDissent", "evidenceNeeded", "sharedUnverifiedAssumptions"].includes(key))) return undefined;
	const survivingDissent = strings(item.survivingDissent), evidenceNeeded = strings(item.evidenceNeeded), sharedUnverifiedAssumptions = strings(item.sharedUnverifiedAssumptions);
	if (typeof item.recommendation !== "string" || typeof item.rationale !== "string" || !survivingDissent || !evidenceNeeded || !sharedUnverifiedAssumptions) return undefined;
	return { recommendation: item.recommendation, rationale: item.rationale, survivingDissent, evidenceNeeded, sharedUnverifiedAssumptions };
}

export function critiqueRequired(opinions: Partial<Record<Role, CallResult<Opinion>>>): boolean {
	const successful = Object.values(opinions).filter((result): result is Extract<CallResult<Opinion>, { ok: true }> => Boolean(result?.ok));
	return new Set(successful.map((result) => result.value.recommendation.trim().toLowerCase())).size > 1 || successful.some((result) => result.value.nonNegotiableConflict || result.value.materialUnverifiedAssumption);
}

function prompt(question: string, context: string, role: Role): string {
	const detail = ROLE_DETAILS[role];
	return `Answer one council question as the ${role}. Lens: ${detail.lens} Bias to correct for: ${detail.bias}\nQuestion: ${question}\nExplicit evidence:\n${context || "(none)"}\nReturn only JSON: {"recommendation":string,"evidence":string[],"assumptions":string[],"unknowns":string[],"nonNegotiableConflict"?:boolean,"materialUnverifiedAssumption"?:boolean}.`;
}

function totalCost(results: CallResult<unknown>[]): number | undefined {
	if (!results.every((result) => result.ok)) return undefined;
	const completed = results as Extract<CallResult<unknown>, { ok: true }>[];
	return completed.every((result) => typeof result.cost === "number") ? completed.reduce((sum, result) => sum + (result.cost ?? 0), 0) : undefined;
}

export interface RunCouncilInput { settings: CouncilSettings; auth: OpenRouterAuth | undefined; question: string; context: string; signal?: AbortSignal; fetch?: typeof fetch; }

export async function runCouncil(input: RunCouncilInput): Promise<CouncilResult> {
	const firstEntries = await Promise.all(ROLES.map(async (role) => [role, await chat({ auth: input.auth, model: input.settings.roles[role], prompt: prompt(input.question, input.context, role), signal: input.signal, fetch: input.fetch, parse: parseOpinion })] as const));
	const firstRound = Object.fromEntries(firstEntries) as Partial<Record<Role, CallResult<Opinion>>>;
	const critiqueRan = critiqueRequired(firstRound);
	let critiqueRound: Partial<Record<Role, CallResult<Critique>>> | undefined;
	if (critiqueRan) {
		const transcript = JSON.stringify(firstRound);
		const entries = await Promise.all(ROLES.map(async (role) => [role, await chat({ auth: input.auth, model: input.settings.roles[role], prompt: `Critique the following first-round council outputs claim by claim as ${role}. Return only JSON: {"critiques":string[],"position":Opinion,"unchanged"?:boolean}.\n${transcript}`, signal: input.signal, fetch: input.fetch, parse: parseCritique })] as const));
		critiqueRound = Object.fromEntries(entries) as Partial<Record<Role, CallResult<Critique>>>;
	}
	const synthesis = await chat({ auth: input.auth, model: input.settings.synthesis, prompt: `Synthesize this council. Return only JSON: {"recommendation":string,"rationale":string,"survivingDissent":string[],"evidenceNeeded":string[],"sharedUnverifiedAssumptions":string[]}.\nFirst round: ${JSON.stringify(firstRound)}\nCritique round: ${JSON.stringify(critiqueRound ?? {})}`, signal: input.signal, fetch: input.fetch, parse: parseDecision });
	return { firstRound, critiqueRound, synthesis, critiqueRan, cost: totalCost([...Object.values(firstRound), ...Object.values(critiqueRound ?? {}), synthesis]) };
}
