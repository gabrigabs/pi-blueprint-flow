import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import {
	createActionRunEvent,
	getActionRun,
	getActiveActionRun,
	getDb,
	listActionRunEvents,
	listActionRuns,
} from "../db.js";
import { bus } from "../events.js";
import { getCurrentRunId, getPiBridge } from "../pi-bridge.js";
import { getPiRef } from "../services/pi-config-reader.js";
import type {
	ActionRunStatus,
	ActionType,
	RunBlueprintActionInput,
} from "../types.js";

export function registerActionRunRoutes(app: FastifyInstance): void {
	// List action runs (with optional filters)
	app.get<{
		Querystring: {
			flowId?: string;
			workspaceId?: string;
			status?: ActionRunStatus;
			limit?: string;
		};
	}>("/api/action-runs", async (req, reply) => {
		const { flowId, workspaceId, status, limit } = req.query;
		const runs = listActionRuns({
			flowId,
			workspaceId,
			status,
			limit: limit ? Number.parseInt(limit, 10) : undefined,
		});
		return reply.send(runs);
	});

	// Get single action run
	app.get<{ Params: { id: string } }>(
		"/api/action-runs/:id",
		async (req, reply) => {
			const run = getActionRun(req.params.id);
			if (!run) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Action run not found" });
			}
			return reply.send(run);
		},
	);

	// Get events for an action run
	app.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
		"/api/action-runs/:id/events",
		async (req, reply) => {
			const run = getActionRun(req.params.id);
			if (!run) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Action run not found" });
			}
			const limit = req.query.limit
				? Number.parseInt(req.query.limit, 10)
				: 100;
			const events = listActionRunEvents(run.id, limit);
			return reply.send(events);
		},
	);

	// Enqueue a new action run
	app.post<{ Body: RunBlueprintActionInput }>(
		"/api/action-runs",
		async (req, reply) => {
			const input = req.body;

			if (!input.actionType) {
				return reply
					.code(400)
					.send({ error: "validation", message: "actionType is required" });
			}

			const bridge = getPiBridge();
			const result = bridge.enqueue(input);

			const statusCode = result.status === "not_connected" ? 503 : 201;
			return reply.code(statusCode).send(result);
		},
	);

	// Cancel an action run
	app.post<{ Params: { id: string } }>(
		"/api/action-runs/:id/cancel",
		async (req, reply) => {
			const bridge = getPiBridge();
			const cancelled = bridge.cancel(req.params.id);

			if (!cancelled) {
				const run = getActionRun(req.params.id);
				if (!run) {
					return reply
						.code(404)
						.send({ error: "not_found", message: "Action run not found" });
				}
				return reply.code(409).send({
					error: "cannot_cancel",
					message: "Action run is not in a cancellable state",
				});
			}

			return reply.send({ success: true, status: "cancelled" });
		},
	);

	// Force-cancel a stuck action run (bypasses bridge, writes directly to DB)
	app.post<{ Params: { id: string } }>(
		"/api/action-runs/:id/force-cancel",
		async (req, reply) => {
			const db = getDb();
			const run = db
				.prepare(
					"SELECT id, status, flow_id, step_name FROM action_runs WHERE id = ?",
				)
				.get(req.params.id) as
				| {
						id: string;
						status: string;
						flow_id: string | null;
						step_name: string | null;
				  }
				| undefined;

			if (!run) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Action run not found" });
			}

			if (
				["completed", "failed", "cancelled", "not_connected"].includes(
					run.status,
				)
			) {
				return reply.code(409).send({
					error: "already_terminal",
					message: "Action run is already in a terminal state",
				});
			}

			const now = new Date().toISOString().replace("T", " ").slice(0, 19);

			db.prepare(
				"UPDATE action_runs SET status = 'cancelled', completed_at = ? WHERE id = ?",
			).run(now, run.id);

			if (run.flow_id && run.step_name) {
				db.prepare(
					"UPDATE steps SET status = 'current' WHERE flow_id = ? AND name = ? AND status = 'running'",
				).run(run.flow_id, run.step_name);
			}

			bus.emit("action:updated", {
				id: run.id,
				status: "cancelled",
			});

			return reply.send({ success: true, status: "cancelled" });
		},
	);

	// Inject context into a running action
	app.post<{ Params: { id: string }; Body: { message: string } }>(
		"/api/action-runs/:id/inject",
		async (req, reply) => {
			const { id } = req.params;
			const { message } = req.body;

			if (!message?.trim()) {
				return reply
					.code(400)
					.send({ error: "validation", message: "message is required" });
			}

			const currentId = getCurrentRunId();
			if (currentId !== id) {
				return reply.code(409).send({
					error: "not_active",
					message: "Action run is not currently active",
				});
			}

			const pi = getPiRef();
			if (!pi) {
				return reply
					.code(503)
					.send({ error: "unavailable", message: "Pi agent not connected" });
			}

			try {
				pi.sendUserMessage(message, { deliverAs: "followUp" });

				createActionRunEvent({
					id: nanoid(),
					actionRunId: id,
					type: "ui.context.injected",
					message: `Context injected: ${message.slice(0, 100)}`,
				});

				bus.emit("action:event", {
					actionRunId: id,
					type: "ui.context.injected",
					message: `Context injected: ${message.slice(0, 100)}`,
					dataJson: null,
				});

				return reply.send({ success: true });
			} catch (err: unknown) {
				const msg =
					err instanceof Error ? err.message : "Failed to inject context";
				return reply.code(500).send({ error: "internal", message: msg });
			}
		},
	);

	// Retry a failed action with optional feedback
	app.post<{
		Params: { id: string };
		Body: { feedback?: string };
	}>("/api/action-runs/:id/retry", async (req, reply) => {
		const { id } = req.params;
		const { feedback } = req.body;

		const run = getActionRun(id);
		if (!run) {
			return reply
				.code(404)
				.send({ error: "not_found", message: "Action run not found" });
		}

		if (!["failed", "cancelled", "completed"].includes(run.status)) {
			return reply.code(409).send({
				error: "invalid_state",
				message: "Can only retry failed, cancelled, or completed actions",
			});
		}

		const bridge = getPiBridge();
		const input: RunBlueprintActionInput = {
			workspaceId: run.workspace_id ?? undefined,
			flowId: run.flow_id ?? undefined,
			actionType: run.action_type as ActionType,
			stepName: run.step_name ?? undefined,
			modelId: run.model_id ?? undefined,
			effortLevel: (run.effort_level as any) ?? undefined,
			executionMode: (run.execution_mode as any) ?? undefined,
			extraContext: feedback ? { retryFeedback: feedback } : undefined,
		};

		const result = bridge.enqueue(input);
		return reply.send(result);
	});

	// Get bridge status
	app.get("/api/bridge/status", async (_req, reply) => {
		const bridge = getPiBridge();
		const currentRunId = getCurrentRunId();
		const activeRun = getActiveActionRun();

		return reply.send({
			status: bridge.getStatus(),
			currentRunId,
			activeRun: activeRun
				? {
						id: activeRun.id,
						actionType: activeRun.action_type,
						status: activeRun.status,
						stepName: activeRun.step_name,
						startedAt: activeRun.started_at,
					}
				: null,
		});
	});
}
