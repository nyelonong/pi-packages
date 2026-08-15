import { ROLES, type CouncilResult, type CouncilSettings } from "./types.ts";

function cell(value: string): string {
	return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim() || "—";
}

function points(values: string[]): string {
	return values.length ? values.map((value) => `• ${cell(value)}`).join("<br>") : "—";
}

function usd(cost: number | undefined): string {
	return cost === undefined ? "Unavailable because one or more calls did not return cost." : `$${cost.toFixed(6)} USD`;
}

export function formatCouncil(result: CouncilResult, settings: CouncilSettings): string {
	const firstRows = ROLES.map((role) => {
		const call = result.firstRound[role];
		if (!call?.ok) return `| ${role} | Failed: ${cell(call?.message ?? "no response")} | — | — | — |`;
		return `| ${role} | ${cell(call.value.recommendation)} | ${points(call.value.evidence)} | ${points(call.value.assumptions)} | ${points(call.value.unknowns)} |`;
	});
	const critiqueRows = result.critiqueRound ? ROLES.map((role) => {
		const call = result.critiqueRound?.[role];
		if (!call?.ok) return `| ${role} | Failed: ${cell(call?.message ?? "no response")} | — |`;
		return `| ${role} | ${points(call.value.critiques)} | ${call.value.position ? cell(call.value.position.recommendation) : "Unchanged or not supplied"} |`;
	}) : ["| — | No critique round | — |"];
	const failures = [
		...ROLES.flatMap((role) => {
			const call = result.firstRound[role];
			return call && !call.ok ? [`- First round, ${role} (${call.model ?? settings.roles[role]}): ${call.kind} — ${call.message}${call.sample ? ` Sample: ${call.sample}` : ""}`] : [];
		}),
		...ROLES.flatMap((role) => {
			const call = result.critiqueRound?.[role];
			return call && !call.ok ? [`- Critique, ${role} (${call.model ?? settings.roles[role]}): ${call.kind} — ${call.message}${call.sample ? ` Sample: ${call.sample}` : ""}`] : [];
		}),
	];
	const synthesis = result.synthesis;
	const synthesisSection = synthesis.ok ? [
		`**Recommendation:** ${synthesis.value.recommendation}`,
		`**Rationale:** ${synthesis.value.rationale}`,
		synthesis.value.quorum ? `**Quorum:** ${synthesis.value.quorum.recommendation}\n- Supporters: ${synthesis.value.quorum.supporters.join(", ") || "none"}\n- Dissenters: ${synthesis.value.quorum.dissenters.join(", ") || "none"}` : "**Quorum:** Not returned by synthesis.",
		`**Surviving dissent:**\n${synthesis.value.survivingDissent.map((value) => `- ${value}`).join("\n") || "- none"}`,
		`**Evidence needed:**\n${synthesis.value.evidenceNeeded.map((value) => `- ${value}`).join("\n") || "- none"}`,
		`**Shared unverified assumptions:**\n${synthesis.value.sharedUnverifiedAssumptions.map((value) => `- ${value}`).join("\n") || "- none"}`,
		synthesis.value.architectureDiagram ? `## Architecture\n\n\`\`\`text\n${synthesis.value.architectureDiagram.trim()}\n\`\`\`` : "",
	].filter(Boolean).join("\n\n") : `Synthesis failed: ${synthesis.message}`;
	const synthesisModel = synthesis.ok ? synthesis.model : settings.synthesis;

	return [
		"# Council",
		`## First round\n\n| Role | Position | Evidence | Assumptions | Unknowns |\n| --- | --- | --- | --- | --- |\n${firstRows.join("\n")}`,
		`## Critique round\n\n| Role | Critiques | Revised position |\n| --- | --- | --- |\n${critiqueRows.join("\n")}`,
		`## Failed calls\n\n${failures.join("\n") || "None"}`,
		`## Provider cost\n\n${usd(result.cost)}`,
		`## Synthesis — ${synthesisModel}\n\n${synthesisSection}`,
	].join("\n\n");
}
