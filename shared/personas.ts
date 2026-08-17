export type Role = "architect" | "skeptic" | "pragmatist" | "researcher" | "user";

export interface Persona {
	name: Role;
	lens: string;
	bias: string;
}

export const PERSONAS: Persona[] = [
	{ name: "architect", lens: "Long-term structure, coupling, and reversibility.", bias: "Over-generalizes." },
	{ name: "skeptic", lens: "Failure modes, unsupported assumptions, and counterexamples.", bias: "Risk-averse." },
	{ name: "pragmatist", lens: "Smallest maintainable delivery and operational cost.", bias: "Under-invests in structure." },
	{ name: "researcher", lens: "Evidence and prior art.", bias: "Treats citation as correctness." },
	{ name: "user", lens: "Who uses this, their workflow, and what a failure costs them.", bias: "Assumes the user thinks like the builder." },
];

export const ROLES: Role[] = PERSONAS.map((persona) => persona.name);
