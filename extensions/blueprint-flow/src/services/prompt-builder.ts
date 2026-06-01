import type { ActionRunRow, Flow, Interview, Memory } from "../db.js";
import { getDb } from "../db.js";
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
	stepInstructions?: string;
}

/** Per-action-type instruction templates */
const ACTION_INSTRUCTIONS: Record<string, string> = {
	run_step: `Execute the current step of the Blueprint flow for this feature.
Use the appropriate blueprint tools (blueprint_advance_step, blueprint_save_artifact, etc.) to complete the step.
Follow the step's requirements and produce the expected artifacts.`,

	research: `Conduct research for this feature using blueprint_research_repo and blueprint_research_web tools.
Analyze the codebase structure, dependencies, and patterns relevant to the feature.
Save findings as artifacts using blueprint_save_artifact.`,

	interview: `Conduct an adaptive interview for this feature using blueprint_ask_interview.
Ask targeted questions to clarify requirements, edge cases, and constraints.
Review previous answers with blueprint_get_interview_history before asking new questions.`,

	spec: `Write a detailed specification for this feature.
Include functional requirements, non-functional requirements, acceptance criteria, and edge cases.
Save the spec as an artifact using blueprint_save_artifact with type "spec".`,

	ddd: `Perform Domain-Driven Design modeling for this feature.
Identify bounded contexts, aggregates, entities, value objects, and domain events.
Save the domain model as an artifact using blueprint_save_artifact with type "domain_model".`,

	behavior: `Define behavior scenarios (BDD-style) for this feature.
Write Given/When/Then scenarios covering happy paths, edge cases, and error conditions.
Save scenarios as an artifact using blueprint_save_artifact with type "behavior_scenarios".`,

	implementation_plan: `Create a detailed implementation plan for this feature.
Break down the work into ordered tasks with file paths, dependencies, and estimated complexity.
Save the plan as an artifact using blueprint_save_artifact with type "implementation_plan".`,

	implementation: `Implement this feature according to the implementation plan.
Write production-quality code following project conventions.
Use blueprint_research_repo to understand existing patterns before writing code.`,

	review: `Run the review gate for this feature using blueprint_review_gate.
Evaluate code quality, test coverage, spec compliance, and potential issues.
Provide actionable feedback and a pass/fail verdict.`,

	memory_update: `Update project memory with learnings from this feature.
Use blueprint_save_memory to record architectural decisions, patterns discovered, and conventions established.
Use blueprint_search_memory first to avoid duplicates.`,

	import_project_agent_analysis: `Analyze this project's structure, conventions, and architecture in depth.
Go beyond the initial scan — read key files, understand patterns, and identify the project's idioms.
Save a comprehensive project profile as findings.`,
};

/**
 * Builds the full prompt to inject into Pi for a given action run.
 * Gathers context from DB (feature, project, memories, interviews, artifacts).
 */
export function buildPrompt(ctx: PromptContext): string {
	const { actionRun } = ctx;
	const tag = `[blueprint-action:${actionRun.id}]`;
	const instructions =
		ctx.stepInstructions ??
		ACTION_INSTRUCTIONS[actionRun.action_type] ??
		ACTION_INSTRUCTIONS.run_step;

	const lines: string[] = [
		tag,
		"",
		"# Blueprint Action Request",
		"",
		`**Action**: ${formatActionType(actionRun.action_type)}`,
	];

	if (actionRun.step_name) {
		lines.push(`**Step**: ${actionRun.step_name}`);
	}
	if (ctx.projectName) {
		lines.push(`**Project**: ${ctx.projectName}`);
	}
	if (ctx.projectStack) {
		lines.push(`**Stack**: ${ctx.projectStack}`);
	}
	if (ctx.featureTitle) {
		lines.push(`**Feature**: ${ctx.featureTitle}`);
	}
	if (actionRun.effort_level) {
		lines.push(`**Effort**: ${actionRun.effort_level}`);
	}
	if (actionRun.execution_mode) {
		lines.push(`**Mode**: ${actionRun.execution_mode}`);
	}

	if (ctx.featureDescription) {
		lines.push("", "## Flow Description", "", ctx.featureDescription);
	}

	if (ctx.memories && ctx.memories.length > 0) {
		lines.push("", "## Relevant Project Memories", "");
		for (const m of ctx.memories) {
			lines.push(`- ${m}`);
		}
	}

	if (ctx.interviewAnswers && ctx.interviewAnswers.length > 0) {
		lines.push("", "## Interview Context", "");
		for (const qa of ctx.interviewAnswers) {
			lines.push(`**Q**: ${qa.question}`, `**A**: ${qa.answer}`, "");
		}
	}

	if (ctx.currentStepArtifacts && ctx.currentStepArtifacts.length > 0) {
		lines.push("", "## Existing Artifacts for This Step", "");
		for (const a of ctx.currentStepArtifacts) {
			lines.push(`- ${a}`);
		}
	}

	if (ctx.extraContext && Object.keys(ctx.extraContext).length > 0) {
		lines.push(
			"",
			"## Additional Context",
			"",
			JSON.stringify(ctx.extraContext, null, 2),
		);
	}

	lines.push("", "## Instructions", "", instructions);

	return lines.join("\n");
}

