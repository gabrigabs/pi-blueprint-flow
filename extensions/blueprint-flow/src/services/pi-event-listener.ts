import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { nanoid } from "nanoid";
import { createActionRunEvent } from "../db.js";
import { bus } from "../events.js";
import {
	getCurrentRunId,
	isPiAgentBusy,
	notifyAgentEnd,
	notifyAgentError,
	notifyStatusChange,
	setPiAgentBusy,
} from "../pi-bridge.js";
import { extractRunIdFromPrompt } from "./prompt-builder.js";

/**
 * Registers Pi event listeners that map agent lifecycle events
 * to ActionRun status updates and event logs.
 *
 * Also tracks Pi's busy/idle state for smart deliverAs detection.
 *
 * Call once during extension initialization (after setPiRef).
 */
export function registerPiEventListeners(pi: ExtensionAPI): void {
	// Agent started processing — track busy state
	pi.on("agent_start", async (...args: unknown[]) => {
		setPiAgentBusy(true);

		const runId = getCurrentRunId();
		if (!runId) return; // Not a Blueprint action — just track busy state

		// Verify this is our action by checking the prompt tag
		const payload = args[0] as { prompt?: string } | undefined;
		if (payload?.prompt) {
			const extractedId = extractRunIdFromPrompt(payload.prompt);
			if (extractedId && extractedId !== runId) {
				// This agent_start is for a different action — ignore
				return;
			}
		}

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

	// Agent finished — track idle state
	pi.on("agent_end", async (...args: unknown[]) => {
		setPiAgentBusy(false);

		const runId = getCurrentRunId();
		if (!runId) return; // Not a Blueprint action

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

		const payload = args[0] as
			| { toolName?: string; toolCallId?: string }
			| undefined;
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

		const payload = args[0] as
			| { toolName?: string; toolCallId?: string }
			| undefined;
		const toolName = payload?.toolName ?? "unknown";

		// Don't flood DB with updates — only emit WS event
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

		const payload = args[0] as
			| { toolName?: string; isError?: boolean; toolCallId?: string }
			| undefined;
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

		// Only emit WS event for live streaming — don't flood DB
		const payload = args[0] as
			| { assistantMessageEvent?: { type?: string; delta?: string } }
			| undefined;
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

	// Turn start — reset timeout on each new turn
	pi.on("turn_start", async (...args: unknown[]) => {
		const runId = getCurrentRunId();
		if (!runId) return;

		const payload = args[0] as { turnIndex?: number } | undefined;
		const turnIndex = payload?.turnIndex ?? 0;

		if (turnIndex > 0) {
			createActionRunEvent({
				id: nanoid(),
				actionRunId: runId,
				type: "pi.agent.start",
				message: `Turn ${turnIndex} started`,
			});
		}
	});

	// Turn end
	pi.on("turn_end", async (...args: unknown[]) => {
		const runId = getCurrentRunId();
		if (!runId) return;

		const payload = args[0] as { turnIndex?: number } | undefined;
		const turnIndex = payload?.turnIndex ?? 0;

		if (turnIndex > 0) {
			createActionRunEvent({
				id: nanoid(),
				actionRunId: runId,
				type: "pi.agent.end",
				message: `Turn ${turnIndex} ended`,
			});
		}
	});
}
