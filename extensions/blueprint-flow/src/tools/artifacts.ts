import { Type } from "@sinclair/typebox";
import { nanoid } from "nanoid";
import type { FlowStep } from "../config.js";
import type { Artifact, Flow } from "../db.js";
import { getDb } from "../db.js";
import { bus } from "../events.js";

export const saveArtifactTool = {
	name: "blueprint_save_artifact",
	label: "Blueprint: Save Artifact",
	description:
		"Save a development artifact (spec, model, scenario, code, etc.) associated with a feature and step. Artifacts are the primary outputs of each flow step.",
	parameters: Type.Object({
		flow_id: Type.String({ description: "Flow ID this artifact belongs to" }),
		step_name: Type.String({
			description:
				"Flow step that produced this artifact (e.g. 'spec', 'ddd', 'behavior')",
		}),
		type: Type.String({
			description:
				"Artifact type: spec, domain_model, aggregate, event, scenario, implementation_plan, code, review, notes",
		}),
		filename: Type.String({
			description:
				"Logical filename for the artifact (e.g. 'user-auth.spec.md')",
		}),
		content: Type.String({ description: "Full content of the artifact" }),
	}),
	execute: async (
		_toolCallId: string,
		params: {
			flow_id: string;
			step_name: string;
			type: string;
			filename: string;
			content: string;
		},
	) => {
		const db = getDb();
		const id = nanoid(12);

		// Verify feature exists
		const feature = db
			.prepare("SELECT id FROM features WHERE id = ?")
			.get(params.flow_id);
		if (!feature) {
			return {
				content: [
					{
						type: "text" as const,
						text: `Flow "${params.flow_id}" not found.`,
					},
				],
				details: { error: "feature_not_found" },
			};
		}

		db.prepare(
			"INSERT INTO artifacts (id, flow_id, step_name, type, filename, content) VALUES (?, ?, ?, ?, ?, ?)",
		).run(
			id,
			params.flow_id,
			params.step_name,
			params.type,
			params.filename,
			params.content,
		);

		bus.emit("artifact:saved", {
			id,
			flowId: params.flow_id,
			type: params.type,
		});

		return {
			content: [
				{
					type: "text" as const,
					text: `Artifact saved: **${params.filename}** (${params.type}) for step "${params.step_name}" [id: ${id}]`,
				},
			],
			details: { artifactId: id, filename: params.filename, type: params.type },
		};
	},
};

export const readArtifactTool = {
	name: "blueprint_read_artifact",
	label: "Blueprint: Read Artifact",
	description:
		"Read the content of a specific artifact by ID or list artifacts for a feature.",
	parameters: Type.Object({
		flow_id: Type.String({ description: "Flow ID" }),
		artifact_id: Type.Optional(
			Type.String({ description: "Specific artifact ID to read" }),
		),
		step_name: Type.Optional(
			Type.String({ description: "Filter by step name" }),
		),
		type: Type.Optional(
			Type.String({ description: "Filter by artifact type" }),
		),
	}),
	execute: async (
		_toolCallId: string,
		params: {
			flow_id: string;
			artifact_id?: string;
			step_name?: string;
			type?: string;
		},
	) => {
		const db = getDb();

		// If specific artifact requested
		if (params.artifact_id) {
			const artifact = db
				.prepare("SELECT * FROM artifacts WHERE id = ? AND flow_id = ?")
				.get(params.artifact_id, params.flow_id) as Artifact | undefined;

			if (!artifact) {
				return {
					content: [
						{
							type: "text" as const,
							text: `Artifact "${params.artifact_id}" not found.`,
						},
					],
					details: { error: "artifact_not_found" },
				};
			}

			return {
				content: [
					{
						type: "text" as const,
						text: `## ${artifact.filename} (${artifact.type})\n**Step:** ${artifact.step_name} | **Created:** ${artifact.created_at}\n\n${artifact.content}`,
					},
				],
				details: { artifact },
			};
		}

		// List artifacts with optional filters
		let query =
			"SELECT id, step_name, type, filename, created_at FROM artifacts WHERE flow_id = ?";
		const queryParams: string[] = [params.flow_id];

		if (params.step_name) {
			query += " AND step_name = ?";
			queryParams.push(params.step_name);
		}
		if (params.type) {
			query += " AND type = ?";
			queryParams.push(params.type);
		}
		query += " ORDER BY created_at DESC";

		const artifacts = db.prepare(query).all(...queryParams) as Artifact[];

		if (artifacts.length === 0) {
			return {
				content: [
					{
						type: "text" as const,
						text: "No artifacts found matching the criteria.",
					},
				],
				details: { artifacts: [] },
			};
		}

		const lines = artifacts.map(
			(a) =>
				`- **${a.filename}** (${a.type}) — step: ${a.step_name} [id: ${a.id}]`,
		);

		return {
			content: [
				{
					type: "text" as const,
					text: `Artifacts (${artifacts.length}):\n${lines.join("\n")}`,
				},
			],
			details: { artifacts },
		};
	},
};
