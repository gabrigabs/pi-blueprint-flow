import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { getDb, getWorkspaceWorkflow, parseWorkflowSteps } from "../db.js";
import { bus } from "../events.js";
import type { CreateFlowInput, UpdateFlowInput } from "../types.js";
import { buildRunSettings, PRIORITY_LEVELS, RISK_LEVELS } from "../types.js";

export function registerFlowRoutes(app: FastifyInstance): void {
	app.post<{ Params: { workspaceId: string }; Body: CreateFlowInput }>(
		"/api/workspaces/:workspaceId/flows",
		async (req, reply) => {
			const { workspaceId } = req.params;
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

			const workspace = db
				.prepare("SELECT id FROM workspaces WHERE id = ?")
				.get(workspaceId);
			if (!workspace) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Workspace not found" });
			}

			const flowId = nanoid(12);

			const workflow = getWorkspaceWorkflow(workspaceId);
			const workflowSteps = parseWorkflowSteps(workflow);
			const firstStepName = workflowSteps[0]?.name ?? "intake";

			db.prepare(
				`INSERT INTO flows (id, workspace_id, title, description, type, risk_level, priority, current_step, status, workflow_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'in_progress', ?)`,
			).run(
				flowId,
				workspaceId,
				title.trim(),
				description?.trim() ?? null,
				type ?? "feature",
				riskLevel ?? "auto",
				priority ?? "medium",
				firstStepName,
				workflow.id,
			);

			const insertStep = db.prepare(
				"INSERT INTO steps (id, flow_id, name, status, started_at) VALUES (?, ?, ?, ?, ?)",
			);

			const initSteps = db.transaction(() => {
				for (let i = 0; i < workflowSteps.length; i++) {
					const step = workflowSteps[i];
					const isFirst = i === 0;
					insertStep.run(
						nanoid(12),
						flowId,
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
           (id, flow_id, effort_level, execution_mode, model_id, agent_profile,
            allow_web_research, allow_repo_scan, allow_memory_search,
            max_research_results, max_interview_questions, review_strictness)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				).run(
					settingsId,
					flowId,
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

			bus.emit("flow:created", {
				id: flowId,
				workspaceId,
				title: title.trim(),
			});

			const flow = db.prepare("SELECT * FROM flows WHERE id = ?").get(flowId);
			return reply.code(201).send(flow);
		},
	);

	app.patch<{ Params: { id: string }; Body: UpdateFlowInput }>(
		"/api/flows/:id",
		async (req, reply) => {
			const { id } = req.params;
			const { title, description, type, riskLevel, priority } = req.body;

			const db = getDb();
			const existing = db.prepare("SELECT * FROM flows WHERE id = ?").get(id);
			if (!existing) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Flow not found" });
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

			db.prepare(`UPDATE flows SET ${updates.join(", ")} WHERE id = ?`).run(
				...values,
			);
			bus.emit("flow:updated", { id, step: "", status: "" });

			const updated = db.prepare("SELECT * FROM flows WHERE id = ?").get(id);
			return reply.send(updated);
		},
	);

	app.delete<{ Params: { id: string } }>(
		"/api/flows/:id",
		async (req, reply) => {
			const { id } = req.params;
			const db = getDb();

			const existing = db.prepare("SELECT * FROM flows WHERE id = ?").get(id);
			if (!existing) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Flow not found" });
			}

			const cascade = db.transaction(() => {
				db.prepare(
					"DELETE FROM action_run_events WHERE action_run_id IN (SELECT id FROM action_runs WHERE flow_id = ?)",
				).run(id);
				db.prepare("DELETE FROM action_runs WHERE flow_id = ?").run(id);
				db.prepare("DELETE FROM agent_run_settings WHERE flow_id = ?").run(id);
				db.prepare("DELETE FROM artifacts WHERE flow_id = ?").run(id);
				db.prepare("DELETE FROM interviews WHERE flow_id = ?").run(id);
				db.prepare("DELETE FROM steps WHERE flow_id = ?").run(id);
				db.prepare("DELETE FROM flows WHERE id = ?").run(id);
			});
			cascade();

			bus.emit("flow:updated", { id, step: "", status: "" });
			return reply.code(204).send();
		},
	);

	app.get<{ Querystring: { limit?: string } }>(
		"/api/flows/recent",
		async (req, reply) => {
			const limit = Math.min(
				Number.parseInt(req.query.limit ?? "8", 10) || 8,
				20,
			);
			const db = getDb();
			const flows = db
				.prepare(
					`SELECT f.*, w.name as workspace_name
				 FROM flows f
				 JOIN workspaces w ON w.id = f.workspace_id
				 ORDER BY f.updated_at DESC
				 LIMIT ?`,
				)
				.all(limit);
			return reply.send(flows);
		},
	);
}
