import type { FastifyInstance } from "fastify";
import { getDb } from "../db.js";
import type { MemoryFact, WikiPage } from "../db.js";

export function registerWikiRoutes(app: FastifyInstance): void {
	// List wiki pages for a project
	app.get<{ Params: { projectId: string } }>(
		"/api/projects/:projectId/wiki",
		async (req) => {
			const db = getDb();
			return db
				.prepare(
					"SELECT id, project_id, slug, title, category, summary, updated_at FROM wiki_pages WHERE project_id = ? ORDER BY category, title",
				)
				.all(req.params.projectId) as Omit<WikiPage, "content_md">[];
		},
	);

	// Get a single wiki page by slug
	app.get<{ Params: { projectId: string; slug: string } }>(
		"/api/projects/:projectId/wiki/:slug",
		async (req, reply) => {
			const db = getDb();
			const page = db
				.prepare(
					"SELECT * FROM wiki_pages WHERE project_id = ? AND slug = ?",
				)
				.get(req.params.projectId, req.params.slug) as WikiPage | undefined;

			if (!page) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Wiki page not found" });
			}
			return page;
		},
	);

	// List facts for a project (optionally filtered by page or category)
	app.get<{
		Params: { projectId: string };
		Querystring: { pageId?: string; category?: string; limit?: string };
	}>("/api/projects/:projectId/facts", async (req) => {
		const db = getDb();
		const { pageId, category, limit } = req.query;
		const conditions = ["project_id = ?"];
		const params: (string | number)[] = [req.params.projectId];

		if (pageId) {
			conditions.push("page_id = ?");
			params.push(pageId);
		}
		if (category) {
			conditions.push("category = ?");
			params.push(category);
		}

		const maxResults = limit ? parseInt(limit, 10) : 50;
		params.push(maxResults);

		return db
			.prepare(
				`SELECT * FROM memory_facts WHERE ${conditions.join(" AND ")} ORDER BY confidence DESC, updated_at DESC LIMIT ?`,
			)
			.all(...params) as MemoryFact[];
	});
}
