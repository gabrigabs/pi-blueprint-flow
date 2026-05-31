import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { getDb, getProjectWorkflow, parseWorkflowSteps } from "../db.js";
import { bus } from "../events.js";
import type { CreateFeatureInput, UpdateFeatureInput } from "../types.js";
import {
	buildRunSettings,
	FEATURE_TYPES,
	PRIORITY_LEVELS,
	RISK_LEVELS,
} from "../types.js";

export function registerFeatureRoutes(app: FastifyInstance): void {
	app.post<{ Params: { projectId: string }; Body: CreateFeatureInput }>(
		"/api/projects/:projectId/features",
		async (req, reply) => {
			const { projectId } = req.params;
			const {
				title,
				description,
				type,
				riskLevel,
				priority,
				agentRunSettings,
			} = req.body;

			if (!title || typeof title !== "string" || !title.trim()) {
				return reply
					.code(400)
					.send({ error: "validation", message: "Title is required" });
			}

			if (type && !FEATURE_TYPES.includes(type)) {
				return reply.code(400).send({
					error: "validation",
					message: `Invalid type. Must be one of: ${FEATURE_TYPES.join(", ")}`,
				});
			}

			if (riskLevel && !RISK_LEVELS.includes(riskLevel)) {
				return reply.code(400).send({
					error: "validation",
					message: `Invalid risk level. Must be one of: ${RISK_LEVELS.join(", ")}`,
				});
			}

			if (priority && !PRIORITY_LEVELS.includes(priority)) {
				return reply.code(400).send({
					error: "validation",
					message: `Invalid priority. Must be one of: ${PRIORITY_LEVELS.join(", ")}`,
				});
			}

			const db = getDb();

			const project = db
				.prepare("SELECT id FROM projects WHERE id = ?")
				.get(projectId);
			if (!project) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Project not found" });
			}

			const featureId = nanoid(12);

			// Get the project's workflow to determine steps
			const workflow = getProjectWorkflow(projectId);
			const workflowSteps = parseWorkflowSteps(workflow);
			const firstStepName = workflowSteps[0]?.name ?? "intake";

			db.prepare(
				`INSERT INTO features (id, project_id, title, description, type, risk_level, priority, current_step, status, workflow_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'in_progress', ?)`,
			).run(
				featureId,
				projectId,
				title.trim(),
				description?.trim() ?? null,
				type ?? "feature",
				riskLevel ?? "auto",
				priority ?? "medium",
				firstStepName,
				workflow.id,
			);

			const insertStep = db.prepare(
				"INSERT INTO steps (id, feature_id, name, status, started_at) VALUES (?, ?, ?, ?, ?)",
			);

			const initSteps = db.transaction(() => {
				for (let i = 0; i < workflowSteps.length; i++) {
					const step = workflowSteps[i];
					const isFirst = i === 0;
					insertStep.run(
						nanoid(12),
						featureId,
						step.name,
						isFirst ? "current" : "pending",
						isFirst
							? new Date().toISOString().replace("T", " ").slice(0, 19)
							: null,
					);
				}
			});
			initSteps();

			if (agentRunSettings) {
				const settings = buildRunSettings(agentRunSettings);
				const settingsId = nanoid(12);
				db.prepare(
					`INSERT INTO agent_run_settings
           (id, feature_id, effort_level, execution_mode, model_id, agent_profile,
            allow_web_research, allow_repo_scan, allow_memory_search,
            max_research_results, max_interview_questions, review_strictness)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				).run(
					settingsId,
					featureId,
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
			}

			bus.emit("feature:created", {
				id: featureId,
				projectId,
				title: title.trim(),
			});

			const feature = db
				.prepare("SELECT * FROM features WHERE id = ?")
				.get(featureId);
			return reply.code(201).send(feature);
		},
	);

	app.patch<{ Params: { id: string }; Body: UpdateFeatureInput }>(
		"/api/features/:id",
		async (req, reply) => {
			const { id } = req.params;
			const { title, description, type, riskLevel, priority } = req.body;

			const db = getDb();
			const existing = db
				.prepare("SELECT * FROM features WHERE id = ?")
				.get(id);
			if (!existing) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Feature not found" });
			}

			const updates: string[] = [];
			const values: unknown[] = [];

			if (title !== undefined) {
				updates.push("title = ?");
				values.push(title.trim());
			}
			if (description !== undefined) {
				updates.push("description = ?");
				values.push(description?.trim() ?? null);
			}
			if (type !== undefined) {
				if (!FEATURE_TYPES.includes(type)) {
					return reply
						.code(400)
						.send({ error: "validation", message: "Invalid type" });
				}
				updates.push("type = ?");
				values.push(type);
			}
			if (riskLevel !== undefined) {
				if (!RISK_LEVELS.includes(riskLevel)) {
					return reply
						.code(400)
						.send({ error: "validation", message: "Invalid risk level" });
				}
				updates.push("risk_level = ?");
				values.push(riskLevel);
			}
			if (priority !== undefined) {
				if (!PRIORITY_LEVELS.includes(priority)) {
					return reply
						.code(400)
						.send({ error: "validation", message: "Invalid priority" });
				}
				updates.push("priority = ?");
				values.push(priority);
			}

			if (updates.length === 0) {
				return reply
					.code(400)
					.send({ error: "validation", message: "No fields to update" });
			}

			updates.push("updated_at = datetime('now')");
			values.push(id);

			db.prepare(`UPDATE features SET ${updates.join(", ")} WHERE id = ?`).run(
				...values,
			);
			bus.emit("feature:updated", { id, step: "", status: "" });

			const updated = db.prepare("SELECT * FROM features WHERE id = ?").get(id);
			return reply.send(updated);
		},
	);

	app.delete<{ Params: { id: string } }>(
		"/api/features/:id",
		async (req, reply) => {
			const { id } = req.params;
			const db = getDb();

			const existing = db
				.prepare("SELECT * FROM features WHERE id = ?")
				.get(id);
			if (!existing) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Feature not found" });
			}

			const cascade = db.transaction(() => {
				db.prepare(
					"DELETE FROM action_events WHERE action_run_id IN (SELECT id FROM action_runs WHERE feature_id = ?)",
				).run(id);
				db.prepare("DELETE FROM action_runs WHERE feature_id = ?").run(id);
				db.prepare("DELETE FROM artifacts WHERE feature_id = ?").run(id);
				db.prepare("DELETE FROM interviews WHERE feature_id = ?").run(id);
				db.prepare("DELETE FROM steps WHERE feature_id = ?").run(id);
				db.prepare("DELETE FROM features WHERE id = ?").run(id);
			});
			cascade();

			bus.emit("feature:updated", { id, step: "", status: "" });
			return reply.code(204).send();
		},
	);
}
