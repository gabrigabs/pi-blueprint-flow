import { Type } from "@sinclair/typebox";
import { nanoid } from "nanoid";
import type { Memory } from "../db.js";
import { getDb } from "../db.js";
import { bus } from "../events.js";

export const saveMemoryTool = {
	name: "blueprint_save_memory",
	label: "Blueprint: Save Memory",
	description:
		"Save a piece of knowledge to project memory. Use this to persist decisions, patterns, constraints, and learnings that should inform future development. Categories: decision, pattern, constraint, learning, convention, architecture, domain.",
	parameters: Type.Object({
		project_id: Type.String({ description: "Project ID" }),
		category: Type.String({
			description:
				"Memory category: decision, pattern, constraint, learning, convention, architecture, domain",
		}),
		content: Type.String({
			description: "The knowledge to remember (be specific and actionable)",
		}),
		source_feature_id: Type.Optional(
			Type.String({ description: "Feature ID that produced this knowledge" }),
		),
	}),
	execute: async (
		_toolCallId: string,
		params: {
			project_id: string;
			category: string;
			content: string;
			source_feature_id?: string;
		},
	) => {
		const db = getDb();
		const id = nanoid(12);

		// Verify project exists
		const project = db
			.prepare("SELECT id FROM workspaces WHERE id = ?")
			.get(params.project_id);
		if (!project) {
			return {
				content: [
					{
						type: "text" as const,
						text: `Project "${params.project_id}" not found.`,
					},
				],
				details: { error: "project_not_found" },
			};
		}

		db.prepare(
			"INSERT INTO memories (id, workspace_id, category, content, source_flow_id) VALUES (?, ?, ?, ?, ?)",
		).run(
			id,
			params.project_id,
			params.category,
			params.content,
			params.source_feature_id ?? null,
		);

		// Update FTS index — use the actual rowid of the inserted memory row
		const row = db.prepare("SELECT rowid FROM memories WHERE id = ?").get(id) as
			| { rowid: number }
			| undefined;
		if (row) {
			db.prepare(
				"INSERT INTO memories_fts (rowid, content, category) VALUES (?, ?, ?)",
			).run(row.rowid, params.content, params.category);
		}

		bus.emit("memory:saved", {
			id,
			workspaceId: params.project_id,
			category: params.category,
		});

		return {
			content: [
				{
					type: "text" as const,
					text: `Memory saved [${params.category}]: "${params.content.slice(0, 80)}${params.content.length > 80 ? "..." : ""}" [id: ${id}]`,
				},
			],
			details: { memoryId: id, category: params.category },
		};
	},
};

export const searchMemoryTool = {
	name: "blueprint_search_memory",
	label: "Blueprint: Search Memory",
	description:
		"Search project memory for relevant knowledge. Uses full-text search across all stored memories.",
	parameters: Type.Object({
		project_id: Type.String({ description: "Project ID" }),
		query: Type.String({ description: "Search query (keywords or phrases)" }),
		category: Type.Optional(Type.String({ description: "Filter by category" })),
		limit: Type.Optional(
			Type.Number({ description: "Max results (default: 10)" }),
		),
	}),
	execute: async (
		_toolCallId: string,
		params: {
			project_id: string;
			query: string;
			category?: string;
			limit?: number;
		},
	) => {
		const db = getDb();
		const limit = params.limit ?? 10;

		let memories: Memory[];

		if (params.query.trim()) {
			// Use FTS search
			const ftsQuery = params.query
				.split(/\s+/)
				.map((w) => `"${w}"`)
				.join(" OR ");

			let sql = `
        SELECT m.* FROM memories m
        JOIN memories_fts fts ON fts.rowid = m.rowid
        WHERE fts.content MATCH ? AND m.workspace_id = ?
      `;
			const queryParams: (string | number)[] = [ftsQuery, params.project_id];

			if (params.category) {
				sql += " AND m.category = ?";
				queryParams.push(params.category);
			}
			sql += " ORDER BY rank LIMIT ?";
			queryParams.push(limit);

			memories = db.prepare(sql).all(...queryParams) as Memory[];
		} else {
			// No query — list recent
			let sql = "SELECT * FROM memories WHERE workspace_id = ?";
			const queryParams: (string | number)[] = [params.project_id];

			if (params.category) {
				sql += " AND category = ?";
				queryParams.push(params.category);
			}
			sql += " ORDER BY created_at DESC LIMIT ?";
			queryParams.push(limit);

			memories = db.prepare(sql).all(...queryParams) as Memory[];
		}

		if (memories.length === 0) {
			return {
				content: [
					{
						type: "text" as const,
						text: "No memories found matching the query.",
					},
				],
				details: { memories: [] },
			};
		}

		const lines = memories.map(
			(m) => `- [${m.category}] ${m.content} _(${m.created_at})_`,
		);

		return {
			content: [
				{
					type: "text" as const,
					text: `Found ${memories.length} memories:\n\n${lines.join("\n")}`,
				},
			],
			details: { memories },
		};
	},
};
