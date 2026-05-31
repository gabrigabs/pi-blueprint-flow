import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { getDb } from "../db.js";
import { bus } from "../events.js";
import { validateRepoPath } from "../services/path-validator.js";
import type { CreateProjectInput, UpdateProjectInput } from "../types.js";

export function registerProjectRoutes(app: FastifyInstance): void {
	app.post<{ Body: CreateProjectInput }>(
		"/api/projects",
		async (req, reply) => {
			const { name, description, repoPath, stack } = req.body;

			if (!name || typeof name !== "string" || !name.trim()) {
				return reply
					.code(400)
					.send({ error: "validation", message: "Name is required" });
			}

			if (repoPath) {
				const validation = validateRepoPath(repoPath);
				if (!validation.valid) {
					return reply
						.code(400)
						.send({ error: "validation", message: validation.error });
				}
			}

			const db = getDb();
			const id = nanoid(12);
			const stackJson = JSON.stringify(stack ?? []);

			db.prepare(
				"INSERT INTO projects (id, name, description, repo_path, stack) VALUES (?, ?, ?, ?, ?)",
			).run(
				id,
				name.trim(),
				description?.trim() ?? null,
				repoPath ?? null,
				stackJson,
			);

			bus.emit("project:created", { id, name: name.trim() });

			const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
			return reply.code(201).send(project);
		},
	);

	app.patch<{ Params: { id: string }; Body: UpdateProjectInput }>(
		"/api/projects/:id",
		async (req, reply) => {
			const { id } = req.params;
			const { name, description, repoPath, stack, archived } = req.body;

			const db = getDb();
			const existing = db
				.prepare("SELECT * FROM projects WHERE id = ?")
				.get(id);
			if (!existing) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Project not found" });
			}

			if (repoPath) {
				const validation = validateRepoPath(repoPath);
				if (!validation.valid) {
					return reply
						.code(400)
						.send({ error: "validation", message: validation.error });
				}
			}

			const updates: string[] = [];
			const values: unknown[] = [];

			if (name !== undefined) {
				updates.push("name = ?");
				values.push(name.trim());
			}
			if (description !== undefined) {
				updates.push("description = ?");
				values.push(description?.trim() ?? null);
			}
			if (repoPath !== undefined) {
				updates.push("repo_path = ?");
				values.push(repoPath);
			}
			if (stack !== undefined) {
				updates.push("stack = ?");
				values.push(JSON.stringify(stack));
			}
			if (archived !== undefined) {
				updates.push("archived = ?");
				values.push(archived ? 1 : 0);
			}

			if (updates.length === 0) {
				return reply
					.code(400)
					.send({ error: "validation", message: "No fields to update" });
			}

			updates.push("updated_at = datetime('now')");
			values.push(id);

			db.prepare(`UPDATE projects SET ${updates.join(", ")} WHERE id = ?`).run(
				...values,
			);

			if (archived) {
				bus.emit("project:archived", { id });
			} else {
				bus.emit("project:updated", { id });
			}

			const updated = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
			return reply.send(updated);
		},
	);

	app.delete<{ Params: { id: string } }>(
		"/api/projects/:id",
		async (req, reply) => {
			const { id } = req.params;
			const db = getDb();

			const existing = db
				.prepare("SELECT * FROM projects WHERE id = ?")
				.get(id);
			if (!existing) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Project not found" });
			}

			const featureIds = db
				.prepare("SELECT id FROM features WHERE project_id = ?")
				.all(id) as { id: string }[];

			const cascade = db.transaction(() => {
				for (const feature of featureIds) {
					db.prepare(
						"DELETE FROM action_run_events WHERE action_run_id IN (SELECT id FROM action_runs WHERE feature_id = ?)",
					).run(feature.id);
					db.prepare("DELETE FROM action_runs WHERE feature_id = ?").run(
						feature.id,
					);
					db.prepare("DELETE FROM artifacts WHERE feature_id = ?").run(
						feature.id,
					);
					db.prepare("DELETE FROM interviews WHERE feature_id = ?").run(
						feature.id,
					);
					db.prepare("DELETE FROM steps WHERE feature_id = ?").run(feature.id);
				}

				db.prepare("DELETE FROM features WHERE project_id = ?").run(id);
				db.prepare("DELETE FROM workflows WHERE project_id = ?").run(id);
				db.prepare("DELETE FROM memories WHERE project_id = ?").run(id);
				db.prepare("DELETE FROM projects WHERE id = ?").run(id);
			});
			cascade();

			bus.emit("project:archived", { id });
			return reply.code(204).send();
		},
	);
}
