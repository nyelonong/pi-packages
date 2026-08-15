export const ROLES = ["architect", "skeptic", "pragmatist", "researcher"] as const;
export type Role = (typeof ROLES)[number];

export interface CouncilSettings {
	roles: Record<Role, string>;
	synthesis: string;
}

export interface Opinion {
	recommendation: string;
	evidence: string[];
	assumptions: string[];
	unknowns: string[];
	nonNegotiableConflict?: boolean;
	materialUnverifiedAssumption?: boolean;
}

export interface Critique {
	critiques: string[];
	position?: Opinion;
	unchanged?: boolean;
}

export interface Decision {
	recommendation: string;
	rationale: string;
	quorum?: { recommendation: string; supporters: Role[]; dissenters: Role[] };
	survivingDissent: string[];
	evidenceNeeded: string[];
	sharedUnverifiedAssumptions: string[];
}

export interface ProviderUsage {
	inputTokens?: number;
	outputTokens?: number;
	cost?: number;
}

export interface CallSuccess<T> {
	ok: true;
	model: string;
	cost?: number;
	usage?: ProviderUsage;
	value: T;
}

export interface CallFailure {
	ok: false;
	kind: "cancelled" | "timeout" | "provider" | "malformed" | "auth";
	model?: string;
	message: string;
	sample?: string;
}

export type CallResult<T> = CallSuccess<T> | CallFailure;

export interface CouncilResult {
	firstRound: Partial<Record<Role, CallResult<Opinion>>>;
	critiqueRound?: Partial<Record<Role, CallResult<Critique>>>;
	synthesis: CallResult<Decision>;
	critiqueRan: boolean;
	cost?: number;
}
