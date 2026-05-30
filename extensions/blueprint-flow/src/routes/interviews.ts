import type { FastifyInstance } from "fastify";
import { getDb } from "../db.js";
import { bus } from "../events.js";
import type { Interview } from "../db.js";

export function registerInterviewRoutes(app: FastifyInstance): void {
	// Get pending (unanswered) interviews for a feature
	app.get<{ Params: { featureId: string } }>(
		"/api/features/:featureId/interviews/pending",
		async (req) => {
			const db = getDb();
			const rows = db
				.prepare(
					"SELECT * FROM interviews WHERE feature_id = ? AND answer IS NULL ORDER BY created_at ASC",
				)
				.all(req.params.featureId) as any[];

			return rows.map((r) => ({
				...r,
				options: r.options ? JSON.parse(r.options) : null,
			}));
		},
	);

	// Answer an interview question
	app.post<{ Params: { id: string }; Body: { answer: string } }>(
		"/api/interviews/:id/answer",
		async (req, reply) => {
			const { id } = req.params;
			const { answer } = req.body;

			if (!answer || typeof answer !== "string" || !answer.trim()) {
				return reply
					.code(400)
					.send({ error: "validation", message: "Answer is required" });
			}

			const db = getDb();
			const interview = db
				.prepare("SELECT * FROM interviews WHERE id = ?")
				.get(id) as Interview | undefined;

			if (!interview) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Interview question not found" });
			}

			if (interview.answer) {
				return reply
					.code(409)
					.send({ error: "already_answered", message: "Question already answered" });
			}

			db.prepare("UPDATE interviews SET answer = ? WHERE id = ?").run(
				answer.trim(),
				id,
			);

			bus.emit("interview:answered", { id, answer: answer.trim() });

			// Check if this was a required question blocking a step
			if (interview.required) {
				// Check if all required questions for this feature are now answered
				const pendingRequired = db
					.prepare(
						"SELECT COUNT(*) as count FROM interviews WHERE feature_id = ? AND required = 1 AND answer IS NULL",
					)
					.get(interview.feature_id) as { count: number };

				if (pendingRequired.count === 0) {
					// Unblock the step — change needs_user back to running
					const step = db
						.prepare(
							"SELECT * FROM steps WHERE feature_id = ? AND status = 'needs_user' LIMIT 1",
						)
						.get(interview.feature_id) as { id: string; name: string } | undefined;

					if (step) {
						db.prepare("UPDATE steps SET status = 'running' WHERE id = ?").run(
							step.id,
						);
						bus.emit("step:status_changed", {
							featureId: interview.feature_id,
							stepName: step.name,
							status: "running",
						});
					}
				}
			}

			const updated = db
				.prepare("SELECT * FROM interviews WHERE id = ?")
				.get(id);
			return reply.send(updated);
		},
	);

	// Skip an interview question
	app.post<{ Params: { id: string }; Body: { reason?: string } }>(
		"/api/interviews/:id/skip",
		async (req, reply) => {
			const { id } = req.params;
			const reason = req.body?.reason;

			const db = getDb();
			const interview = db
				.prepare("SELECT * FROM interviews WHERE id = ?")
				.get(id) as Interview | undefined;

			if (!interview) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Interview question not found" });
			}

			if (interview.required) {
				return reply.code(400).send({
					error: "cannot_skip",
					message: "Cannot skip a required question",
				});
			}

			const skipAnswer = reason
				? `[SKIPPED] ${reason}`
				: "[SKIPPED]";

			db.prepare("UPDATE interviews SET answer = ? WHERE id = ?").run(
				skipAnswer,
				id,
			);

			bus.emit("interview:answered", { id, answer: skipAnswer });

			const updated = db
				.prepare("SELECT * FROM interviews WHERE id = ?")
				.get(id);
			return reply.send(updated);
		},
	);
}
