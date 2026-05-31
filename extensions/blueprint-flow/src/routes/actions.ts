import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import type { FlowStep, StepStatus } from "../config.js";
import { FLOW_STEPS, STEP_LABELS } from "../config.js";
import type { Flow, Step } from "../db.js";
import {
	getDb,
	getProjectWorkflow,
	getWorkflow,
	parseWorkflowSteps,
} from "../db.js";
import { bus } from "../events.js";
import { getPiBridge } from "../pi-bridge.js";
import type { ActionType, AgentRunSettings } from "../types.js";
import { buildRunSettings } from "../types.js";

export function registerActionRoutes(app: FastifyInstance): void {
	app.post<{ Params: { id: string }; Body: { summary?: string } }>(
		"/api/features/:id/advance",
		async (req, reply) => {
			const { id } = req.params;
			const db = getDb();

			const feature = db.prepare("SELECT * FROM flows WHERE id = ?").get(id) as
				| Flow
				| undefined;
			if (!feature) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Flow not found" });
			}

			// Resolve workflow steps for this feature
			const workflowSteps = getFlowWorkflowStepNames(feature);
			const currentIdx = workflowSteps.indexOf(feature.current_step);
			if (currentIdx === -1) {
				return reply
					.code(400)
					.send({ error: "invalid_state", message: "Invalid current step" });
			}

			db.prepare(
				"UPDATE steps SET status = 'done', completed_at = datetime('now') WHERE flow_id = ? AND name = ?",
			).run(id, feature.current_step);

			if (currentIdx === workflowSteps.length - 1) {
				db.prepare(
					"UPDATE features SET status = 'done', updated_at = datetime('now') WHERE id = ?",
				).run(id);

				bus.emit("flow:updated", {
					id,
					step: feature.current_step,
					status: "done",
				});
				const updated = db.prepare("SELECT * FROM flows WHERE id = ?").get(id);
				return reply.send({ feature: updated, completed: true });
			}

			const nextStep = workflowSteps[currentIdx + 1];

			db.prepare(
				"UPDATE features SET current_step = ?, updated_at = datetime('now') WHERE id = ?",
			).run(nextStep, id);

			db.prepare(
				"UPDATE steps SET status = 'current', started_at = datetime('now') WHERE flow_id = ? AND name = ?",
			).run(id, nextStep);

			bus.emit("step:advanced", {
				flowId: id,
				from: feature.current_step,
				to: nextStep,
			});

			const updated = db.prepare("SELECT * FROM flows WHERE id = ?").get(id);
			const steps = db
				.prepare("SELECT * FROM steps WHERE flow_id = ? ORDER BY rowid")
				.all(id);
			return reply.send({ feature: updated, steps, completed: false });
		},
	);

	app.post<{ Params: { id: string } }>(
		"/api/features/:id/back",
		async (req, reply) => {
			const { id } = req.params;
			const db = getDb();

			const feature = db.prepare("SELECT * FROM flows WHERE id = ?").get(id) as
				| Flow
				| undefined;
			if (!feature) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Flow not found" });
			}

			const workflowSteps = getFlowWorkflowStepNames(feature);
			const currentIdx = workflowSteps.indexOf(feature.current_step);
			if (currentIdx <= 0) {
				return reply
					.code(400)
					.send({ error: "invalid_state", message: "Already at first step" });
			}

			const prevStep = workflowSteps[currentIdx - 1];

			db.prepare(
				"UPDATE steps SET status = 'pending', started_at = NULL, completed_at = NULL WHERE flow_id = ? AND name = ?",
			).run(id, feature.current_step);

			db.prepare(
				"UPDATE steps SET status = 'current', completed_at = NULL WHERE flow_id = ? AND name = ?",
			).run(id, prevStep);

			db.prepare(
				"UPDATE features SET current_step = ?, updated_at = datetime('now') WHERE id = ?",
			).run(prevStep, id);

			bus.emit("step:back", {
				flowId: id,
				from: feature.current_step,
				to: prevStep,
			});

			const updated = db.prepare("SELECT * FROM flows WHERE id = ?").get(id);
			const steps = db
				.prepare("SELECT * FROM steps WHERE flow_id = ? ORDER BY rowid")
				.all(id);
			return reply.send({ feature: updated, steps });
		},
	);

	app.post<{ Params: { id: string }; Body: { stepName: string } }>(
		"/api/features/:id/focus-step",
		async (req, reply) => {
			const { id } = req.params;
			const { stepName } = req.body;
			const db = getDb();

			const feature = db.prepare("SELECT * FROM flows WHERE id = ?").get(id) as
				| Flow
				| undefined;
			if (!feature) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Flow not found" });
			}

			const workflowSteps = getFlowWorkflowStepNames(feature);
			const targetIdx = workflowSteps.indexOf(stepName as FlowStep);
			if (targetIdx === -1) {
				return reply
					.code(400)
					.send({ error: "invalid_state", message: "Invalid target step" });
			}

			const markDone = db.prepare(
				`UPDATE steps
				 SET status = 'done', completed_at = COALESCE(completed_at, datetime('now'))
				 WHERE flow_id = ? AND name = ?`,
			);
			const markCurrent = db.prepare(
				`UPDATE steps
				 SET status = 'current', started_at = COALESCE(started_at, datetime('now')), completed_at = NULL
				 WHERE flow_id = ? AND name = ?`,
			);
			const markPending = db.prepare(
				`UPDATE steps
				 SET status = 'pending', started_at = NULL, completed_at = NULL
				 WHERE flow_id = ? AND name = ?`,
			);

			for (const [idx, name] of workflowSteps.entries()) {
				if (idx < targetIdx) {
					markDone.run(id, name);
				} else if (idx === targetIdx) {
					markCurrent.run(id, name);
				} else {
					markPending.run(id, name);
				}
			}

			db.prepare(
				"UPDATE features SET current_step = ?, status = 'in_progress', updated_at = datetime('now') WHERE id = ?",
			).run(stepName, id);

			bus.emit("step:status_changed", {
				flowId: id,
				stepName,
				status: "running",
			});

			const updated = db.prepare("SELECT * FROM flows WHERE id = ?").get(id);
			const steps = db
				.prepare("SELECT * FROM steps WHERE flow_id = ? ORDER BY rowid")
				.all(id);
			return reply.send({ feature: updated, steps });
		},
	);

	app.patch<{ Params: { id: string }; Body: { status: StepStatus } }>(
		"/api/steps/:id/status",
		async (req, reply) => {
			const { id } = req.params;
			const { status } = req.body;

			const validStatuses: StepStatus[] = [
				"pending",
				"current",
				"running",
				"needs_user",
				"blocked",
				"done",
				"rejected",
			];
			if (!status || !validStatuses.includes(status)) {
				return reply.code(400).send({
					error: "validation",
					message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
				});
			}

			const db = getDb();
			const step = db.prepare("SELECT * FROM steps WHERE id = ?").get(id) as
				| Step
				| undefined;
			if (!step) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Step not found" });
			}

			const completedAt = status === "done" ? "datetime('now')" : "NULL";
			db.prepare(
				`UPDATE steps SET status = ?, completed_at = ${completedAt} WHERE id = ?`,
			).run(status, id);

			bus.emit("step:status_changed", {
				flowId: step.flow_id,
				stepName: step.name,
				status,
			});

			const updated = db.prepare("SELECT * FROM steps WHERE id = ?").get(id);
			return reply.send(updated);
		},
	);

	app.post<{
		Params: { id: string };
		Body: {
			agentRunSettings?: Partial<AgentRunSettings> & { thinkingLevel?: string };
		};
	}>("/api/features/:id/run-step", async (req, reply) => {
		const { id } = req.params;
		const { agentRunSettings } = req.body;

		const db = getDb();
		const feature = db.prepare("SELECT * FROM flows WHERE id = ?").get(id) as
			| Flow
			| undefined;
		if (!feature) {
			return reply
				.code(404)
				.send({ error: "not_found", message: "Flow not found" });
		}

		const settings = buildRunSettings(agentRunSettings ?? {});

		// Save settings for reference
		const settingsId = nanoid(12);
		db.prepare(
			`INSERT INTO agent_run_settings
         (id, flow_id, step_name, effort_level, execution_mode, model_id, agent_profile,
          allow_web_research, allow_repo_scan, allow_memory_search,
          max_research_results, max_interview_questions, review_strictness)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		).run(
			settingsId,
			id,
			feature.current_step,
			settings.effortLevel,
			settings.executionMode,
			settings.modelId ?? null,
			settings.agentProfile ?? null,
			settings.allowWebResearch ? 1 : 0,
			settings.allowRepoScan ? 1 : 0,
			settings.allowMemorySearch ? 1 : 0,
			settings.maxResearchResults ?? null,
			settings.maxInterviewQuestions ?? null,
			settings.reviewStrictness,
		);

		bus.emit("settings:saved", { id: settingsId, flowId: id });

		// Determine action type from current step
		const stepToAction: Record<string, ActionType> = {
			intake: "run_step",
			research: "research",
			interview: "interview",
			spec: "spec",
			ddd: "ddd",
			behavior: "behavior",
			implementation_plan: "implementation_plan",
			implementation: "implementation",
			review: "review",
			memory_update: "memory_update",
		};

		const actionType: ActionType =
			stepToAction[feature.current_step] ?? "run_step";

		// Enqueue via PiBridge
		db.prepare(
			"UPDATE steps SET status = 'running', started_at = COALESCE(started_at, datetime('now')) WHERE flow_id = ? AND name = ?",
		).run(id, feature.current_step);
		bus.emit("step:status_changed", {
			flowId: id,
			stepName: feature.current_step,
			status: "running",
		});

		const bridge = getPiBridge();
		const result = bridge.enqueue({
			workspaceId: feature.workspace_id,
			flowId: id,
			actionType,
			stepName: feature.current_step,
			modelId: settings.modelId,
			thinkingLevel: agentRunSettings?.thinkingLevel,
			effortLevel: settings.effortLevel,
			executionMode: settings.executionMode,
			allowRepoScan: settings.allowRepoScan,
			allowMemorySearch: settings.allowMemorySearch,
			allowWebResearch: settings.allowWebResearch,
			maxResearchResults: settings.maxResearchResults ?? undefined,
			maxInterviewQuestions: settings.maxInterviewQuestions ?? undefined,
			reviewStrictness: settings.reviewStrictness,
		});

		const statusCode = result.status === "not_connected" ? 503 : 200;
		const stepLabel = getStepLabel(feature);
		return reply.code(statusCode).send({
			flowId: id,
			step: feature.current_step,
			settings,
			settingsId,
			actionRunId: result.actionRunId,
			actionStatus: result.status,
			message:
				result.status === "not_connected"
					? `Pi agent not connected. Step "${stepLabel}" cannot be executed.`
					: `Step "${stepLabel}" enqueued for execution (effort: ${settings.effortLevel})`,
		});
	});

	// Run any action type on a feature
	app.post<{
		Params: { id: string };
		Body: {
			actionType: ActionType;
			agentRunSettings?: Partial<AgentRunSettings> & { thinkingLevel?: string };
		};
	}>("/api/features/:id/run-action", async (req, reply) => {
		const { id } = req.params;
		const { actionType, agentRunSettings } = req.body;

		const db = getDb();
		const feature = db.prepare("SELECT * FROM flows WHERE id = ?").get(id) as
			| Flow
			| undefined;
		if (!feature) {
			return reply
				.code(404)
				.send({ error: "not_found", message: "Flow not found" });
		}

		if (!actionType) {
			return reply
				.code(400)
				.send({ error: "validation", message: "actionType is required" });
		}

		const settings = buildRunSettings(agentRunSettings ?? {});

		const bridge = getPiBridge();
		const result = bridge.enqueue({
			workspaceId: feature.workspace_id,
			flowId: id,
			actionType,
			stepName: feature.current_step,
			modelId: settings.modelId,
			thinkingLevel: agentRunSettings?.thinkingLevel,
			effortLevel: settings.effortLevel,
			executionMode: settings.executionMode,
			allowRepoScan: settings.allowRepoScan,
			allowMemorySearch: settings.allowMemorySearch,
			allowWebResearch: settings.allowWebResearch,
			maxResearchResults: settings.maxResearchResults ?? undefined,
			maxInterviewQuestions: settings.maxInterviewQuestions ?? undefined,
			reviewStrictness: settings.reviewStrictness,
		});

		const statusCode = result.status === "not_connected" ? 503 : 201;
		return reply.code(statusCode).send({
			flowId: id,
			actionType,
			actionRunId: result.actionRunId,
			actionStatus: result.status,
		});
	});
}

// --- Helpers ---

interface FlowWithWorkflow {
	workspace_id: string;
	current_step: string;
	workflow_id?: string | null;
}

/** Get the ordered step names for a feature's workflow */
function getFlowWorkflowStepNames(feature: FlowWithWorkflow): string[] {
	if (feature.workflow_id) {
		const workflow = getWorkflow(feature.workflow_id);
		if (workflow) {
			return parseWorkflowSteps(workflow).map((s) => s.name);
		}
	}
	// Fallback: use project workflow or default
	const workflow = getProjectWorkflow(feature.workspace_id);
	return parseWorkflowSteps(workflow).map((s) => s.name);
}

/** Get a human-readable label for the feature's current step */
function getStepLabel(feature: FlowWithWorkflow): string {
	if (feature.workflow_id) {
		const workflow = getWorkflow(feature.workflow_id);
		if (workflow) {
			const steps = parseWorkflowSteps(workflow);
			const step = steps.find((s) => s.name === feature.current_step);
			if (step) return step.label;
		}
	}
	// Fallback to hardcoded labels
	return STEP_LABELS[feature.current_step as FlowStep] ?? feature.current_step;
}
