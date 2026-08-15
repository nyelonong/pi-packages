import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import { ROLES, type CouncilSettings } from "./types.ts";

export const DEFAULT_SETTINGS: CouncilSettings = {
	roles: {
		architect: "anthropic/claude-fable-5",
		skeptic: "openai/gpt-5.6-sol",
		pragmatist: "qwen/qwen3.8-max",
		researcher: "google/gemini-3.7-flash",
	},
	synthesis: "x-ai/grok-4.6",
};

export function settingsPath(home = homedir()): string {
	return join(home, ".pi", "agent", "council-settings.json");
}

function modelId(value: unknown): value is string {
	return typeof value === "string" && /^[^\s/]+\/[^\s/]+$/.test(value);
}

export function validateSettings(value: unknown): CouncilSettings {
	if (!value || typeof value !== "object") throw new Error("Council settings must be an object");
	const record = value as Record<string, unknown>;
	if (!record.roles || typeof record.roles !== "object" || !modelId(record.synthesis)) {
		throw new Error("Council settings require OpenRouter role and synthesis model IDs");
	}
	const roles = record.roles as Record<string, unknown>;
	const result = {} as Record<(typeof ROLES)[number], string>;
	for (const role of ROLES) {
		if (!modelId(roles[role])) throw new Error(`Council settings require a model for ${role}`);
		result[role] = roles[role];
	}
	return { roles: result, synthesis: record.synthesis };
}

export async function loadSettings(path = settingsPath()): Promise<CouncilSettings> {
	try {
		return validateSettings(JSON.parse(await readFile(path, "utf8")));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return DEFAULT_SETTINGS;
		throw error;
	}
}

export async function saveSettings(settings: CouncilSettings, path = settingsPath()): Promise<void> {
	const valid = validateSettings(settings);
	await mkdir(dirname(path), { recursive: true, mode: 0o700 });
	const temporary = `${path}.${process.pid}.tmp`;
	await writeFile(temporary, `${JSON.stringify(valid, null, "\t")}\n`, { mode: 0o600 });
	await chmod(temporary, 0o600);
	await rename(temporary, path);
	await chmod(path, 0o600);
}
