import type { CallFailure, CallResult, ProviderUsage } from "./types.ts";

const OPENROUTER_ORIGIN = "https://openrouter.ai";

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

function failure(kind: CallFailure["kind"], message: string): CallFailure {
	return { ok: false, kind, message };
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
	return inputTokens === undefined && outputTokens === undefined ? undefined : { inputTokens, outputTokens };
}

export async function chat<T>(request: ChatRequest<T>): Promise<CallResult<T>> {
	if (!request.auth?.apiKey) return failure("auth", "OpenRouter authentication is unavailable; configure it with Pi /login.");
	const url = endpoint(request.auth.baseUrl);
	if (!url) return failure("auth", "Pi resolved a non-OpenRouter provider origin.");
	if (request.signal?.aborted) return failure("cancelled", "Council cancelled before request dispatch.");
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort("timeout"), request.timeoutMs ?? 60_000);
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
		let parsed: unknown;
		try { parsed = JSON.parse(content); } catch { return failure("malformed", "Council model did not return valid JSON."); }
		const value = request.parse(parsed);
		if (!value) return failure("malformed", "Council model did not follow the required JSON contract.");
		return { ok: true, model: typeof record.model === "string" ? record.model : request.model, cost: typeof record.cost === "number" ? record.cost : undefined, usage: usage(record), value };
	} catch (error) {
		if (controller.signal.aborted) return failure(request.signal?.aborted ? "cancelled" : "timeout", request.signal?.aborted ? "Council cancelled." : "OpenRouter request timed out.");
		return failure("provider", error instanceof Error ? error.message : "OpenRouter request failed.");
	} finally {
		clearTimeout(timeout);
		request.signal?.removeEventListener("abort", abort);
	}
}
