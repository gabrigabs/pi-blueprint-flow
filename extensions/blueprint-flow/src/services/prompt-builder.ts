import type { ActionRunRow } from "../db.js";
import type { ActionType } from "../types.js";

export interface PromptContext {
	actionRun: ActionRunRow;
	featureTitle?: string;
	featureDescription?: string;
	projectName?: string;
	projectStack?: string;
	currentStepArtifacts?: string[];
	memories?: string[];
	interviewAnswers?: Array<{ question: string; answer: string }>;
	extraContext?: Record<string, unknown>;
}

/**
 * Builds the prompt string to inject into Pi for a given action.
 * Tagged with [blueprint-action:runId] for identification.
 *
 * TODO: Fatia 2 will implement full prompt templates per action type.
 */
export function buildPrompt(ctx: PromptContext): string {
	const { actionRun } = ctx;
	const tag = `[blueprint-action:${actionRun.id}]`;

	// Skeleton — returns a basic tagged prompt
	const lines: string[] = [
		tag,
		"",
		`Action: ${actionRun.action_type}`,
	];

	if (actionRun.step_name) {
		lines.push(`Step: ${actionRun.step_name}`);
	}

	if (ctx.projectName) {
		lines.push(`Project: ${ctx.projectName}`);
	}

	if (ctx.featureTitle) {
		lines.push(`Feature: ${ctx.featureTitle}`);
	}

	if (ctx.featureDescription) {
		lines.push("", "## Feature Description", ctx.featureDescription);
	}

	if (ctx.memories && ctx.memories.length > 0) {
		lines.push("", "## Relevant Memories");
		for (const m of ctx.memories) {
			lines.push(`- ${m}`);
		}
	}

	if (ctx.interviewAnswers && ctx.interviewAnswers.length > 0) {
		lines.push("", "## Interview Answers");
		for (const qa of ctx.interviewAnswers) {
			lines.push(`Q: ${qa.question}`, `A: ${qa.answer}`, "");
		}
	}

	if (ctx.extraContext) {
		lines.push("", "## Additional Context", JSON.stringify(ctx.extraContext, null, 2));
	}

	lines.push("", `Please execute the "${actionRun.action_type}" action and report results.`);

	return lines.join("\n");
}

/**
 * Extracts the action run ID from a tagged prompt.
 */
export function extractRunIdFromPrompt(text: string): string | null {
	const match = text.match(/\[blueprint-action:([a-zA-Z0-9_-]+)\]/);
	return match ? match[1] : null;
}
