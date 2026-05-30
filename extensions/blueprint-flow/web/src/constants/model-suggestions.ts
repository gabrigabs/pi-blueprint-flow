export interface ModelSuggestion {
	prefer: "budget" | "reasoning" | "strong";
	reason: string;
}

export const STEP_MODEL_SUGGESTIONS: Record<string, ModelSuggestion> = {
	intake: { prefer: "budget", reason: "Simple intake parsing" },
	research: { prefer: "budget", reason: "High volume, low complexity" },
	interview: { prefer: "budget", reason: "Simple Q&A generation" },
	spec: { prefer: "reasoning", reason: "Needs structured thinking" },
	ddd: { prefer: "reasoning", reason: "Complex domain modeling" },
	design: { prefer: "strong", reason: "Creative + structural output" },
	behavior: { prefer: "reasoning", reason: "Scenario generation" },
	implementation_plan: { prefer: "reasoning", reason: "Architecture decisions" },
	implementation: { prefer: "strong", reason: "Code generation quality" },
	review: { prefer: "reasoning", reason: "Critical analysis" },
	memory_update: { prefer: "budget", reason: "Simple extraction" },
};

export function getSuggestionLabel(prefer: ModelSuggestion["prefer"]): string {
	switch (prefer) {
		case "budget": return "Budget model (e.g. Haiku)";
		case "reasoning": return "Reasoning model (e.g. Sonnet)";
		case "strong": return "Strong model (e.g. Opus)";
	}
}
