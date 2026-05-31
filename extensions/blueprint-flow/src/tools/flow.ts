import { Type } from "@sinclair/typebox";
import type { FlowStep, StepStatus } from "../config.js";
import { FLOW_STEPS, STEP_LABELS } from "../config.js";
import type { Feature, Step } from "../db.js";
import { getDb } from "../db.js";
import { bus } from "../events.js";

export const getFlowStateTool = {
	name: "blueprint_get_flow_state",
	label: "Blueprint: Get Flow State",
	description:
		"Get the current flow state for a feature, showing all steps and their statuses.",
	parameters: Type.Object({
		feature_id: Type.String({ description: "Feature ID" }),
	}),
	execute: async (_toolCallId: string, params: { feature_id: string }) => {
		const db = getDb();

		const feature = db
			.prepare("SELECT * FROM features WHERE id = ?")
			.get(params.feature_id) as Feature | undefined;

		if (!feature) {
			return {
				content: [
					{
						type: "text" as const,
						text: `Feature "${params.feature_id}" not found.`,
					},
				],
				details: { error: "feature_not_found" },
			};
		}

		const steps = db
			.prepare("SELECT * FROM steps WHERE feature_id = ? ORDER BY rowid")
			.all(params.feature_id) as Step[];

		const statusIcon: Record<StepStatus, string> = {
			pending: "○",
			current: "▶",
			running: "●",
			needs_user: "?",
			blocked: "✗",
			done: "✓",
			rejected: "✗",
		};

		const lines = steps.map((s) => {
			const icon = statusIcon[s.status as StepStatus] || "○";
			const label = STEP_LABELS[s.name as FlowStep] || s.name;
			const current = s.name === feature.current_step ? " ← current" : "";
			return `  ${icon} ${label} (${s.status})${current}`;
		});

		const header = `Feature: **${feature.title}** [${feature.status}]`;
		const flow = lines.join("\n");

		return {
			content: [{ type: "text" as const, text: `${header}\n\n${flow}` }],
			details: { feature, steps },
		};
	},
};

export const advanceStepTool = {
	name: "blueprint_advance_step",
	label: "Blueprint: Advance Step",
	description:
		"Mark the current step as done and advance to the next step in the flow. Only call this when the current step's work is complete.",
	parameters: Type.Object({
		feature_id: Type.String({ description: "Feature ID" }),
		summary: Type.Optional(
			Type.String({
				description: "Brief summary of what was accomplished in this step",
			}),
		),
	}),
	execute: async (
		_toolCallId: string,
		params: { feature_id: string; summary?: string },
	) => {
		const db = getDb();

		const feature = db
			.prepare("SELECT * FROM features WHERE id = ?")
			.get(params.feature_id) as Feature | undefined;

		if (!feature) {
			return {
				content: [
					{
						type: "text" as const,
						text: `Feature "${params.feature_id}" not found.`,
					},
				],
				details: { error: "feature_not_found" },
			};
		}

		const currentIdx = FLOW_STEPS.indexOf(feature.current_step as FlowStep);
		if (currentIdx === -1) {
			return {
				content: [
					{
						type: "text" as const,
						text: `Invalid current step: ${feature.current_step}`,
					},
				],
				details: { error: "invalid_step" },
			};
		}

		// Mark current step as done
		db.prepare(
			"UPDATE steps SET status = 'done', completed_at = datetime('now') WHERE feature_id = ? AND name = ?",
		).run(params.feature_id, feature.current_step);

		// Check if this was the last step
		if (currentIdx === FLOW_STEPS.length - 1) {
			db.prepare(
				"UPDATE features SET status = 'done', updated_at = datetime('now') WHERE id = ?",
			).run(params.feature_id);

			bus.emit("feature:updated", {
				id: params.feature_id,
				step: feature.current_step,
				status: "done",
			});

			return {
				content: [
					{
						type: "text" as const,
						text: `Feature "${feature.title}" is complete! All steps finished.`,
					},
				],
				details: { featureId: params.feature_id, status: "done" },
			};
		}

		// Advance to next step
		const nextStep = FLOW_STEPS[currentIdx + 1];

		db.prepare(
			"UPDATE features SET current_step = ?, updated_at = datetime('now') WHERE id = ?",
		).run(nextStep, params.feature_id);

		db.prepare(
			"UPDATE steps SET status = 'running', started_at = datetime('now') WHERE feature_id = ? AND name = ?",
		).run(params.feature_id, nextStep);

		bus.emit("step:advanced", {
			featureId: params.feature_id,
			from: feature.current_step,
			to: nextStep,
		});

		const nextLabel = STEP_LABELS[nextStep];
		return {
			content: [
				{
					type: "text" as const,
					text: `Step "${STEP_LABELS[feature.current_step as FlowStep]}" completed. Now on: **${nextLabel}** (${nextStep})`,
				},
			],
			details: {
				featureId: params.feature_id,
				previousStep: feature.current_step,
				currentStep: nextStep,
			},
		};
	},
};

export const resetStepTool = {
	name: "blueprint_reset_step",
	label: "Blueprint: Reset to Step",
	description:
		"Reset a feature back to a specific step. All subsequent steps will be marked as pending.",
	parameters: Type.Object({
		feature_id: Type.String({ description: "Feature ID" }),
		target_step: Type.String({
			description: "Step name to reset to (e.g. 'research', 'spec')",
		}),
	}),
	execute: async (
		_toolCallId: string,
		params: { feature_id: string; target_step: string },
	) => {
		const db = getDb();

		const feature = db
			.prepare("SELECT * FROM features WHERE id = ?")
			.get(params.feature_id) as Feature | undefined;

		if (!feature) {
			return {
				content: [
					{
						type: "text" as const,
						text: `Feature "${params.feature_id}" not found.`,
					},
				],
				details: { error: "feature_not_found" },
			};
		}

		const targetIdx = FLOW_STEPS.indexOf(params.target_step as FlowStep);
		if (targetIdx === -1) {
			return {
				content: [
					{
						type: "text" as const,
						text: `Invalid step: "${params.target_step}". Valid steps: ${FLOW_STEPS.join(", ")}`,
					},
				],
				details: { error: "invalid_step" },
			};
		}

		// Reset all steps from target onwards
		const resetSteps = db.transaction(() => {
			for (let i = targetIdx; i < FLOW_STEPS.length; i++) {
				const status = i === targetIdx ? "running" : "pending";
				const startedAt = i === targetIdx ? "datetime('now')" : null;
				db.prepare(
					`UPDATE steps SET status = ?, started_at = ${i === targetIdx ? "datetime('now')" : "NULL"}, completed_at = NULL WHERE feature_id = ? AND name = ?`,
				).run(status, params.feature_id, FLOW_STEPS[i]);
			}
		});
		resetSteps();

		db.prepare(
			"UPDATE features SET current_step = ?, status = 'in_progress', updated_at = datetime('now') WHERE id = ?",
		).run(params.target_step, params.feature_id);

		const label = STEP_LABELS[params.target_step as FlowStep];
		return {
			content: [
				{
					type: "text" as const,
					text: `Feature reset to step: **${label}** (${params.target_step}). All subsequent steps cleared.`,
				},
			],
			details: { featureId: params.feature_id, resetTo: params.target_step },
		};
	},
};
