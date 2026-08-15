import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";

import { deriveContext, runCouncil } from "./council.ts";
import { conversationText } from "./conversation.ts";
import { loadSettings, saveSettings } from "./settings.ts";
import { ROLES, type CouncilSettings } from "./types.ts";

function display(result: Awaited<ReturnType<typeof runCouncil>>, settings: CouncilSettings): string {
	const failures = [
		...ROLES.flatMap((role) => {
			const value = result.firstRound[role];
			return value && !value.ok ? [`first-round ${role} (${value.model ?? settings.roles[role]}): ${value.kind} — ${value.message}`] : [];
		}),
		...ROLES.flatMap((role) => {
			const value = result.critiqueRound?.[role];
			return value && !value.ok ? [`critique ${role} (${value.model ?? settings.roles[role]}): ${value.kind} — ${value.message}`] : [];
		}),
	];
	const resolved = ROLES.map((role) => `${role}: ${result.firstRound[role]?.ok ? result.firstRound[role]?.model : settings.roles[role]}`).join("\n");
	const synthesis = result.synthesis;
	let synthesisText: string;
	let synthesisModel = settings.synthesis;
	if (synthesis.ok) {
		synthesisModel = synthesis.model;
		synthesisText = `Recommendation: ${synthesis.value.recommendation}\nRationale: ${synthesis.value.rationale}\nSurviving dissent: ${synthesis.value.survivingDissent.join("; ") || "none"}\nEvidence needed: ${synthesis.value.evidenceNeeded.join("; ") || "none"}\nShared unverified assumptions: ${synthesis.value.sharedUnverifiedAssumptions.join("; ") || "none"}`;
	} else {
		synthesisText = `Synthesis failed: ${synthesis.message}`;
	}
	return ["Council completed", resolved, `Synthesis: ${synthesisModel}`, `Critique round: ${result.critiqueRan ? "ran" : "not needed"}`, `Failed calls: ${failures.length ? failures.join("\n") : "none"}`, `Provider-returned cost: ${result.cost === undefined ? "unavailable" : result.cost}`, synthesisText].join("\n\n");
}

async function configure(ctx: ExtensionCommandContext): Promise<void> {
	if (ctx.mode !== "tui") { ctx.ui.notify("/council-settings is available only in TUI mode.", "warning"); return; }
	const current = await loadSettings();
	const roles = { ...current.roles };
	for (const role of ROLES) {
		const selected = await ctx.ui.input(`Enter ${role} OpenRouter model ID`, current.roles[role]);
		if (!selected) return;
		roles[role] = selected.trim();
	}
	const synthesis = await ctx.ui.input("Enter synthesis OpenRouter model ID", current.synthesis);
	if (!synthesis) return;
	try {
		await saveSettings({ roles, synthesis: synthesis.trim() });
	} catch (error) {
		ctx.ui.notify(error instanceof Error ? error.message : "Council settings are invalid.", "warning");
		return;
	}
	ctx.ui.notify("Council settings saved with owner-only permissions.", "info");
}

async function council(args: string, ctx: ExtensionCommandContext): Promise<void> {
	if (ctx.mode !== "tui") { ctx.ui.notify("/council does not run in print, JSON, RPC, or headless mode.", "warning"); return; }
	const question = args.trim() || (await ctx.ui.input("One council question:"))?.trim();
	if (!question) return;
	const conversation = conversationText(ctx.sessionManager.getEntries());
	const settings = await loadSettings();
	const models = [...ROLES.map((role) => `${role}: ${settings.roles[role]}`), `synthesis: ${settings.synthesis}`].join("\n");
	if (!(await ctx.ui.confirm("Confirm OpenRouter council spend?", `${models}\n\nThe synthesis model will first create a concise brief from this conversation. A second critique round may run. OpenRouter credits will be charged.\n\nQuestion: ${question}`))) return;
	const authResult = await ctx.modelRegistry.getProviderAuth("openrouter");
	const controller = new AbortController();
	const abort = () => controller.abort();
	ctx.signal?.addEventListener("abort", abort, { once: true });
	const unsubscribe = ctx.ui.onTerminalInput((data) => {
		if (data === "\u001b" || data === "\u001b[" || data === "\u001b[ESC") controller.abort();
		return undefined;
	});
	try {
		const auth = authResult ? { apiKey: authResult.auth.apiKey, baseUrl: authResult.auth.baseUrl } : undefined;
		const context = await deriveContext({ settings, auth, question, conversation, signal: controller.signal });
		if (!context.ok) {
			ctx.ui.notify(`Council context brief failed (${context.kind}): ${context.message}`, "warning");
			return;
		}
		const result = await runCouncil({ settings, auth, question, context: context.value.brief, signal: controller.signal });
		const cost = result.cost === undefined || context.cost === undefined ? undefined : result.cost + context.cost;
		ctx.ui.notify(display({ ...result, cost }, settings), result.synthesis.ok ? "info" : "warning");
	} finally {
		unsubscribe();
		ctx.signal?.removeEventListener("abort", abort);
	}
}

export default function registerCouncil(pi: ExtensionAPI): void {
	pi.registerCommand("council-settings", { description: "Configure private OpenRouter council model roles", handler: async (_args, ctx) => configure(ctx) });
	pi.registerCommand("council", { description: "Run a confirmed OpenRouter design council", handler: async (args, ctx) => council(args, ctx) });
}
