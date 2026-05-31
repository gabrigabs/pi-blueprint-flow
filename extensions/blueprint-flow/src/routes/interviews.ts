import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import type { Interview } from "../db.js";
import { getDb } from "../db.js";
import { bus } from "../events.js";

function generateInterviewArtifact(flowId: string): void {
	const db = getDb();
	const interviews = db
		.prepare(
			"SELECT * FROM interviews WHERE flow_id = ? AND answer IS NOT NULL ORDER BY created_at ASC",
		)
		.all(flowId) as Interview[];

	if (interviews.length === 0) return;

	const lines: string[] = ["# Interview Summary\n"];

	for (const interview of interviews) {
		if (interview.answer?.startsWith("[SKIPPED]")) continue;
		lines.push(`## ${interview.question}\n`);
		if (interview.why) {
			lines.push(`> *${interview.why}*\n`);
		}
		lines.push(`**Answer:** ${interview.answer}\n`);
	}

	if (lines.length <= 1) return;

	const content = lines.join("\n");
	const existingArtifact = db
		.prepare(
			"SELECT id FROM artifacts WHERE flow_id = ? AND step_name = 'interview' AND filename = 'interview-summary.md'",
		)
		.get(flowId) as { id: string } | undefined;

	if (existingArtifact) {
		db.prepare("UPDATE artifacts SET content = ? WHERE id = ?").run(
			content,
			existingArtifact.id,
		);
		bus.emit("artifact:updated", { id: existingArtifact.id, flowId });
	} else {
		const id = nanoid(12);
		db.prepare(
			"INSERT INTO artifacts (id, flow_id, step_name, type, filename, content) VALUES (?, ?, ?, ?, ?, ?)",
		).run(id, flowId, "interview", "markdown", "interview-summary.md", content);
		bus.emit("artifact:saved", { id, flowId, type: "markdown" });
	}
}

export function registerInterviewRoutes(app: FastifyInstance): void {
	// Get pending (unanswered) interviews for a feature
	app.get<{ Params: { flowId: string } }>(
		"/api/flows/:flowId/interviews/pending",
		async (req) => {
			const db = getDb();
			const rows = db
				.prepare(
					"SELECT * FROM interviews WHERE flow_id = ? AND answer IS NULL ORDER BY created_at ASC",
				)
				.all(req.params.flowId) as any[];

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
				return reply.code(404).send({
					error: "not_found",
					message: "Interview question not found",
				});
			}

			if (interview.answer) {
				return reply.code(409).send({
					error: "already_answered",
					message: "Question already answered",
				});
			}

			db.prepare("UPDATE interviews SET answer = ? WHERE id = ?").run(
				answer.trim(),
				id,
			);

			bus.emit("interview:answered", { id, answer: answer.trim() });
			generateInterviewArtifact(interview.flow_id);

			// Check if this was a required question blocking a step
			if (interview.required) {
				// Check if all required questions for this feature are now answered
				const pendingRequired = db
					.prepare(
						"SELECT COUNT(*) as count FROM interviews WHERE flow_id = ? AND required = 1 AND answer IS NULL",
					)
					.get(interview.flow_id) as { count: number };

				if (pendingRequired.count === 0) {
					// Unblock the step — change needs_user back to running
					const step = db
						.prepare(
							"SELECT * FROM steps WHERE flow_id = ? AND status = 'needs_user' LIMIT 1",
						)
						.get(interview.flow_id) as { id: string; name: string } | undefined;

					if (step) {
						db.prepare("UPDATE steps SET status = 'running' WHERE id = ?").run(
							step.id,
						);
						bus.emit("step:status_changed", {
							flowId: interview.flow_id,
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
				return reply.code(404).send({
					error: "not_found",
					message: "Interview question not found",
				});
			}

			if (interview.required) {
				return reply.code(400).send({
					error: "cannot_skip",
					message: "Cannot skip a required question",
				});
			}

			const skipAnswer = reason ? `[SKIPPED] ${reason}` : "[SKIPPED]";

			db.prepare("UPDATE interviews SET answer = ? WHERE id = ?").run(
				skipAnswer,
				id,
			);

			bus.emit("interview:answered", { id, answer: skipAnswer });
			generateInterviewArtifact(interview.flow_id);

			const updated = db
				.prepare("SELECT * FROM interviews WHERE id = ?")
				.get(id);
			return reply.send(updated);
		},
	);
}
