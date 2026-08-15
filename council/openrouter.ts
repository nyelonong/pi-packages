import type { CallFailure, CallResult, ProviderUsage } from "./types.ts";

const OPENROUTER_ORIGIN = "https://openrouter.ai";
const DEFAULT_TIMEOUT_MS = 180_000;

export interface OpenRouterAuth {
	apiKey?: string;
	baseUrl?: string;
}

export interface ChatRequest<T> {
	auth: OpenRouterAuth | undefined;
	model: string;
	prompt: string;
	signal?: AbortSignal;
	timeoutMs?: number;
	parse: (value: unknown) => T | undefined;
	fetch?: typeof fetch;
}

function failure(kind: CallFailure["kind"], message: string, sample?: string): CallFailure {
	return { ok: false, kind, message, sample };
}

function parseJson(content: string): unknown | undefined {
	const fenced = content.match(/^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$/i);
	try {
		return JSON.parse(fenced?.[1] ?? content);
	} catch {
		return undefined;
	}
}

function sample(content: string): string {
	return content.replace(/\s+/g, " ").slice(0, 500);
}

function endpoint(baseUrl?: string): string | undefined {
	const value = baseUrl ?? `${OPENROUTER_ORIGIN}/api/v1`;
	try {
		const url = new URL(value);
		if (url.origin !== OPENROUTER_ORIGIN || !url.pathname.startsWith("/api/")) return undefined;
		return `${url.toString().replace(/\/$/, "")}/chat/completions`;
	} catch {
		return undefined;
	}
}

function usage(value: Record<string, unknown>): ProviderUsage | undefined {
	const source = value.usage;
	if (!source || typeof source !== "object") return undefined;
	const item = source as Record<string, unknown>;
	const inputTokens = typeof item.prompt_tokens === "number" ? item.prompt_tokens : undefined;
	const outputTokens = typeof item.completion_tokens === "number" ? item.completion_tokens : undefined;
	const cost = typeof item.cost === "number" ? item.cost : undefined;
	return inputTokens === undefined && outputTokens === undefined && cost === undefined ? undefined : { inputTokens, outputTokens, cost };
}

export async function chat<T>(request: ChatRequest<T>): Promise<CallResult<T>> {
	if (!request.auth?.apiKey) return failure("auth", "OpenRouter authentication is unavailable; configure it with Pi /login.");
	const url = endpoint(request.auth.baseUrl);
	if (!url) return failure("auth", "Pi resolved a non-OpenRouter provider origin.");
	if (request.signal?.aborted) return failure("cancelled", "Council cancelled before request dispatch.");
	const controller = new AbortController();
	const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);
	const abort = () => controller.abort("cancelled");
	request.signal?.addEventListener("abort", abort, { once: true });
	try {
		const response = await (request.fetch ?? fetch)(url, {
			method: "POST",
			headers: { authorization: `Bearer ${request.auth.apiKey}`, "content-type": "application/json" },
			body: JSON.stringify({ model: request.model, messages: [{ role: "user", content: request.prompt }], reasoning: { effort: "high" }, response_format: { type: "json_object" } }),
			signal: controller.signal,
		});
		if (!response.ok) return failure("provider", `OpenRouter request failed (${response.status}).`);
		const body: unknown = await response.json();
		if (!body || typeof body !== "object") return failure("malformed", "OpenRouter returned an invalid response.");
		const record = body as Record<string, unknown>;
		const content = (record.choices as Array<{ message?: { content?: unknown } }> | undefined)?.[0]?.message?.content;
		if (typeof content !== "string") return failure("malformed", "OpenRouter response has no text completion.");
		const parsed = parseJson(content);
		if (parsed === undefined) return failure("malformed", "Council model did not return valid JSON.", sample(content));
		const value = request.parse(parsed);
		if (!value) return failure("malformed", "Council model did not follow the required JSON contract.", sample(content));
		const responseUsage = usage(record);
		return { ok: true, model: typeof record.model === "string" ? record.model : request.model, cost: typeof record.cost === "number" ? record.cost : responseUsage?.cost, usage: responseUsage, value };
	} catch (error) {
		if (controller.signal.aborted) return failure(request.signal?.aborted ? "cancelled" : "timeout", request.signal?.aborted ? "Council cancelled." : `OpenRouter request timed out after ${timeoutMs / 1_000} seconds.`);
		return failure("provider", error instanceof Error ? error.message : "OpenRouter request failed.");
	} finally {
		clearTimeout(timeout);
		request.signal?.removeEventListener("abort", abort);
	}
}
