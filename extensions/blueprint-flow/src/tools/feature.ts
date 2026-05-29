import { Type } from "@sinclair/typebox";
import { nanoid } from "nanoid";
import { getDb } from "../db.js";
import { bus } from "../events.js";
import { FLOW_STEPS } from "../config.js";
import type { Feature } from "../db.js";

export const createFeatureTool = {
  name: "blueprint_create_feature",
  label: "Blueprint: Create Feature",
  description:
    "Create a new feature within a project. This initializes the 10-step development flow for the feature.",
  parameters: Type.Object({
    project_id: Type.String({ description: "Project ID to add the feature to" }),
    title: Type.String({ description: "Feature title (concise, action-oriented)" }),
    description: Type.Optional(
      Type.String({ description: "Detailed description of what the feature should accomplish" })
    ),
  }),
  execute: async (
    _toolCallId: string,
    params: { project_id: string; title: string; description?: string }
  ) => {
    const db = getDb();
    const featureId = nanoid(12);

    // Verify project exists
    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(params.project_id);
    if (!project) {
      return {
        content: [{ type: "text" as const, text: `Project "${params.project_id}" not found.` }],
        details: { error: "project_not_found" },
      };
    }

    // Create feature
    db.prepare(
      "INSERT INTO features (id, project_id, title, description, current_step, status) VALUES (?, ?, ?, ?, 'intake', 'pending')"
    ).run(featureId, params.project_id, params.title, params.description ?? null);

    // Initialize all steps
    const insertStep = db.prepare(
      "INSERT INTO steps (id, feature_id, name, status) VALUES (?, ?, ?, ?)"
    );

    const initSteps = db.transaction(() => {
      for (const step of FLOW_STEPS) {
        insertStep.run(nanoid(12), featureId, step, step === "intake" ? "running" : "pending");
      }
    });
    initSteps();

    // Mark intake as started
    db.prepare(
      "UPDATE steps SET started_at = datetime('now') WHERE feature_id = ? AND name = 'intake'"
    ).run(featureId);

    // Update feature status
    db.prepare(
      "UPDATE features SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?"
    ).run(featureId);

    bus.emit("feature:created", { id: featureId, projectId: params.project_id, title: params.title });

    return {
      content: [
        {
          type: "text" as const,
          text: `Feature "${params.title}" created (id: ${featureId}).\nCurrent step: **intake** (running)\nFlow: ${FLOW_STEPS.join(" → ")}`,
        },
      ],
      details: { featureId, projectId: params.project_id, currentStep: "intake" },
    };
  },
};

export const listFeaturesTool = {
  name: "blueprint_list_features",
  label: "Blueprint: List Features",
  description: "List all features for a project with their current flow step and status.",
  parameters: Type.Object({
    project_id: Type.String({ description: "Project ID" }),
  }),
  execute: async (_toolCallId: string, params: { project_id: string }) => {
    const db = getDb();

    const features = db
      .prepare(
        "SELECT * FROM features WHERE project_id = ? ORDER BY updated_at DESC"
      )
      .all(params.project_id) as Feature[];

    if (features.length === 0) {
      return {
        content: [
          { type: "text" as const, text: "No features in this project yet. Use blueprint_create_feature to add one." },
        ],
        details: { features: [] },
      };
    }

    const lines = features.map(
      (f) => `- **${f.title}** [${f.status}] — step: ${f.current_step} [id: ${f.id}]`
    );

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
      details: { features },
    };
  },
};
