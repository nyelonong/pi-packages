import { realpath } from "node:fs/promises";
import { resolve, relative } from "node:path";

export interface ContextInput {
	cwd: string;
	text: string;
	paths: string[];
	maxBytes: number;
	readFile: (path: string) => Promise<string>;
	resolvePath?: (path: string) => Promise<string>;
}

export async function buildContext(input: ContextInput): Promise<string> {
	const root = await (input.resolvePath ?? realpath)(input.cwd);
	const sections = input.text.trim() ? [`User context:\n${input.text.trim()}`] : [];
	let remaining = input.maxBytes - Buffer.byteLength(sections.join("\n\n"));

	for (const path of input.paths) {
		const absolute = await (input.resolvePath ?? realpath)(resolve(root, path));
		const pathFromCwd = relative(root, absolute);
		if (pathFromCwd.startsWith("..") || pathFromCwd === "" || pathFromCwd.startsWith("/")) {
			throw new Error(`Selected path is outside the working directory: ${path}`);
		}
		if (remaining <= 0) throw new Error(`Selected context exceeds ${input.maxBytes} bytes`);

		const content = await input.readFile(absolute);
		const slice = Buffer.from(content).subarray(0, remaining).toString("utf8");
		sections.push(`File: ${pathFromCwd}\n${slice}`);
		remaining -= Buffer.byteLength(slice);
	}

	return sections.join("\n\n");
}
