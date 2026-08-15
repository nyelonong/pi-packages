import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, validateSettings } from "./settings.ts";

test("settings validate every role model and persist owner-only", async () => {
	const dir = await mkdtemp(join(tmpdir(), "council-"));
	const path = join(dir, "settings.json");
	await saveSettings(DEFAULT_SETTINGS, path);
	assert.deepEqual(await loadSettings(path), DEFAULT_SETTINGS);
	assert.equal((await stat(path)).mode & 0o777, 0o600);
	assert.throws(() => validateSettings({ roles: { ...DEFAULT_SETTINGS.roles, skeptic: "bad" }, synthesis: "a/b" }), /skeptic/);
});
