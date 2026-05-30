import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { getDb } from "../db.js";
import { bus } from "../events.js";
import type { Artifact } from "../db.js";
import type { CreateArtifactInput, UpdateArtifactInput } from "../types.js";

export function registerArtifactRoutes(app: FastifyInstance): void {
  app.post<{ Body: CreateArtifactInput }>("/api/artifacts", async (req, reply) => {
    const { featureId, stepName, type, filename, content } = req.body;

    if (!featureId || !stepName || !type || !filename || !content) {
      return reply.code(400).send({
        error: "validation",
        message: "featureId, stepName, type, filename, and content are required",
      });
    }

    const db = getDb();

    const feature = db.prepare("SELECT id FROM features WHERE id = ?").get(featureId);
    if (!feature) {
      return reply.code(404).send({ error: "not_found", message: "Feature not found" });
    }

    const id = nanoid(12);
    db.prepare(
      "INSERT INTO artifacts (id, feature_id, step_name, type, filename, content) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, featureId, stepName, type, filename, content);

    bus.emit("artifact:saved", { id, featureId, type });

    const artifact = db.prepare("SELECT * FROM artifacts WHERE id = ?").get(id);
    return reply.code(201).send(artifact);
  });

  app.patch<{ Params: { id: string }; Body: UpdateArtifactInput }>(
    "/api/artifacts/:id",
    async (req, reply) => {
      const { id } = req.params;
      const { content, filename } = req.body;

      const db = getDb();
      const existing = db.prepare("SELECT * FROM artifacts WHERE id = ?").get(id) as Artifact | undefined;
      if (!existing) {
        return reply.code(404).send({ error: "not_found", message: "Artifact not found" });
      }

      const updates: string[] = [];
      const values: unknown[] = [];

      if (content !== undefined) {
        updates.push("content = ?");
        values.push(content);
      }
      if (filename !== undefined) {
        updates.push("filename = ?");
        values.push(filename);
      }

      if (updates.length === 0) {
        return reply.code(400).send({ error: "validation", message: "No fields to update" });
      }

      values.push(id);
      db.prepare(`UPDATE artifacts SET ${updates.join(", ")} WHERE id = ?`).run(...values);

      bus.emit("artifact:updated", { id, featureId: existing.feature_id });

      const updated = db.prepare("SELECT * FROM artifacts WHERE id = ?").get(id);
      return reply.send(updated);
    }
  );
}
