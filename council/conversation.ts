const MAX_CONVERSATION_CHARS = 12_000;

export function conversationText(entries: readonly unknown[]): string {
	const messages = entries.flatMap((entry) => {
		if (!entry || typeof entry !== "object" || (entry as { type?: unknown }).type !== "message") return [];
		const message = (entry as { message?: unknown }).message;
		if (!message || typeof message !== "object") return [];
		const role = (message as { role?: unknown }).role;
		const content = (message as { content?: unknown }).content;
		if ((role !== "user" && role !== "assistant") || typeof content !== "string") return [];
		return [`${role}: ${content}`];
	});
	const text = messages.join("\n\n");
	return text.length > MAX_CONVERSATION_CHARS ? text.slice(-MAX_CONVERSATION_CHARS) : text;
}
