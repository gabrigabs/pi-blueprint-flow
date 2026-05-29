import { Type } from "@sinclair/typebox";
import { nanoid } from "nanoid";
import { getDb } from "../db.js";
import { bus } from "../events.js";
import type { Interview } from "../db.js";

export const askInterviewTool = {
  name: "blueprint_ask_interview",
  label: "Blueprint: Ask Interview Question",
  description:
    "Ask an interview question to gather requirements for a feature. Questions should be adaptive — build on previous answers. Types: clarification, constraint, edge_case, priority, acceptance_criteria, technical.",
  parameters: Type.Object({
    feature_id: Type.String({ description: "Feature ID" }),
    question: Type.String({ description: "The question to ask the user" }),
    type: Type.String({
      description: "Question type: clarification, constraint, edge_case, priority, acceptance_criteria, technical",
    }),
    why: Type.Optional(
      Type.String({ description: "Why this question matters for the implementation" })
    ),
    required: Type.Optional(
      Type.Boolean({ description: "Whether an answer is required to proceed (default: false)" })
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
    },
    _signal: AbortSignal,
    _onUpdate: unknown,
    ctx: any
  ) => {
    const db = getDb();
    const id = nanoid(12);

    // Store the question
    db.prepare(
      "INSERT INTO interviews (id, feature_id, question, type, required, why) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, params.feature_id, params.question, params.type, params.required ? 1 : 0, params.why ?? null);

    bus.emit("interview:asked", { id, featureId: params.feature_id, question: params.question });

    // Format the question for the user
    const whyLine = params.why ? `\n_Why: ${params.why}_` : "";
    const typeBadge = `[${params.type}]`;

    // Use ctx.ui.input to get the answer interactively
    const answer = await ctx.ui.input(`${typeBadge} ${params.question}${whyLine}`);

    if (answer) {
      // Store the answer
      db.prepare("UPDATE interviews SET answer = ? WHERE id = ?").run(answer, id);
      bus.emit("interview:answered", { id, answer });

      return {
        content: [
          {
            type: "text" as const,
            text: `**Q:** ${params.question}\n**A:** ${answer}`,
          },
        ],
        details: { interviewId: id, question: params.question, answer, type: params.type },
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Question asked: "${params.question}" — awaiting answer.`,
        },
      ],
      details: { interviewId: id, question: params.question, answer: null, type: params.type },
    };
  },
};

export const getInterviewHistoryTool = {
  name: "blueprint_get_interview_history",
  label: "Blueprint: Get Interview History",
  description: "Get all interview questions and answers for a feature.",
  parameters: Type.Object({
    feature_id: Type.String({ description: "Feature ID" }),
    unanswered_only: Type.Optional(
      Type.Boolean({ description: "Only show unanswered questions" })
    ),
  }),
  execute: async (
    _toolCallId: string,
    params: { feature_id: string; unanswered_only?: boolean }
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
        content: [{ type: "text" as const, text: "No interview questions recorded yet." }],
        details: { interviews: [] },
      };
    }

    const lines = interviews.map((i) => {
      const status = i.answer ? "✓" : "○";
      const answerLine = i.answer ? `\n  A: ${i.answer}` : "\n  _(unanswered)_";
      return `${status} [${i.type}] ${i.question}${answerLine}`;
    });

    return {
      content: [{ type: "text" as const, text: `Interview (${interviews.length} questions):\n\n${lines.join("\n\n")}` }],
      details: { interviews },
    };
  },
};
