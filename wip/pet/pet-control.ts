// Decides whether the pet overlay should be visible, per event.
// The pet shows only when there is something for the user: a delivered answer,
// a finished task, or a request for human input. It stays hidden while the
// agent is working.

export type PetSignal = "HIDE" | "WORK" | "WAITING" | "SUCCESS" | "FAILED" | "CLOSE" | null;

export type PetCommand = "show" | "hide" | "close";

export interface PetEvent {
	kind:
		| "agent_start"
		| "assistant_answer"
		| "human_tool_start"
		| "human_tool_end"
		| "tool_error"
		| "agent_settled"
		| "command";
	toolCallId?: string;
	message?: unknown;
	command?: PetCommand;
}

/** A persisted pet state file containing { enabled: boolean } → whether the pet is turned on. */
export function readEnabled(raw: string | undefined): boolean {
	if (!raw) return true;
	try {
		const value = JSON.parse(raw) as { enabled?: unknown };
		return value.enabled !== false;
	} catch {
		return true;
	}
}

export function needsHumanTool(toolName: string): boolean {
	return /(?:ask|question|decision|confirm|approval|human)/iu.test(toolName);
}

/** True when an assistant message is a real answer: non-empty text and no pending tool calls. */
export function assistantHasAnswer(message: unknown): boolean {
	if (!message || typeof message !== "object") return false;
	const content = (message as { content?: unknown }).content;
	if (!Array.isArray(content)) return typeof content === "string" && content.trim().length > 0;
	let hasText = false;
	for (const block of content) {
		const b = block as { type?: string; text?: string };
		if (b?.type === "toolCall") return false;
		if (b?.type === "text" && typeof b.text === "string" && b.text.trim().length > 0) hasText = true;
	}
	return hasText;
}

export class PetController {
	readonly pendingHumanTools = new Set<string>();

	next(event: PetEvent): PetSignal {
		switch (event.kind) {
			case "agent_start":
				this.pendingHumanTools.clear();
				return "HIDE";
			case "assistant_answer":
				return this.pendingHumanTools.size === 0 && assistantHasAnswer(event.message) ? "SUCCESS" : null;
			case "human_tool_start":
				if (event.toolCallId) this.pendingHumanTools.add(event.toolCallId);
				return "WAITING";
			case "human_tool_end":
				if (event.toolCallId) this.pendingHumanTools.delete(event.toolCallId);
				return this.pendingHumanTools.size === 0 ? "HIDE" : null;
			case "tool_error":
				return "FAILED";
			case "agent_settled":
				return this.pendingHumanTools.size === 0 ? "SUCCESS" : null;
			case "command":
				return event.command === "hide" ? "HIDE" : event.command === "close" ? "CLOSE" : "WORK";
			default:
				return null;
		}
	}
}
