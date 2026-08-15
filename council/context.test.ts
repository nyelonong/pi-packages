import assert from "node:assert/strict";
import test from "node:test";
import { buildContext } from "./context.ts";

test("buildContext reads only selected files under the working directory", async () => {
	const context = await buildContext({
		cwd: "/tmp/council-context",
		text: "Review the resilience boundary.",
		paths: ["README.md", "internal/client.go"],
		maxBytes: 100,
		resolvePath: async (path) => path,
		readFile: async (path) => ({
			"/tmp/council-context/README.md": "readme",
			"/tmp/council-context/internal/client.go": "client",
		}[path] ?? ""),
	});

	assert.match(context, /Review the resilience boundary/);
	assert.match(context, /README.md/);
	assert.match(context, /client/);
});

test("buildContext rejects symlinks that escape the working directory", async () => {
	await assert.rejects(
		buildContext({
			cwd: "/tmp/council-context",
			text: "",
			paths: ["linked-secret"],
			maxBytes: 100,
			resolvePath: async (path) => path === "/tmp/council-context/linked-secret" ? "/tmp/secret" : path,
			readFile: async () => "",
		}),
		/outside the working directory/,
	);
});

test("buildContext rejects paths outside the working directory", async () => {
	await assert.rejects(
		buildContext({
			cwd: "/tmp/council-context",
			text: "",
			paths: ["../secret"],
			maxBytes: 100,
			resolvePath: async (path) => path,
			readFile: async () => "",
		}),
		/outside the working directory/,
	);
});
