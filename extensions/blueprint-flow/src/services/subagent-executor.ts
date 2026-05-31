import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { nanoid } from "nanoid";
import type { ActionRunRow } from "../db.js";
import { getDb } from "../db.js";
import { bus } from "../events.js";
import {
	notifyAgentEnd,
	notifyAgentError,
	notifyStatusChange,
} from "../pi-bridge.js";
import {
	buildSubagentPrompt,
	type SubagentConfig,
	spawnSubagent,
} from "./subagent-manager.js";

const SUBAGENT_TIMEOUT_MS = 5 * 60 * 1000;

const EXTENSION_ROOT = join(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	"..",
);

const STEP_TO_PROFILE: Record<string, string> = {
	research: join(EXTENSION_ROOT, "skills", "agents", "research.md"),
	spec: join(EXTENSION_ROOT, "skills", "agents", "spec.md"),
	ddd: join(EXTENSION_ROOT, "skills", "agents", "ddd.md"),
	design: join(EXTENSION_ROOT, "skills", "agents", "design.md"),
	implementation: join(EXTENSION_ROOT, "skills", "agents", "implementation.md"),
	review: join(EXTENSION_ROOT, "skills", "agents", "review.md"),
	memory_update: join(EXTENSION_ROOT, "skills", "agents", "memory.md"),
};

export async function executeViaSubagent(
	actionRun: ActionRunRow,
): Promise<void> {
	const db = getDb();
	const profile =
		STEP_TO_PROFILE[actionRun.step_name ?? ""] ??
		STEP_TO_PROFILE[actionRun.action_type];

	if (!profile) {
		notifyAgentError(
			actionRun.id,
			`No agent profile for step "${actionRun.step_name}"`,
		);
		return;
	}

	notifyStatusChange(actionRun.id, "agent_running");

	const context = gatherSubagentContext(actionRun);
	const prompt = buildSubagentPrompt(context);

	const config: SubagentConfig = {
		id: actionRun.id,
		flowId: actionRun.flow_id ?? "",
		workspaceId: actionRun.workspace_id ?? "",
		stepName: actionRun.step_name ?? "",
		actionType: actionRun.action_type,
		profile,
		modelId: actionRun.model_id ?? undefined,
		thinkingLevel: actionRun.effort_level === "thorough" ? "high" : "medium",
		prompt,
		timeout: SUBAGENT_TIMEOUT_MS,
	};

	const result = await spawnSubagent(config);

	if (result.success) {
		if (!actionRun.flow_id || !actionRun.step_name) {
			notifyAgentError(
				actionRun.id,
				"Sub-agent returned artifacts for an action without a feature/step context",
			);
			return;
		}

		for (const artifact of result.artifacts) {
			const artifactId = nanoid(12);
			db.prepare(
				"INSERT INTO artifacts (id, flow_id, step_name, type, filename, content) VALUES (?, ?, ?, ?, ?, ?)",
			).run(
				artifactId,
				actionRun.flow_id,
				actionRun.step_name,
				artifact.type,
				artifact.filename,
				artifact.content,
			);

			bus.emit("artifact:saved", {
				id: artifactId,
				flowId: actionRun.flow_id,
				stepName: actionRun.step_name,
				type: artifact.type,
				filename: artifact.filename,
			});
		}

		bus.emit("action:event", {
			actionRunId: actionRun.id,
			type: "subagent_completed",
			message: `Sub-agent completed: ${result.artifacts.length} artifact(s) produced`,
			dataJson: JSON.stringify({ summary: result.summary.slice(0, 500) }),
		});

		notifyAgentEnd(actionRun.id);
	} else {
		notifyAgentError(actionRun.id, result.error ?? "Sub-agent failed");
	}
}

function gatherSubagentContext(actionRun: ActionRunRow) {
	const db = getDb();

	const feature = db
		.prepare("SELECT * FROM flows WHERE id = ?")
		.get(actionRun.flow_id) as
		| { title: string; description: string | null }
		| undefined;

	const project = db
		.prepare("SELECT * FROM workspaces WHERE id = ?")
		.get(actionRun.workspace_id) as { stack: string } | undefined;

	const previousArtifacts = db
		.prepare(
			"SELECT type, filename, content FROM artifacts WHERE flow_id = ? ORDER BY created_at ASC",
		)
		.all(actionRun.flow_id) as {
		type: string;
		filename: string;
		content: string;
	}[];

	const interviews = db
		.prepare(
			"SELECT question, answer FROM interviews WHERE flow_id = ? AND answer IS NOT NULL ORDER BY created_at ASC",
		)
		.all(actionRun.flow_id) as { question: string; answer: string }[];

	const memories = db
		.prepare(
			"SELECT content FROM memories WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 20",
		)
		.all(actionRun.workspace_id) as { content: string }[];

	return {
		featureTitle: feature?.title ?? "Unknown",
		featureDescription: feature?.description ?? null,
		stepName: actionRun.step_name ?? actionRun.action_type,
		projectStack: project?.stack ?? "[]",
		previousArtifacts: previousArtifacts.map(
			(a) => `### ${a.type}: ${a.filename}\n${a.content.slice(0, 2000)}`,
		),
		interviewAnswers: interviews.map((i) => `Q: ${i.question}\nA: ${i.answer}`),
		memories: memories.map((m) => m.content),
	};
}
