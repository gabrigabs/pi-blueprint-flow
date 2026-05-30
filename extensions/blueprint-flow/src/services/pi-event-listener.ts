import { nanoid } from "nanoid";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	getCurrentRunId,
	notifyAgentEnd,
	notifyAgentError,
	notifyStatusChange,
} from "../pi-bridge.js";
import { createActionRunEvent } from "../db.js";
import { bus } from "../events.js";
import { extractRunIdFromPrompt } from "./prompt-builder.js";

/**
 * Registers Pi event listeners that map agent lifecycle events
 * to ActionRun status updates and event logs.
 *
 * Call once during extension initialization (after setPiRef).
 */
export function registerPiEventListeners(pi: ExtensionAPI): void {
	// Agent started processing
	pi.on("agent_start", async (...args: unknown[]) => {
		const runId = getCurrentRunId();
		if (!runId) return;

		notifyStatusChange(runId, "agent_running");

		createActionRunEvent({
			id: nanoid(),
			actionRunId: runId,
			type: "pi.agent.start",
			message: "Pi agent started processing",
		});

		bus.emit("action:event", {
			actionRunId: runId,
			type: "pi.agent.start",
			message: "Pi agent started processing",
			dataJson: null,
		});
	});

	// Agent finished
	pi.on("agent_end", async (...args: unknown[]) => {
		const runId = getCurrentRunId();
		if (!runId) return;

		createActionRunEvent({
			id: nanoid(),
			actionRunId: runId,
			type: "pi.agent.end",
			message: "Pi agent finished",
		});

		bus.emit("action:event", {
			actionRunId: runId,
			type: "pi.agent.end",
			message: "Pi agent finished",
			dataJson: null,
		});

		notifyAgentEnd(runId);
	});

	// Tool execution started
	pi.on("tool_execution_start", async (...args: unknown[]) => {
		const runId = getCurrentRunId();
		if (!runId) return;

		const payload = args[0] as { toolName?: string; toolCallId?: string } | undefined;
		const toolName = payload?.toolName ?? "unknown";

		notifyStatusChange(runId, "tool_running");

		createActionRunEvent({
			id: nanoid(),
			actionRunId: runId,
			type: "pi.tool.start",
			message: `Tool started: ${toolName}`,
			dataJson: JSON.stringify({ toolName, toolCallId: payload?.toolCallId }),
		});

		bus.emit("action:event", {
			actionRunId: runId,
			type: "pi.tool.start",
			message: `Tool started: ${toolName}`,
			dataJson: { toolName },
		});
	});

	// Tool execution update (partial results)
	pi.on("tool_execution_update", async (...args: unknown[]) => {
		const runId = getCurrentRunId();
		if (!runId) return;

		const payload = args[0] as { toolName?: string; toolCallId?: string } | undefined;
		const toolName = payload?.toolName ?? "unknown";

		createActionRunEvent({
			id: nanoid(),
			actionRunId: runId,
			type: "pi.tool.update",
			message: `Tool update: ${toolName}`,
		});

		bus.emit("action:event", {
			actionRunId: runId,
			type: "pi.tool.update",
			message: `Tool update: ${toolName}`,
			dataJson: { toolName },
		});
	});

	// Tool execution ended
	pi.on("tool_execution_end", async (...args: unknown[]) => {
		const runId = getCurrentRunId();
		if (!runId) return;

		const payload = args[0] as { toolName?: string; isError?: boolean; toolCallId?: string } | undefined;
		const toolName = payload?.toolName ?? "unknown";
		const isError = payload?.isError ?? false;

		// Return to agent_running after tool completes
		notifyStatusChange(runId, "agent_running");

		createActionRunEvent({
			id: nanoid(),
			actionRunId: runId,
			type: "pi.tool.end",
			message: `Tool ended: ${toolName}${isError ? " (error)" : ""}`,
			dataJson: JSON.stringify({ toolName, isError }),
		});

		bus.emit("action:event", {
			actionRunId: runId,
			type: "pi.tool.end",
			message: `Tool ended: ${toolName}${isError ? " (error)" : ""}`,
			dataJson: { toolName, isError },
		});
	});

	// Message update (text streaming from agent)
	pi.on("message_update", async (...args: unknown[]) => {
		const runId = getCurrentRunId();
		if (!runId) return;

		// We don't log every delta to avoid flooding the DB,
		// but we emit a WS event for live streaming in the UI
		const payload = args[0] as { assistantMessageEvent?: { type?: string; delta?: string } } | undefined;
		const event = payload?.assistantMessageEvent;

		if (event?.type === "text_delta" && event.delta) {
			bus.emit("action:event", {
				actionRunId: runId,
				type: "pi.message.delta",
				message: null,
				dataJson: { delta: event.delta },
			});
		}
	});

	// Turn start
	pi.on("turn_start", async (...args: unknown[]) => {
		const runId = getCurrentRunId();
		if (!runId) return;

		const payload = args[0] as { turnIndex?: number } | undefined;

		createActionRunEvent({
			id: nanoid(),
			actionRunId: runId,
			type: "pi.agent.start",
			message: `Turn ${payload?.turnIndex ?? 0} started`,
		});
	});

	// Turn end
	pi.on("turn_end", async (...args: unknown[]) => {
		const runId = getCurrentRunId();
		if (!runId) return;

		const payload = args[0] as { turnIndex?: number } | undefined;

		createActionRunEvent({
			id: nanoid(),
			actionRunId: runId,
			type: "pi.agent.end",
			message: `Turn ${payload?.turnIndex ?? 0} ended`,
		});
	});
}
