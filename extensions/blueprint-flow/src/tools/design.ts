import { Type } from "@sinclair/typebox";
import { nanoid } from "nanoid";
import { getDb } from "../db.js";
import { bus } from "../events.js";

export const designMockupTool = {
	name: "blueprint_design_mockup",
	label: "Blueprint: Save Design Mockup",
	description:
		"Generate and save an HTML/CSS mockup variant for A/B testing in the Blueprint UI.",
	parameters: Type.Object({
		feature_id: Type.String({ description: "Feature ID" }),
		variant_label: Type.String({ description: "Label for this variant (e.g. 'A - Conservative', 'B - Bold')" }),
		html_content: Type.String({ description: "Full HTML content for the mockup" }),
		css_content: Type.String({ description: "CSS styles for the mockup" }),
		js_content: Type.Optional(Type.String({ description: "Optional JavaScript for interactivity" })),
		design_tokens: Type.Optional(
			Type.Object({}, { additionalProperties: true, description: "Design tokens used in this variant" }),
		),
	}),
	execute: async (
		_toolCallId: string,
		params: {
			feature_id: string;
			variant_label: string;
			html_content: string;
			css_content: string;
			js_content?: string;
			design_tokens?: Record<string, unknown>;
		},
	) => {
		const db = getDb();
		const variantId = nanoid(12);

		db.prepare(
			`INSERT INTO design_variants (id, feature_id, label, html_content, css_content, js_content, tokens_json)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		).run(
			variantId,
			params.feature_id,
			params.variant_label,
			params.html_content,
			params.css_content,
			params.js_content ?? null,
			params.design_tokens ? JSON.stringify(params.design_tokens) : null,
		);

		const slug = params.variant_label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
		db.prepare(
			`INSERT INTO artifacts (id, feature_id, step_name, type, filename, content)
			 VALUES (?, ?, 'design', 'mockup', ?, ?)`,
		).run(nanoid(12), params.feature_id, `design-${slug}.html`, params.html_content);

		bus.emit("artifact:saved", {
			featureId: params.feature_id,
			stepName: "design",
			type: "mockup",
			filename: `design-${slug}.html`,
		});

		return {
			content: [
				{ type: "text" as const, text: `Design variant "${params.variant_label}" saved (id: ${variantId}).` },
			],
			details: { variantId, label: params.variant_label },
		};
	},
};

export const designSaveTokensTool = {
	name: "blueprint_design_save_tokens",
	label: "Blueprint: Save Design Tokens",
	description: "Save extracted design tokens (colors, spacing, typography) for a project or feature.",
	parameters: Type.Object({
		project_id: Type.Optional(Type.String({ description: "Project ID" })),
		feature_id: Type.Optional(Type.String({ description: "Feature ID" })),
		tokens: Type.Object({}, { additionalProperties: true, description: "Design tokens object" }),
	}),
	execute: async (
		_toolCallId: string,
		params: {
			project_id?: string;
			feature_id?: string;
			tokens: Record<string, unknown>;
		},
	) => {
		const db = getDb();
		const id = nanoid(12);

		db.prepare(
			`INSERT INTO design_tokens (id, project_id, feature_id, tokens_json, source_step)
			 VALUES (?, ?, ?, ?, 'design')`,
		).run(id, params.project_id ?? null, params.feature_id ?? null, JSON.stringify(params.tokens));

		return {
			content: [{ type: "text" as const, text: "Design tokens saved." }],
			details: { tokenId: id },
		};
	},
};
