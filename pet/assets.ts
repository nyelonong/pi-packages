import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

const spritesheetUrls = [
	"https://codex-pets.net/assets/pets/v/1786640816261/twix-snickers/spritesheet.webp",
	"https://codex-pets.net/assets/pets/v/1786955391250/kesha-gray-tuxedo/spritesheet.webp",
	"https://codex-pets.net/assets/pets/v/1786949011338/toba-otter/spritesheet.webp",
	"https://codex-pets.net/assets/pets/v/1786944822999/monty-boy/spritesheet.webp",
	"https://codex-pets.net/assets/pets/v/1786677372985/headpaws-fourlegs/spritesheet.webp",
	"https://codex-pets.net/assets/pets/v/1786493955099/ruby/spritesheet.webp",
	"https://codex-pets.net/assets/pets/v/1786604307720/zhima/spritesheet.webp",
	"https://codex-pets.net/assets/pets/v/1786620371742/mihua/spritesheet.webp",
	"https://codex-pets.net/assets/pets/v/1785896723518/old-bai/spritesheet.webp",
	"https://codex-pets.net/assets/pets/v/1783674633973/xiaomai/spritesheet.webp",
	"https://codex-pets.net/assets/pets/v/1784778029191/gan-zai/spritesheet.webp",
];
const manifestUrlFor = (spriteUrl: string) => spriteUrl.replace(/spritesheet\.webp$/u, "pet.json");

export interface PetManifest {
	id: string;
	displayName: string;
	spritesheetPath: string;
}

export interface CachedPet extends PetManifest {
	spritesheetPath: string;
	provenancePath: string;
	reservationPath: string;
}

export function parsePetManifest(raw: string): PetManifest {
	const value: unknown = JSON.parse(raw);
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("pet manifest must be an object");
	const manifest = value as Record<string, unknown>;
	if (
		typeof manifest.id !== "string" ||
		typeof manifest.displayName !== "string" ||
		typeof manifest.spritesheetPath !== "string" ||
		manifest.spriteVersionNumber !== 2
	) {
		throw new Error("pet manifest must declare id, displayName, spritesheetPath, and spriteVersionNumber 2");
	}
	return { id: manifest.id, displayName: manifest.displayName, spritesheetPath: manifest.spritesheetPath };
}

export async function ensurePetPackage(options: { cacheDir: string; fetchImpl?: typeof fetch }): Promise<CachedPet> {
	const fetchImpl = options.fetchImpl ?? fetch;
	const registryDir = join(options.cacheDir, "..", "active");
	await mkdir(registryDir, { recursive: true });
	const shuffled = [...spritesheetUrls].sort(() => Math.random() - 0.5);
	let spritesheetUrl = shuffled[0];
	for (const candidate of shuffled) {
		const id = candidate.split("/").at(-2) ?? "pet";
		try { await mkdir(join(registryDir, id)); spritesheetUrl = candidate; break; } catch { /* try another pet */ }
	}
	const manifestUrl = manifestUrlFor(spritesheetUrl);
	const petId = spritesheetUrl.split("/").at(-2) ?? "pet";
	const cacheDir = join(options.cacheDir, petId);
	const manifestPath = join(cacheDir, "pet.json");
	const cachedSpritesheetPath = join(cacheDir, "spritesheet.webp");
	const provenancePath = join(cacheDir, "provenance.json");
	try {
		const manifest = parsePetManifest(await readFile(manifestPath, "utf8"));
		await readFile(cachedSpritesheetPath);
		await readFile(provenancePath);
		return { ...manifest, spritesheetPath: cachedSpritesheetPath, provenancePath, reservationPath: join(registryDir, petId) };
	} catch {
		// Replace an incomplete cache atomically below.
	}

	const [manifestResponse, spriteResponse] = await Promise.all([fetchImpl(manifestUrl), fetchImpl(spritesheetUrl)]);
	if (!manifestResponse.ok) throw new Error(`could not download pet manifest: HTTP ${manifestResponse.status}`);
	if (!spriteResponse.ok) throw new Error(`could not download pet spritesheet: HTTP ${spriteResponse.status}`);
	const rawManifest = await manifestResponse.text();
	const manifest = parsePetManifest(rawManifest);
	const sprite = Buffer.from(await spriteResponse.arrayBuffer());
	if (sprite.byteLength === 0) throw new Error("pet spritesheet is empty");

	await mkdir(cacheDir, { recursive: true });
	await writeFile(`${manifestPath}.tmp`, rawManifest);
	await writeFile(`${cachedSpritesheetPath}.tmp`, sprite);
	await writeFile(`${provenancePath}.tmp`, JSON.stringify({
		manifestUrl,
		spritesheetUrl,
		displayName: manifest.displayName,
		sha256: createHash("sha256").update(sprite).digest("hex"),
	}, null, "\t"));
	await Promise.all([
		rename(`${manifestPath}.tmp`, manifestPath),
		rename(`${cachedSpritesheetPath}.tmp`, cachedSpritesheetPath),
		rename(`${provenancePath}.tmp`, provenancePath),
	]);
	return { ...manifest, spritesheetPath: cachedSpritesheetPath, provenancePath, reservationPath: join(registryDir, petId) };
}
