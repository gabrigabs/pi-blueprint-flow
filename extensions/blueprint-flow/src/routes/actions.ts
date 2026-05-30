import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import type { FlowStep, StepStatus } from "../config.js";
import { FLOW_STEPS, STEP_LABELS } from "../config.js";
import type { Feature, Step } from "../db.js";
import { getDb } from "../db.js";
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

			const feature = db
				.prepare("SELECT * FROM features WHERE id = ?")
				.get(id) as Feature | undefined;
			if (!feature) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Feature not found" });
			}

			const currentIdx = FLOW_STEPS.indexOf(feature.current_step as FlowStep);
			if (currentIdx === -1) {
				return reply
					.code(400)
					.send({ error: "invalid_state", message: "Invalid current step" });
			}

			db.prepare(
				"UPDATE steps SET status = 'done', completed_at = datetime('now') WHERE feature_id = ? AND name = ?",
			).run(id, feature.current_step);

			if (currentIdx === FLOW_STEPS.length - 1) {
				db.prepare(
					"UPDATE features SET status = 'done', updated_at = datetime('now') WHERE id = ?",
				).run(id);

				bus.emit("feature:updated", {
					id,
					step: feature.current_step,
					status: "done",
				});
				const updated = db
					.prepare("SELECT * FROM features WHERE id = ?")
					.get(id);
				return reply.send({ feature: updated, completed: true });
			}

			const nextStep = FLOW_STEPS[currentIdx + 1];

			db.prepare(
				"UPDATE features SET current_step = ?, updated_at = datetime('now') WHERE id = ?",
			).run(nextStep, id);

			db.prepare(
				"UPDATE steps SET status = 'running', started_at = datetime('now') WHERE feature_id = ? AND name = ?",
			).run(id, nextStep);

			bus.emit("step:advanced", {
				featureId: id,
				from: feature.current_step,
				to: nextStep,
			});

			const updated = db.prepare("SELECT * FROM features WHERE id = ?").get(id);
			const steps = db
				.prepare("SELECT * FROM steps WHERE feature_id = ? ORDER BY rowid")
				.all(id);
			return reply.send({ feature: updated, steps, completed: false });
		},
	);

	app.post<{ Params: { id: string } }>(
		"/api/features/:id/back",
		async (req, reply) => {
			const { id } = req.params;
			const db = getDb();

			const feature = db
				.prepare("SELECT * FROM features WHERE id = ?")
				.get(id) as Feature | undefined;
			if (!feature) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Feature not found" });
			}

			const currentIdx = FLOW_STEPS.indexOf(feature.current_step as FlowStep);
			if (currentIdx <= 0) {
				return reply
					.code(400)
					.send({ error: "invalid_state", message: "Already at first step" });
			}

			const prevStep = FLOW_STEPS[currentIdx - 1];

			db.prepare(
				"UPDATE steps SET status = 'pending', started_at = NULL, completed_at = NULL WHERE feature_id = ? AND name = ?",
			).run(id, feature.current_step);

			db.prepare(
				"UPDATE steps SET status = 'running', completed_at = NULL WHERE feature_id = ? AND name = ?",
			).run(id, prevStep);

			db.prepare(
				"UPDATE features SET current_step = ?, updated_at = datetime('now') WHERE id = ?",
			).run(prevStep, id);

			bus.emit("step:back", {
				featureId: id,
				from: feature.current_step,
				to: prevStep,
			});

			const updated = db.prepare("SELECT * FROM features WHERE id = ?").get(id);
			const steps = db
				.prepare("SELECT * FROM steps WHERE feature_id = ? ORDER BY rowid")
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
				featureId: step.feature_id,
				stepName: step.name,
				status,
			});

			const updated = db.prepare("SELECT * FROM steps WHERE id = ?").get(id);
			return reply.send(updated);
		},
	);

	app.post<{
		Params: { id: string };
		Body: { agentRunSettings?: Partial<AgentRunSettings> };
	}>("/api/features/:id/run-step", async (req, reply) => {
		const { id } = req.params;
		const { agentRunSettings } = req.body;

		const db = getDb();
		const feature = db.prepare("SELECT * FROM features WHERE id = ?").get(id) as
			| Feature
			| undefined;
		if (!feature) {
			return reply
				.code(404)
				.send({ error: "not_found", message: "Feature not found" });
		}

		const settings = buildRunSettings(agentRunSettings ?? {});

		// Save settings for reference
		const settingsId = nanoid(12);
		db.prepare(
			`INSERT INTO agent_run_settings
         (id, feature_id, step_name, effort_level, execution_mode, model_id, agent_profile,
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

		bus.emit("settings:saved", { id: settingsId, featureId: id });

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
		const bridge = getPiBridge();
		const result = bridge.enqueue({
			projectId: feature.project_id,
			featureId: id,
			actionType,
			stepName: feature.current_step,
			modelId: settings.modelId,
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
		return reply.code(statusCode).send({
			featureId: id,
			step: feature.current_step,
			settings,
			settingsId,
			actionRunId: result.actionRunId,
			actionStatus: result.status,
			message:
				result.status === "not_connected"
					? `Pi agent not connected. Step "${STEP_LABELS[feature.current_step as FlowStep]}" cannot be executed.`
					: `Step "${STEP_LABELS[feature.current_step as FlowStep]}" enqueued for execution (effort: ${settings.effortLevel})`,
		});
	});

	// Run any action type on a feature
	app.post<{
		Params: { id: string };
		Body: {
			actionType: ActionType;
			agentRunSettings?: Partial<AgentRunSettings>;
		};
	}>("/api/features/:id/run-action", async (req, reply) => {
		const { id } = req.params;
		const { actionType, agentRunSettings } = req.body;

		const db = getDb();
		const feature = db.prepare("SELECT * FROM features WHERE id = ?").get(id) as
			| Feature
			| undefined;
		if (!feature) {
			return reply
				.code(404)
				.send({ error: "not_found", message: "Feature not found" });
		}

		if (!actionType) {
			return reply
				.code(400)
				.send({ error: "validation", message: "actionType is required" });
		}

		const settings = buildRunSettings(agentRunSettings ?? {});

		const bridge = getPiBridge();
		const result = bridge.enqueue({
			projectId: feature.project_id,
			featureId: id,
			actionType,
			stepName: feature.current_step,
			modelId: settings.modelId,
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
			featureId: id,
			actionType,
			actionRunId: result.actionRunId,
			actionStatus: result.status,
		});
	});
}
