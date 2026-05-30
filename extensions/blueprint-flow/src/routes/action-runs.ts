import type { FastifyInstance } from "fastify";
import {
	getActionRun,
	getActiveActionRun,
	listActionRunEvents,
	listActionRuns,
} from "../db.js";
import { getCurrentRunId, getPiBridge } from "../pi-bridge.js";
import type {
	ActionRunStatus,
	ActionType,
	RunBlueprintActionInput,
} from "../types.js";

export function registerActionRunRoutes(app: FastifyInstance): void {
	// List action runs (with optional filters)
	app.get<{
		Querystring: {
			featureId?: string;
			projectId?: string;
			status?: ActionRunStatus;
			limit?: string;
		};
	}>("/api/action-runs", async (req, reply) => {
		const { featureId, projectId, status, limit } = req.query;
		const runs = listActionRuns({
			featureId,
			projectId,
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
