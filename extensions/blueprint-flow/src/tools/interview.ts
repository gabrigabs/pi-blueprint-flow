import { Type } from "@sinclair/typebox";
import { nanoid } from "nanoid";
import type { Interview } from "../db.js";
import { getDb } from "../db.js";
import { bus } from "../events.js";

export const askInterviewTool = {
	name: "blueprint_ask_interview",
	label: "Blueprint: Ask Interview Question",
	description:
		"Ask an interview question to gather requirements for a feature. Non-blocking — the answer arrives via the web UI. Supports free_text, single_choice, and multi_choice response types.",
	parameters: Type.Object({
		feature_id: Type.String({ description: "Feature ID" }),
		question: Type.String({ description: "The question to ask the user" }),
		type: Type.String({
			description:
				"Question type: clarification, constraint, edge_case, priority, acceptance_criteria, technical",
		}),
		why: Type.Optional(
			Type.String({
				description: "Why this question matters for the implementation",
			}),
		),
		required: Type.Optional(
			Type.Boolean({
				description:
					"Whether an answer is required to proceed (default: false)",
			}),
		),
		response_type: Type.Optional(
			Type.String({
				description:
					"free_text | single_choice | multi_choice (default: free_text)",
			}),
		),
		options: Type.Optional(
			Type.Array(Type.String(), {
				description: "Predefined options for single_choice or multi_choice",
			}),
		),
	}),
	execute: async (
		_toolCallId: string,
		params: {
			feature_id: string;
			question: string;
			type: string;
			why?: string;
			required?: boolean;
			response_type?: string;
			options?: string[];
		},
	) => {
		const db = getDb();
		const id = nanoid(12);
		const responseType = params.response_type || "free_text";
		const optionsJson = params.options ? JSON.stringify(params.options) : null;

		db.prepare(
			"INSERT INTO interviews (id, feature_id, question, type, required, why, response_type, options) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		).run(
			id,
			params.feature_id,
			params.question,
			params.type,
			params.required ? 1 : 0,
			params.why ?? null,
			responseType,
			optionsJson,
		);

		bus.emit("interview:asked", {
			id,
			flowId: params.feature_id,
			question: params.question,
			responseType,
			options: params.options,
		});

		return {
			content: [
				{
					type: "text" as const,
					text: `Question asked: "${params.question}" (${responseType}) — awaiting answer via Blueprint UI.`,
				},
			],
			details: {
				interviewId: id,
				question: params.question,
				responseType,
				options: params.options,
				type: params.type,
			},
		};
	},
};

export const waitForInterviewTool = {
	name: "blueprint_wait_for_interview",
	label: "Blueprint: Wait for Interview Answers",
	description:
		"Wait until all required interview questions for a feature are answered via the Blueprint UI. Call this after asking all questions with blueprint_ask_interview.",
	parameters: Type.Object({
		feature_id: Type.String({ description: "Feature ID" }),
		timeout_ms: Type.Optional(
			Type.Number({
				description: "Max wait time in ms (default: 120000)",
				default: 120000,
			}),
		),
	}),
	execute: async (
		_toolCallId: string,
		params: { feature_id: string; timeout_ms?: number },
		signal: AbortSignal,
	) => {
		const db = getDb();
		const timeout = params.timeout_ms ?? 120000;

		// Check if already complete
		const check = () =>
			(
				db
					.prepare(
						"SELECT COUNT(*) as count FROM interviews WHERE feature_id = ? AND required = 1 AND answer IS NULL",
					)
					.get(params.feature_id) as { count: number }
			).count === 0;

		if (check()) {
			return buildWaitResult(params.feature_id, false);
		}

		// Wait for answers via event bus instead of polling
		const answered = await new Promise<boolean>((resolve) => {
			let unsubscribe = () => {};
			const timer = setTimeout(() => {
				unsubscribe();
				resolve(false);
			}, timeout);

			function handler() {
				if (check()) {
					clearTimeout(timer);
					unsubscribe();
					resolve(true);
				}
			}

			unsubscribe = bus.on("interview:answered", handler);

			if (signal) {
				signal.addEventListener(
					"abort",
					() => {
						clearTimeout(timer);
						unsubscribe();
						resolve(false);
					},
					{ once: true },
				);
			}
		});

		return buildWaitResult(params.feature_id, !answered);
	},
};

function buildWaitResult(flowId: string, timedOut: boolean) {
	const db = getDb();
	const all = db
		.prepare(
			"SELECT * FROM interviews WHERE feature_id = ? ORDER BY created_at ASC",
		)
		.all(flowId) as Interview[];

	if (timedOut) {
		const unanswered = all.filter((i) => !i.answer && i.required);
		return {
			content: [
				{
					type: "text" as const,
					text: `Timed out. ${unanswered.length} required question(s) still unanswered.\n\n${formatInterviewSummary(all)}`,
				},
			],
			details: { interviews: all, timedOut: true },
		};
	}

	return {
		content: [{ type: "text" as const, text: formatInterviewSummary(all) }],
		details: { interviews: all, timedOut: false },
	};
}

function formatInterviewSummary(interviews: Interview[]): string {
	if (interviews.length === 0) return "No interview questions.";

	const lines = interviews.map((i) => {
		const status = i.answer ? "✓" : "○";
		const answer = i.answer ? `\n  A: ${i.answer}` : "\n  _(unanswered)_";
		return `${status} [${i.type}] ${i.question}${answer}`;
	});

	const answered = interviews.filter((i) => i.answer).length;
	return `Interview Summary (${answered}/${interviews.length} answered):\n\n${lines.join("\n\n")}`;
}

export const getInterviewHistoryTool = {
	name: "blueprint_get_interview_history",
	label: "Blueprint: Get Interview History",
	description: "Get all interview questions and answers for a feature.",
	parameters: Type.Object({
		feature_id: Type.String({ description: "Feature ID" }),
		unanswered_only: Type.Optional(
			Type.Boolean({ description: "Only show unanswered questions" }),
		),
	}),
	execute: async (
		_toolCallId: string,
		params: { feature_id: string; unanswered_only?: boolean },
	) => {
		const db = getDb();

		let query = "SELECT * FROM interviews WHERE feature_id = ?";
		if (params.unanswered_only) {
			query += " AND answer IS NULL";
		}
		query += " ORDER BY created_at ASC";

		const interviews = db.prepare(query).all(params.feature_id) as Interview[];

		if (interviews.length === 0) {
			return {
				content: [
					{
						type: "text" as const,
						text: "No interview questions recorded yet.",
					},
				],
				details: { interviews: [] },
			};
		}

		return {
			content: [
				{ type: "text" as const, text: formatInterviewSummary(interviews) },
			],
			details: { interviews },
		};
	},
};
