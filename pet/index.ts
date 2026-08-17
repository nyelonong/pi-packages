import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, mkdirSync, rm, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { ensurePetPackage, type CachedPet } from "./assets.ts";

const extensionDir = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(extensionDir, "Pet.swift");
const binaryPath = join(tmpdir(), "pi-pet", "pet");
const cacheDir = join(homedir(), ".cache", "pi-pet", "twix-snickers");

function needsHuman(toolName: string) { return /(?:ask|question|decision|confirm|approval|human)/iu.test(toolName); }
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
	let closed = false;
	const pendingHumanTools = new Set<string>();

	function send(command: "WORK" | "WAITING" | "SUCCESS" | "FAILED" | "CLOSE") {
		if (!pet || pet.killed || pet.stdin.destroyed || !pet.stdin.writable) return;
		pet.stdin.write(`${command}\n`, () => {});
	}
	function releaseAssets() { if (assets) void new Promise<void>((resolve) => rm(assets.reservationPath, { recursive: true, force: true }, () => resolve())); }
	function close() { closed = true; send("CLOSE"); pet?.kill(); pet = undefined; pendingHumanTools.clear(); releaseAssets(); }
	async function start(ctx: ExtensionContext) {
		if (pet || starting || process.platform !== "darwin") return;
		starting = (async () => {
			try {
				assets ??= await ensurePetPackage({ cacheDir });
				if (!buildPet()) throw new Error("could not compile the native pet overlay");
				if (closed) { releaseAssets(); return; }
				const file = basename(ctx.sessionManager.getSessionFile() ?? "");
				const shortId = file.split("_")[1]?.slice(0, 6);
				const session = pi.getSessionName() ?? [basename(ctx.cwd), shortId].filter(Boolean).join(" · ");
				const child = spawn(binaryPath, ["--spritesheet", assets.spritesheetPath, "--label", session.slice(0, 32)], { stdio: ["pipe", "ignore", "ignore"] });
				child.stdin.on("error", () => {});
				child.once("exit", () => { if (pet === child) pet = undefined; });
				pet = child;
				send(pendingHumanTools.size > 0 ? "WAITING" : "WORK");
			} catch (error) { ctx.ui.notify(`Pi Pet unavailable: ${error instanceof Error ? error.message : String(error)}`, "warning"); }
			finally { starting = undefined; }
		})();
		await starting;
	}

	pi.on("agent_start", (_event, ctx) => { pendingHumanTools.clear(); void start(ctx); send("WORK"); });
	pi.on("tool_execution_start", (event) => { if (needsHuman(event.toolName)) { pendingHumanTools.add(event.toolCallId); send("WAITING"); } });
	pi.on("tool_execution_end", (event) => { if (needsHuman(event.toolName)) { pendingHumanTools.delete(event.toolCallId); if (pendingHumanTools.size === 0) send("WORK"); } if (event.isError) send("FAILED"); });
	pi.on("agent_settled", () => { if (pendingHumanTools.size === 0) send("SUCCESS"); });
	pi.on("session_shutdown", () => close());
}
