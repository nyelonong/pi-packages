import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rm, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { ensurePetPackage, type CachedPet } from "./assets.ts";
import { PetController, needsHumanTool, readEnabled, type PetSignal } from "./pet-control.ts";

const extensionDir = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(extensionDir, "Pet.swift");
const binaryPath = join(tmpdir(), "pi-pet", "pet");
const cacheDir = join(homedir(), ".cache", "pi-pet", "twix-snickers");
const statePath = join(homedir(), ".cache", "pi-pet", "state.json");

function readStateFile(path: string): string | undefined {
	try { return readFileSync(path, "utf8"); } catch { return undefined; }
}
function buildPet() {
	if (process.platform !== "darwin") return false;
	if (existsSync(binaryPath) && statSync(binaryPath).mtimeMs >= statSync(sourcePath).mtimeMs) return true;
	mkdirSync(dirname(binaryPath), { recursive: true });
	return spawnSync("swiftc", [sourcePath, "-o", binaryPath], { encoding: "utf8" }).status === 0;
}

export default function petExtension(pi: ExtensionAPI) {
	let pet: ChildProcessWithoutNullStreams | undefined;
	let assets: CachedPet | undefined;
	let starting: Promise<void> | undefined;
	let shuttingDown = false;
	let enabled = readEnabled(readStateFile(statePath));
	const controller = new PetController();

	function emit(signal: PetSignal) { if (enabled) send(signal); }
	function setEnabled(on: boolean) {
		enabled = on;
		try {
			mkdirSync(dirname(statePath), { recursive: true });
			writeFileSync(statePath, JSON.stringify({ enabled }));
		} catch { /* best-effort persistence */ }
		if (!on) close();
	}

	function send(signal: PetSignal) {
		if (!signal || !pet || pet.killed || pet.stdin.destroyed || !pet.stdin.writable) return;
		pet.stdin.write(`${signal}\n`, () => {});
	}
	function releaseAssets() { if (assets) void new Promise<void>((resolve) => rm(assets.reservationPath, { recursive: true, force: true }, () => resolve())); }
	function close() { send("CLOSE"); pet?.kill(); pet = undefined; controller.pendingHumanTools.clear(); }
	async function start(ctx: ExtensionContext) {
		if (!enabled || pet || starting || process.platform !== "darwin") return;
		starting = (async () => {
			try {
				assets ??= await ensurePetPackage({ cacheDir });
				if (!buildPet()) throw new Error("could not compile the native pet overlay");
				if (!enabled || shuttingDown) { releaseAssets(); return; }
				const file = basename(ctx.sessionManager.getSessionFile() ?? "");
				const shortId = file.split("_")[1]?.slice(0, 6);
				const session = pi.getSessionName() ?? [basename(ctx.cwd), shortId].filter(Boolean).join(" · ");
				const child = spawn(binaryPath, ["--spritesheet", assets.spritesheetPath, "--label", session.slice(0, 32)], { stdio: ["pipe", "ignore", "ignore"] });
				child.stdin.on("error", () => {});
				child.once("exit", () => { if (pet === child) pet = undefined; });
				pet = child;
				send("HIDE");
			} catch (error) { ctx.ui.notify(`Pi Pet unavailable: ${error instanceof Error ? error.message : String(error)}`, "warning"); }
			finally { starting = undefined; }
		})();
		await starting;
	}

	pi.on("agent_start", (_event, ctx) => { void start(ctx); emit(controller.next({ kind: "agent_start" })); });
	pi.on("message_end", (event) => {
		if (event.message.role !== "assistant") return;
		emit(controller.next({ kind: "assistant_answer", message: event.message }));
	});
	pi.on("tool_execution_start", (event) => {
		if (needsHumanTool(event.toolName)) emit(controller.next({ kind: "human_tool_start", toolCallId: event.toolCallId }));
	});
	pi.on("tool_execution_end", (event) => {
		if (needsHumanTool(event.toolName)) emit(controller.next({ kind: "human_tool_end", toolCallId: event.toolCallId }));
		if (event.isError) emit(controller.next({ kind: "tool_error" }));
	});
	pi.on("agent_settled", () => emit(controller.next({ kind: "agent_settled" })));
	pi.on("session_shutdown", () => { shuttingDown = true; close(); });

	pi.registerCommand("pet", {
		description: "Control the pet: /pet [on|show|off|hide|close]",
		handler: async (_args, ctx) => {
			const arg = _args[0];
			if (arg === "off" || arg === "hide" || arg === "close" || arg === "stop") {
				setEnabled(false);
				ctx.ui.notify("Pet off (until /pet on)", "info");
				return;
			}
			setEnabled(true);
			await start(ctx);
			emit(controller.next({ kind: "command", command: "show" }));
			ctx.ui.notify("Pet on", "info");
		},
	});
}