/**
 * Gathers full context from DB for a given action run.
 */
export function gatherPromptContext(actionRun: ActionRunRow): PromptContext {
	const db = getDb();
	const ctx: PromptContext = { actionRun };

	if (actionRun.extra_context_json) {
		try {
			ctx.extraContext = JSON.parse(actionRun.extra_context_json) as Record<
				string,
				unknown
			>;
		} catch {
			ctx.extraContext = { raw: actionRun.extra_context_json };
		}
	}

	// Get feature info
	if (actionRun.flow_id) {
		const feature = db
			.prepare("SELECT * FROM flows WHERE id = ?")
			.get(actionRun.flow_id) as Flow | undefined;
		if (feature) {
			ctx.featureTitle = feature.title;
			ctx.featureDescription = feature.description ?? undefined;
		}
	}

	// Get project info
	if (actionRun.workspace_id) {
		const project = db
			.prepare("SELECT * FROM workspaces WHERE id = ?")
			.get(actionRun.workspace_id) as
			| { name: string; stack: string }
			| undefined;
		if (project) {
			ctx.projectName = project.name;
			ctx.projectStack = project.stack;
		}
	}

	// Get memories (last 10 for the project)
	if (actionRun.workspace_id) {
		const memories = db
			.prepare(
				"SELECT content FROM memories WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 10",
			)
			.all(actionRun.workspace_id) as Array<{ content: string }>;
		if (memories.length > 0) {
			ctx.memories = memories.map((m) => m.content);
		}
	}

	// Get interview answers for the feature
	if (actionRun.flow_id) {
		const interviews = db
			.prepare(
				"SELECT question, answer FROM interviews WHERE flow_id = ? AND answer IS NOT NULL ORDER BY created_at ASC",
			)
			.all(actionRun.flow_id) as Array<{ question: string; answer: string }>;
		if (interviews.length > 0) {
			ctx.interviewAnswers = interviews;
		}
	}

	// Get existing artifacts for the current step
	if (actionRun.flow_id && actionRun.step_name) {
		const artifacts = db
			.prepare(
				"SELECT filename, type FROM artifacts WHERE flow_id = ? AND step_name = ? ORDER BY created_at DESC",
			)
			.all(actionRun.flow_id, actionRun.step_name) as Array<{
			filename: string;
			type: string;
		}>;
		if (artifacts.length > 0) {
			ctx.currentStepArtifacts = artifacts.map(
				(a) => `${a.filename} (${a.type})`,
			);
		}

		// Get per-step instructions from workflow
		const flow = db
			.prepare("SELECT workflow_id FROM flows WHERE id = ?")
			.get(actionRun.flow_id) as { workflow_id: string } | undefined;
		if (flow?.workflow_id) {
			const workflow = db
				.prepare("SELECT steps_json FROM workflows WHERE id = ?")
				.get(flow.workflow_id) as { steps_json: string } | undefined;
			if (workflow?.steps_json) {
				try {
					const steps = JSON.parse(workflow.steps_json) as Array<{
						name: string;
						instructions?: string;
						skipCondition?: string;
					}>;
					const stepDef = steps.find((s) => s.name === actionRun.step_name);
					if (stepDef?.instructions) {
						ctx.stepInstructions = stepDef.instructions;
					}
					if (stepDef?.skipCondition) {
						ctx.extraContext = {
							...ctx.extraContext,
							skipCondition: `This step may be skipped if: ${stepDef.skipCondition}`,
						};
					}
				} catch {}
			}
		}
	}

	return ctx;
}

/**
 * Extracts the action run ID from a tagged prompt.
 */
export function extractRunIdFromPrompt(text: string): string | null {
	const match = text.match(/\[blueprint-action:([a-zA-Z0-9_-]+)\]/);
	return match ? match[1] : null;
}

function formatActionType(type: string): string {
	return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
