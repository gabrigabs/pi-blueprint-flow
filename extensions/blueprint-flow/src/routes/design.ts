import type { FastifyInstance } from "fastify";
import { getDb } from "../db.js";
import { bus } from "../events.js";

export function registerDesignRoutes(app: FastifyInstance): void {
	app.get<{ Params: { featureId: string } }>(
		"/api/features/:featureId/design/variants",
		async (req) => {
			const db = getDb();
			const variants = db
				.prepare(
					"SELECT * FROM design_variants WHERE feature_id = ? ORDER BY created_at ASC",
				)
				.all(req.params.featureId) as any[];

			return variants.map((v) => ({
				...v,
				tokens_json: v.tokens_json ? JSON.parse(v.tokens_json) : null,
			}));
		},
	);

	app.patch<{ Params: { id: string }; Body: { selected?: boolean; feedback?: string } }>(
		"/api/design/variants/:id",
		async (req, reply) => {
			const { id } = req.params;
			const { selected, feedback } = req.body;
			const db = getDb();

			const variant = db
				.prepare("SELECT * FROM design_variants WHERE id = ?")
				.get(id) as any;

			if (!variant) {
				return reply.code(404).send({ error: "not_found", message: "Variant not found" });
			}

			if (selected) {
				db.prepare("UPDATE design_variants SET selected = 0 WHERE feature_id = ?").run(
					variant.feature_id,
				);
				db.prepare("UPDATE design_variants SET selected = 1 WHERE id = ?").run(id);
			}

			if (feedback !== undefined) {
				db.prepare("UPDATE design_variants SET feedback = ? WHERE id = ?").run(feedback, id);
			}

			bus.emit("artifact:updated", {
				id,
				featureId: variant.feature_id,
				type: "design_variant",
			});

			const updated = db.prepare("SELECT * FROM design_variants WHERE id = ?").get(id);
			return reply.send(updated);
		},
	);

	app.get<{ Params: { projectId: string } }>(
		"/api/projects/:projectId/design/tokens",
		async (req) => {
			const db = getDb();
			const row = db
				.prepare(
					"SELECT * FROM design_tokens WHERE project_id = ? ORDER BY created_at DESC LIMIT 1",
				)
				.get(req.params.projectId) as any;

			if (!row) return null;
			return { ...row, tokens_json: JSON.parse(row.tokens_json) };
		},
	);

	app.get<{ Params: { featureId: string } }>(
		"/api/features/:featureId/design/tokens",
		async (req) => {
			const db = getDb();
			const row = db
				.prepare(
					"SELECT * FROM design_tokens WHERE feature_id = ? ORDER BY created_at DESC LIMIT 1",
				)
				.get(req.params.featureId) as any;

			if (!row) return null;
			return { ...row, tokens_json: JSON.parse(row.tokens_json) };
		},
	);
}
