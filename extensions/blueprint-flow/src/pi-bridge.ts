import type {
	ExtensionAPI,
	SendMessageOptions,
} from "@earendil-works/pi-coding-agent";
import { nanoid } from "nanoid";
import {
	createActionRun,
	createActionRunEvent,
	getActionRun,
	getActiveActionRun,
	updateActionRunStatus,
} from "./db.js";
import { bus } from "./events.js";
import { getPiRef } from "./services/pi-config-reader.js";
import { buildPrompt, gatherPromptContext } from "./services/prompt-builder.js";
import type {
	ActionRunStatus,
	ActionType,
	RunBlueprintActionInput,
} from "./types.js";

export type BridgeStatus = "idle" | "busy" | "not_connected";

export interface PiBridgeInterface {
	getStatus(): BridgeStatus;
	enqueue(input: RunBlueprintActionInput): {
		actionRunId: string;
		status: ActionRunStatus;
	};
	cancel(actionRunId: string): boolean;
}

/** FIFO queue — one action at a time */
const queue: string[] = [];
let currentRunId: string | null = null;
let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

const ACTION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function getPi(): ExtensionAPI | null {
	return getPiRef();
}

function getStatus(): BridgeStatus {
	if (!getPi()) return "not_connected";
	if (currentRunId) return "busy";
	return "idle";
}

function enqueue(input: RunBlueprintActionInput): {
	actionRunId: string;
	status: ActionRunStatus;
} {
	const pi = getPi();
	const id = nanoid();

	if (!pi) {
		// Create the run in DB with terminal not_connected status
		const run = createActionRun({
			id,
			projectId: input.projectId,
			featureId: input.featureId,
			actionType: input.actionType,
			stepName: input.stepName,
			modelId: input.modelId,
			effortLevel: input.effortLevel,
			executionMode: input.executionMode,
		});
		updateActionRunStatus(id, "not_connected");
		bus.emit("action:created", {
			id,
			actionType: input.actionType,
			status: "not_connected",
			featureId: input.featureId,
			projectId: input.projectId,
		});
		return { actionRunId: id, status: "not_connected" };
	}

	// Create the run in DB
	createActionRun({
		id,
		projectId: input.projectId,
		featureId: input.featureId,
		actionType: input.actionType,
		stepName: input.stepName,
		modelId: input.modelId,
		effortLevel: input.effortLevel,
		executionMode: input.executionMode,
	});

	bus.emit("action:created", {
		id,
		actionType: input.actionType,
		status: "created",
		featureId: input.featureId,
		projectId: input.projectId,
	});

	// Queue it
	queue.push(id);
	updateActionRunStatus(id, "queued");
	bus.emit("action:updated", { id, status: "queued" });

	createActionRunEvent({
		id: nanoid(),
		actionRunId: id,
		type: "ui.action.queued",
		message: `Action ${input.actionType} queued`,
	});

	// Try to process next
	processNext();

	return { actionRunId: id, status: "queued" };
}

function cancel(actionRunId: string): boolean {
	// Remove from queue if pending
	const queueIdx = queue.indexOf(actionRunId);
	if (queueIdx !== -1) {
		queue.splice(queueIdx, 1);
		updateActionRunStatus(actionRunId, "cancelled");
		bus.emit("action:updated", { id: actionRunId, status: "cancelled" });
		return true;
	}

	// If it's the current run, mark as cancelled
	if (currentRunId === actionRunId) {
		clearActionTimeout();
		currentRunId = null;
		updateActionRunStatus(actionRunId, "cancelled");
		bus.emit("action:updated", { id: actionRunId, status: "cancelled" });
		processNext();
		return true;
	}

	return false;
}

function processNext(): void {
	if (currentRunId) return; // already processing
	if (queue.length === 0) return;

	const pi = getPi();
	if (!pi) return; // can't process without Pi

	const nextId = queue.shift()!;
	currentRunId = nextId;

	updateActionRunStatus(nextId, "waiting_for_pi");
	bus.emit("action:updated", { id: nextId, status: "waiting_for_pi" });

	// Build the prompt from DB context
	const actionRun = getActionRun(nextId);
	if (!actionRun) {
		currentRunId = null;
		processNext();
		return;
	}

	const ctx = gatherPromptContext(actionRun);
	const prompt = buildPrompt(ctx);

	// Store the prompt in the DB
	updateActionRunStatus(nextId, "injected");
	bus.emit("action:updated", { id: nextId, status: "injected" });

	createActionRunEvent({
		id: nanoid(),
		actionRunId: nextId,
		type: "pi.prompt.injected",
		message: `Prompt injected (${prompt.length} chars)`,
		dataJson: JSON.stringify({ promptLength: prompt.length }),
	});

	// Determine delivery strategy
	const deliverAs: "steer" | "followUp" = currentRunId ? "followUp" : "steer";

	// Inject into Pi
	try {
		pi.sendUserMessage(prompt, { deliverAs });
	} catch (err: any) {
		currentRunId = null;
		const errorMsg = err?.message ?? "Failed to inject prompt into Pi";
		updateActionRunStatus(nextId, "failed", errorMsg);
		bus.emit("action:failed", { id: nextId, error: errorMsg });
		processNext();
		return;
	}

	startActionTimeout(nextId);
}

function startActionTimeout(actionRunId: string): void {
	clearActionTimeout();
	timeoutHandle = setTimeout(() => {
		if (currentRunId === actionRunId) {
			currentRunId = null;
			updateActionRunStatus(
				actionRunId,
				"failed",
				"Action timed out after 5 minutes",
			);
			bus.emit("action:failed", {
				id: actionRunId,
				error: "Action timed out after 5 minutes",
			});
			processNext();
		}
	}, ACTION_TIMEOUT_MS);
}

function clearActionTimeout(): void {
	if (timeoutHandle) {
		clearTimeout(timeoutHandle);
		timeoutHandle = null;
	}
}

/** Called when Pi agent finishes (agent_end event) to complete the current run */
export function notifyAgentEnd(actionRunId: string): void {
	if (currentRunId !== actionRunId) return;
	clearActionTimeout();
	currentRunId = null;
	updateActionRunStatus(actionRunId, "completed");
	bus.emit("action:completed", { id: actionRunId, status: "completed" });
	processNext();
}

/** Called when Pi agent reports an error */
export function notifyAgentError(actionRunId: string, error: string): void {
	if (currentRunId !== actionRunId) return;
	clearActionTimeout();
	currentRunId = null;
	updateActionRunStatus(actionRunId, "failed", error);
	bus.emit("action:failed", { id: actionRunId, error });
	processNext();
}

/** Update the status of the current run (e.g., agent_running, tool_running) */
export function notifyStatusChange(
	actionRunId: string,
	status: ActionRunStatus,
): void {
	if (currentRunId !== actionRunId) return;
	updateActionRunStatus(actionRunId, status);
	bus.emit("action:updated", { id: actionRunId, status });
}

/** Get the currently active run ID */
export function getCurrentRunId(): string | null {
	return currentRunId;
}

// --- Singleton bridge ---

export const piBridge: PiBridgeInterface = {
	getStatus,
	enqueue,
	cancel,
};

export function getPiBridge(): PiBridgeInterface {
	return piBridge;
}
