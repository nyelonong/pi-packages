import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_SETTINGS, loadSettings, resolveUserModel, saveSettings, validateSettings } from "./settings.ts";

test("settings validate every role model and persist owner-only", async () => {
	const dir = await mkdtemp(join(tmpdir(), "council-"));
	const path = join(dir, "settings.json");
	await saveSettings(DEFAULT_SETTINGS, path);
	assert.deepEqual(await loadSettings(path), DEFAULT_SETTINGS);
	assert.equal((await stat(path)).mode & 0o777, 0o600);
	assert.throws(() => validateSettings({ roles: { ...DEFAULT_SETTINGS.roles, skeptic: "bad" }, synthesis: "a/b" }), /skeptic/);
});

test("loadSettings backfills roles missing from an older config", async () => {
	const dir = await mkdtemp(join(tmpdir(), "council-"));
	const path = join(dir, "settings.json");
	const older = { roles: { architect: "a/b", skeptic: "c/d" }, synthesis: "e/f" };
	await writeFile(path, `${JSON.stringify(older, null, "\t")}\n`);
	const loaded = await loadSettings(path);
	for (const role of Object.keys(DEFAULT_SETTINGS.roles)) {
		assert.ok(loaded.roles[role as keyof typeof DEFAULT_SETTINGS.roles], `role ${role} has a model`);
	}
	assert.equal(loaded.roles.architect, "a/b");
	assert.equal(loaded.roles.skeptic, "c/d");
	assert.equal(loaded.synthesis, "e/f");
});

test("resolveUserModel runs the defaulted user role as the active model", () => {
	const resolved = resolveUserModel(DEFAULT_SETTINGS, "openai/gpt-5.6-luna");
	assert.equal(resolved.roles.user, "openai/gpt-5.6-luna");
	assert.equal(resolved.roles.architect, DEFAULT_SETTINGS.roles.architect);
});

test("resolveUserModel keeps an explicitly configured user model and has no active model", () => {
	const configured = { ...DEFAULT_SETTINGS, roles: { ...DEFAULT_SETTINGS.roles, user: "anthropic/claude-sonnet-5" } };
	assert.equal(resolveUserModel(configured, "openai/gpt-5.6-luna").roles.user, "anthropic/claude-sonnet-5");
	assert.equal(resolveUserModel(DEFAULT_SETTINGS, undefined).roles.user, DEFAULT_SETTINGS.roles.user);
});
