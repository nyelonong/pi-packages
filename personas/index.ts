import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { PERSONAS } from "./personas.ts";

export default function (pi: ExtensionAPI): void {
	pi.registerTool({
		name: "personas",
		label: "Personas",
		description: "Load the persona catalog: architect, skeptic, pragmatist, and researcher, each with the lens to apply and the bias to correct for.",
		parameters: Type.Object({}, { additionalProperties: false }),
		async execute() {
			return {
				content: [{ type: "text", text: PERSONAS.map((persona) => `${persona.name}: ${persona.lens} Bias to correct: ${persona.bias}`).join("\n") }],
				details: {},
			};
		},
	});
}
