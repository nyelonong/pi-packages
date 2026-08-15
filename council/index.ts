import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";

import { deriveContext, runCouncil } from "./council.ts";
import { conversationText } from "./conversation.ts";
import { formatCouncil } from "./report.ts";
import { loadSettings, saveSettings } from "./settings.ts";
import { ROLES, type CouncilSettings } from "./types.ts";

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

interface CouncilJob {
	controller: AbortController;
	phase: string;
	frame: number;
	timer?: ReturnType<typeof setInterval>;
}

let activeJob: CouncilJob | undefined;

function renderStatus(ctx: ExtensionCommandContext, job: CouncilJob): void {
	ctx.ui.setStatus("council", `${SPINNER[job.frame % SPINNER.length]} Council: ${job.phase}. Use /council-cancel to stop.`);
}

function setPhase(ctx: ExtensionCommandContext, job: CouncilJob, phase: string): void {
	job.phase = phase;
	renderStatus(ctx, job);
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

async function executeCouncil(pi: ExtensionAPI, ctx: ExtensionCommandContext, job: CouncilJob, settings: CouncilSettings, question: string, conversation: string, auth: { apiKey?: string; baseUrl?: string } | undefined): Promise<void> {
	try {
		setPhase(ctx, job, "creating context brief");
		const context = await deriveContext({ settings, auth, question, conversation, signal: job.controller.signal });
		if (!context.ok) {
			ctx.ui.notify(`Council context brief failed (${context.kind}): ${context.message}`, "warning");
			return;
		}
		const result = await runCouncil({
			settings,
			auth,
			question,
			context: context.value.brief,
			signal: job.controller.signal,
			onPhase: (phase) => setPhase(ctx, job, phase),
		});
		const cost = result.cost === undefined || context.cost === undefined ? undefined : result.cost + context.cost;
		pi.sendMessage({ customType: "council-result", content: formatCouncil({ ...result, cost }, settings), display: true, details: { cost, critiqueRan: result.critiqueRan } });
	} catch (error) {
		ctx.ui.notify(error instanceof Error ? `Council failed: ${error.message}` : "Council failed.", "error");
	} finally {
		if (job.timer) clearInterval(job.timer);
		if (activeJob === job) activeJob = undefined;
		ctx.ui.setStatus("council", undefined);
	}
}

async function council(pi: ExtensionAPI, args: string, ctx: ExtensionCommandContext): Promise<void> {
	if (ctx.mode !== "tui") { ctx.ui.notify("/council does not run in print, JSON, RPC, or headless mode.", "warning"); return; }
	if (activeJob) { ctx.ui.notify(`A council is already running (${activeJob.phase}). Use /council-cancel to stop it.`, "warning"); return; }
	const question = args.trim() || (await ctx.ui.input("One council question:"))?.trim();
	if (!question) return;
	const conversation = conversationText(ctx.sessionManager.getEntries());
	const settings = await loadSettings();
	const models = [...ROLES.map((role) => `${role}: ${settings.roles[role]}`), `synthesis: ${settings.synthesis}`].join("\n");
	if (!(await ctx.ui.confirm("Confirm OpenRouter council spend?", `${models}\n\nThe synthesis model will first create a concise brief from this conversation. A second critique round may run. OpenRouter credits will be charged.\n\nQuestion: ${question}`))) return;
	const authResult = await ctx.modelRegistry.getProviderAuth("openrouter");
	const job: CouncilJob = { controller: new AbortController(), phase: "starting", frame: 0 };
	activeJob = job;
	renderStatus(ctx, job);
	job.timer = setInterval(() => { job.frame++; renderStatus(ctx, job); }, 300);
	void executeCouncil(pi, ctx, job, settings, question, conversation, authResult ? { apiKey: authResult.auth.apiKey, baseUrl: authResult.auth.baseUrl } : undefined);
	ctx.ui.notify("Council started. You can continue working; use /council-status or /council-cancel.", "info");
}

function status(ctx: ExtensionCommandContext): void {
	ctx.ui.notify(activeJob ? `Council is running: ${activeJob.phase}. Use /council-cancel to stop it.` : "No council is running.", "info");
}

function cancel(ctx: ExtensionCommandContext): void {
	if (!activeJob) { ctx.ui.notify("No council is running.", "info"); return; }
	activeJob.controller.abort();
	ctx.ui.notify("Council cancellation requested.", "info");
}

export default function registerCouncil(pi: ExtensionAPI): void {
	pi.registerCommand("council-settings", { description: "Configure private OpenRouter council model roles", handler: async (_args, ctx) => configure(ctx) });
	pi.registerCommand("council", { description: "Run a confirmed OpenRouter design council in the background", handler: async (args, ctx) => council(pi, args, ctx) });
	pi.registerCommand("council-status", { description: "Show current council phase", handler: async (_args, ctx) => status(ctx) });
	pi.registerCommand("council-cancel", { description: "Cancel the running council", handler: async (_args, ctx) => cancel(ctx) });
}
