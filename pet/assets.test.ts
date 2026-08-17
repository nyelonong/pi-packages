import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ensurePetPackage, parsePetManifest } from "./assets.ts";

const manifest = JSON.stringify({
	id: "twix-snickers",
	displayName: "Twix & Snickers",
	spriteVersionNumber: 2,
	spritesheetPath: "spritesheet.webp",
});

test("accepts the supplied Codex Pet v2 manifest", () => {
	assert.deepEqual(parsePetManifest(manifest), {
		id: "twix-snickers",
		displayName: "Twix & Snickers",
		spritesheetPath: "spritesheet.webp",
	});
});

test("rejects a manifest without the v2 sprite contract", () => {
	assert.throws(() => parsePetManifest(JSON.stringify({ id: "cat", displayName: "Cat" })));
});

test("downloads and records a validated pet package", async () => {
	const cacheDir = await mkdtemp(join(tmpdir(), "pi-pet-test-"));
	const fetchImpl: typeof fetch = async (url) => new Response(
		url.toString().endsWith("pet.json") ? manifest : new Uint8Array([1, 2, 3]),
		{ status: 200 },
	);
	const pet = await ensurePetPackage({ cacheDir, fetchImpl });
	assert.equal(pet.displayName, "Twix & Snickers");
	assert.equal((await readFile(pet.spritesheetPath)).byteLength, 3);
	assert.match(await readFile(pet.provenancePath, "utf8"), /sha256/);
});
