import { Type } from "@sinclair/typebox";
import { nanoid } from "nanoid";
import type { Workspace } from "../db.js";
import { getDb } from "../db.js";
import { bus } from "../events.js";

export const createProjectTool = {
	name: "blueprint_create_project",
	label: "Blueprint: Create Project",
	description:
		"Create a new Blueprint project to track features and development flow. Use this when starting work on a new codebase or product area.",
	parameters: Type.Object({
		name: Type.String({ description: "Project name (short, descriptive)" }),
		description: Type.Optional(
			Type.String({ description: "Brief description of the project scope" }),
		),
	}),
	execute: async (
		_toolCallId: string,
		params: { name: string; description?: string },
	) => {
		const db = getDb();
		const id = nanoid(12);

		db.prepare(
			"INSERT INTO workspaces (id, name, description) VALUES (?, ?, ?)",
		).run(id, params.name, params.description ?? null);

		bus.emit("workspace:created", { id, name: params.name });

		return {
			content: [
				{
					type: "text" as const,
					text: `Project "${params.name}" created (id: ${id}). Use blueprint_create_feature to add features.`,
				},
			],
			details: { workspaceId: id, name: params.name },
		};
	},
};

export const listProjectsTool = {
	name: "blueprint_list_projects",
	label: "Blueprint: List Projects",
	description: "List all Blueprint projects with their feature counts.",
	parameters: Type.Object({}),
	execute: async () => {
		const db = getDb();

		const projects = db
			.prepare(
				`SELECT p.*, COUNT(f.id) as feature_count
         FROM workspaces p
         LEFT JOIN flows f ON f.workspace_id = p.id
         GROUP BY p.id
         ORDER BY p.updated_at DESC`,
			)
			.all() as (Workspace & { feature_count: number })[];

		if (projects.length === 0) {
			return {
				content: [
					{
						type: "text" as const,
						text: "No projects yet. Use blueprint_create_project to create one.",
					},
				],
				details: { projects: [] },
			};
		}

		const lines = projects.map(
			(p) =>
				`- **${p.name}** (${p.feature_count} features) — ${p.description || "no description"} [id: ${p.id}]`,
		);

		return {
			content: [{ type: "text" as const, text: lines.join("\n") }],
			details: { projects },
		};
	},
};
