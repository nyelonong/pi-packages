import { readFile } from "node:fs/promises";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";

import { runCouncil } from "./council.ts";
import { buildContext } from "./context.ts";
import { loadSettings, saveSettings } from "./settings.ts";
import { ROLES, type CouncilSettings } from "./types.ts";

const MAX_CONTEXT_BYTES = 100_000;

function display(result: Awaited<ReturnType<typeof runCouncil>>, settings: CouncilSettings): string {
	const failed = ROLES.filter((role) => !result.firstRound[role]?.ok);
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
	return ["Council completed", resolved, `Synthesis: ${synthesisModel}`, `Critique round: ${result.critiqueRan ? "ran" : "not needed"}`, `Failed roles: ${failed.length ? failed.join(", ") : "none"}`, `Provider-returned cost: ${result.cost === undefined ? "unavailable" : result.cost}`, synthesisText].join("\n\n");
}

async function configure(ctx: ExtensionCommandContext): Promise<void> {
	if (ctx.mode !== "tui") { ctx.ui.notify("/council-settings is available only in TUI mode.", "warning"); return; }
	const models = ctx.modelRegistry.getAvailable().filter((model) => model.provider === "openrouter").map((model) => model.id);
	if (!models.length) { ctx.ui.notify("No available OpenRouter models. Configure Pi OpenRouter authentication first.", "warning"); return; }
	const current = await loadSettings();
	const roles = { ...current.roles };
	for (const role of ROLES) {
		const selected = await ctx.ui.select(`Select ${role} model`, models);
		if (!selected) return;
		roles[role] = selected;
	}
	const synthesis = await ctx.ui.select("Select synthesis model", models);
	if (!synthesis) return;
	await saveSettings({ roles, synthesis });
	ctx.ui.notify("Council settings saved with owner-only permissions.", "info");
}

async function council(args: string, ctx: ExtensionCommandContext): Promise<void> {
	if (ctx.mode !== "tui") { ctx.ui.notify("/council does not run in print, JSON, RPC, or headless mode.", "warning"); return; }
	if (!ctx.isProjectTrusted()) { ctx.ui.notify("/council requires a trusted project before reading selected files.", "warning"); return; }
	const question = args.trim() || (await ctx.ui.input("One council question:"))?.trim();
	if (!question) return;
	const text = await ctx.ui.editor("Explicit context (optional):");
	if (text === undefined) return;
	const pathsLine = await ctx.ui.input("Optional relative file paths (comma-separated):");
	if (pathsLine === undefined) return;
	let context: string;
	try {
		context = await buildContext({ cwd: ctx.cwd, text, paths: pathsLine.split(",").map((path) => path.trim()).filter(Boolean), maxBytes: MAX_CONTEXT_BYTES, readFile: (path) => readFile(path, "utf8") });
	} catch (error) { ctx.ui.notify(error instanceof Error ? error.message : "Could not read selected context.", "warning"); return; }
	const settings = await loadSettings();
	const models = [...ROLES.map((role) => `${role}: ${settings.roles[role]}`), `synthesis: ${settings.synthesis}`].join("\n");
	if (!(await ctx.ui.confirm("Confirm OpenRouter council spend?", `${models}\n\nA second critique round may run. OpenRouter credits will be charged.\n\nQuestion: ${question}`))) return;
	const authResult = await ctx.modelRegistry.getProviderAuth("openrouter");
	const controller = new AbortController();
	const abort = () => controller.abort();
	ctx.signal?.addEventListener("abort", abort, { once: true });
	const unsubscribe = ctx.ui.onTerminalInput((data) => {
		if (data === "\u001b" || data === "\u001b[" || data === "\u001b[ESC") controller.abort();
		return undefined;
	});
	try {
		const result = await runCouncil({ settings, auth: authResult ? { apiKey: authResult.auth.apiKey, baseUrl: authResult.auth.baseUrl } : undefined, question, context, signal: controller.signal });
		ctx.ui.notify(display(result, settings), result.synthesis.ok ? "info" : "warning");
	} finally {
		unsubscribe();
		ctx.signal?.removeEventListener("abort", abort);
	}
}

export default function registerCouncil(pi: ExtensionAPI): void {
	pi.registerCommand("council-settings", { description: "Configure private OpenRouter council model roles", handler: async (_args, ctx) => configure(ctx) });
	pi.registerCommand("council", { description: "Run a confirmed OpenRouter design council", handler: async (args, ctx) => council(args, ctx) });
}
