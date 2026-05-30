import type { FastifyInstance } from "fastify";
import { getAgentConfig, getPiRef, THINKING_LEVELS } from "../services/pi-config-reader.js";
import type { ThinkingLevel } from "@earendil-works/pi-coding-agent";

export function registerConfigRoutes(app: FastifyInstance): void {
  app.get("/api/config/agent", async () => {
    return getAgentConfig();
  });

  app.post<{ Body: { level: ThinkingLevel } }>(
    "/api/config/thinking-level",
    async (req, reply) => {
      const { level } = req.body;

      if (!level || !THINKING_LEVELS.includes(level)) {
        return reply.code(400).send({
          error: "validation",
          message: `Invalid thinking level. Must be one of: ${THINKING_LEVELS.join(", ")}`,
        });
      }

      const pi = getPiRef();
      if (!pi) {
        return reply.code(503).send({
          error: "unavailable",
          message: "Pi agent not connected",
        });
      }

      try {
        pi.setThinkingLevel(level);
        return { success: true, level };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to set thinking level";
        return reply.code(500).send({ error: "internal", message });
      }
    }
  );

  app.post<{ Body: { modelId: string; provider?: string } }>(
    "/api/config/model",
    async (req, reply) => {
      const { modelId, provider } = req.body;

      if (!modelId) {
        return reply.code(400).send({
          error: "validation",
          message: "modelId is required",
        });
      }

      const pi = getPiRef();
      if (!pi) {
        return reply.code(503).send({
          error: "unavailable",
          message: "Pi agent not connected",
        });
      }

      try {
        const models = pi.getAvailableModels();
        const model = models.find((m) =>
          m.id === modelId && (!provider || m.provider === provider)
        );

        if (!model) {
          return reply.code(404).send({
            error: "not_found",
            message: `Model "${modelId}" not found in available models`,
          });
        }

        const success = await pi.setModel(model);
        if (!success) {
          return reply.code(400).send({
            error: "no_api_key",
            message: `No API key configured for model "${modelId}"`,
          });
        }

        return { success: true, model: { id: model.id, name: model.name, provider: model.provider } };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to set model";
        return reply.code(500).send({ error: "internal", message });
      }
    }
  );
}
