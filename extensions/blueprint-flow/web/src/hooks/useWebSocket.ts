import { useEffect, useRef } from "react";
import { addToast } from "../components/Toasts";
import { useStore } from "../store";

// --- Reconnection config ---
const INITIAL_RETRY_MS = 1000;
const MAX_RETRY_MS = 30_000;
const BACKOFF_FACTOR = 2;

// --- Heartbeat config ---
const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_TIMEOUT_MS = 10_000;

// --- Debounce config ---
const REFETCH_DEBOUNCE_MS = 150;

/**
 * Connects to the Blueprint WebSocket with:
 * - Exponential backoff reconnection
 * - Heartbeat ping/pong for zombie connection detection
 * - Debounced refetch to batch rapid event bursts
 * - Granular connection state (connected | reconnecting | disconnected)
 */
export function useWebSocket() {
	const wsRef = useRef<WebSocket | null>(null);
	const retryDelayRef = useRef(INITIAL_RETRY_MS);
	const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const heartbeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const debouncersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
		new Map(),
	);
	const wasConnectedRef = useRef(false);

	const { setConnected, setConnectionState, setWorkspaces } = useStore();

	useEffect(() => {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const wsUrl = `${protocol}//${window.location.host}/ws`;

		function connect() {
			// If reconnecting after a previous connection, signal it
			if (wasConnectedRef.current) {
				setConnectionState("reconnecting");
			}

			const ws = new WebSocket(wsUrl);
			wsRef.current = ws;

			ws.onopen = () => {
				setConnected(true);
				setConnectionState("connected");
				retryDelayRef.current = INITIAL_RETRY_MS;
				wasConnectedRef.current = true;
				startHeartbeat(ws);
			};

			ws.onclose = () => {
				setConnected(false);
				stopHeartbeat();
				scheduleReconnect();
			};

			ws.onerror = () => {
				ws.close();
			};

			ws.onmessage = (event) => {
				try {
					const msg = JSON.parse(event.data);

					// Handle pong responses for heartbeat
					if (msg.type === "pong") {
						clearHeartbeatTimeout();
						return;
					}

					handleMessage(msg);
				} catch {
					// Ignore malformed messages
				}
			};
		}

		function scheduleReconnect() {
			const delay = retryDelayRef.current;
			setConnectionState(
				wasConnectedRef.current ? "reconnecting" : "disconnected",
			);

			retryTimerRef.current = setTimeout(() => {
				retryDelayRef.current = Math.min(delay * BACKOFF_FACTOR, MAX_RETRY_MS);
				connect();
			}, delay);
		}

		function startHeartbeat(ws: WebSocket) {
			stopHeartbeat();
			heartbeatTimerRef.current = setInterval(() => {
				if (ws.readyState === WebSocket.OPEN) {
					ws.send(JSON.stringify({ type: "ping" }));
					// If no pong within timeout, consider connection dead
					heartbeatTimeoutRef.current = setTimeout(() => {
						ws.close();
					}, HEARTBEAT_TIMEOUT_MS);
				}
			}, HEARTBEAT_INTERVAL_MS);
		}

		function stopHeartbeat() {
			if (heartbeatTimerRef.current) {
				clearInterval(heartbeatTimerRef.current);
				heartbeatTimerRef.current = null;
			}
			clearHeartbeatTimeout();
		}

		function clearHeartbeatTimeout() {
			if (heartbeatTimeoutRef.current) {
				clearTimeout(heartbeatTimeoutRef.current);
				heartbeatTimeoutRef.current = null;
			}
		}

		connect();

		return () => {
			if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
			stopHeartbeat();
			for (const timer of debouncersRef.current.values()) {
				clearTimeout(timer);
			}
			debouncersRef.current.clear();
			if (wsRef.current) {
				wsRef.current.close();
				wsRef.current = null;
			}
		};
	}, []);

	// --- Debounced refresh: coalesces rapid events into a single refetch ---
	function debouncedRefresh(key: string, fn: () => void) {
		const existing = debouncersRef.current.get(key);
		if (existing) clearTimeout(existing);
		debouncersRef.current.set(
			key,
			setTimeout(() => {
				debouncersRef.current.delete(key);
				fn();
			}, REFETCH_DEBOUNCE_MS),
		);
	}

	function handleMessage(msg: { type: string; data: any }) {
		const store = useStore.getState();

		switch (msg.type) {
			case "init":
				if (msg.data.workspaces) {
					setWorkspaces(msg.data.workspaces);
				}
				if (msg.data.bridgeStatus) {
					store.setBridgeStatus(msg.data.bridgeStatus);
				}
				break;

			// --- Action run events ---
			case "action:created":
				if (msg.data.id) {
					store.addActionRun({
						id: msg.data.id,
						workspace_id: msg.data.workspaceId ?? null,
						flow_id: msg.data.flowId ?? null,
						action_type: msg.data.actionType,
						step_name: msg.data.stepName ?? null,
						status: msg.data.status,
						prompt: null,
						model_id: null,
						effort_level: null,
						execution_mode: null,
						error: null,
						started_at: null,
						completed_at: null,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					});
				}
				break;

			case "action:updated":
				if (msg.data.id) {
					store.updateActionRun(msg.data.id, {
						status: msg.data.status,
						error: msg.data.error ?? undefined,
						updated_at: new Date().toISOString(),
					});
				}
				break;

			case "action:event":
				if (msg.data.actionRunId) {
					window.dispatchEvent(
						new CustomEvent("blueprint:action-event", {
							detail: {
								actionRunId: msg.data.actionRunId,
								type: msg.data.type,
								message: msg.data.message,
							},
						}),
					);

					// Extract live activity for streaming indicators
					const evType = msg.data.type as string;
					if (evType === "pi.tool.start") {
						store.setLiveActivity(
							msg.data.actionRunId,
							msg.data.message ?? "tool",
						);
					} else if (evType === "pi.tool.end") {
						store.pushLiveToolEnd();
					} else if (evType === "pi.message.delta") {
						store.appendLiveMessage(msg.data.message ?? "");
					}
				}
				break;

			case "action:completed":
				if (msg.data.id) {
					const completedRun = store.actionRuns.find(
						(r) => r.id === msg.data.id,
					);
					store.updateActionRun(msg.data.id, {
						status: msg.data.status ?? "completed",
						completed_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					});
					store.clearLiveActivity();
					store.addNotification({
						type: "success",
						message: `Step "${completedRun?.step_name ?? "unknown"}" completed`,
						stepName: completedRun?.step_name ?? undefined,
						actionRunId: msg.data.id,
					});
					addToast({ type: "success", message: "Action completed" });
					debouncedRefresh("flowData", refreshFlowData);

					// Auto-advance: advance + run next step (autonomous mode)
					if (store.executionMode === "autonomous" && store.selectedFlowId) {
						const flowId = store.selectedFlowId;
						const completedStepName = completedRun?.step_name;
						const shouldPause =
							completedRun?.flow_id !== flowId ||
							completedStepName === "interview";

						if (!shouldPause) {
							const { runModelId, runThinkingLevel } = store;
							fetch(`/api/flows/${flowId}/advance`, {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({ executionMode: "autonomous" }),
							})
								.then((r) => r.json())
								.then((data) => {
									if (data.completed) return;
									const nextType = data.stepType ?? "agent";
									if (nextType !== "agent") return;
									fetch(`/api/flows/${flowId}/run-step`, {
										method: "POST",
										headers: { "Content-Type": "application/json" },
										body: JSON.stringify({
											agentRunSettings: {
												modelId: runModelId ?? undefined,
												thinkingLevel: runThinkingLevel || undefined,
												executionMode: "apply",
											},
										}),
									}).catch(() => {});
								})
								.catch(() => {});
						}
					}
				}
				break;

			case "action:failed":
				if (msg.data.id) {
					const failedRun = store.actionRuns.find((r) => r.id === msg.data.id);
					store.updateActionRun(msg.data.id, {
						status: "failed",
						error: msg.data.error,
						completed_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					});
					store.clearLiveActivity();
					store.addNotification({
						type: "error",
						message: `Step "${failedRun?.step_name ?? "unknown"}" failed: ${msg.data.error ?? "Unknown error"}`,
						stepName: failedRun?.step_name ?? undefined,
						actionRunId: msg.data.id,
					});
					addToast({
						type: "error",
						message: `Action failed: ${msg.data.error ?? "Unknown error"}`,
						duration: 10000,
					});
				}
				break;

			case "action:timeout_info":
				if (msg.data.timeoutMs && msg.data.startedAt) {
					store.setActionTimeout({
						timeoutMs: msg.data.timeoutMs,
						startedAt: msg.data.startedAt,
					});
				}
				break;

			// --- Step events ---
			case "step:advanced":
				store.addNotification({
					type: "info",
					message: `Advanced to next step`,
				});
				debouncedRefresh("flowData", refreshFlowData);
				debouncedRefresh("workspaces", refreshWorkspaces);
				break;
			case "step:back":
			case "step:status_changed":
				debouncedRefresh("flowData", refreshFlowData);
				debouncedRefresh("workspaces", refreshWorkspaces);
				break;

			// --- Flow events ---
			case "flow:created":
			case "flow:updated":
				debouncedRefresh("flows", refreshFlows);
				debouncedRefresh("flowData", refreshFlowData);
				break;

			// --- Artifact events ---
			case "artifact:saved":
			case "artifact:updated":
				store.incrementArtifactVersion();
				debouncedRefresh("artifacts", refreshArtifacts);
				break;

			// --- Memory events ---
			case "memory:saved":
				debouncedRefresh("memories", refreshMemories);
				break;

			// --- Interview events ---
			case "interview:asked":
				debouncedRefresh("interviews", refreshInterviews);
				store.addNotification({
					type: "warning",
					message: "Agent has questions — check the Interview tab",
				});
				addToast({
					type: "info",
					message: "New interview question available",
					duration: 5000,
				});
				break;

			case "interview:answered":
				debouncedRefresh("interviews", refreshInterviews);
				break;

			// --- Workspace events ---
			case "workspace:created":
			case "workspace:updated":
			case "workspace:archived":
				debouncedRefresh("workspaces", refreshWorkspaces);
				break;

			// --- Import events ---
			case "import:started":
			case "import:completed":
				debouncedRefresh("workspaces", refreshWorkspaces);
				break;

			// --- Config events ---
			case "config:updated":
				window.dispatchEvent(
					new CustomEvent("blueprint:config-updated", { detail: msg.data }),
				);
				break;

			// --- Settings ---
			case "settings:saved":
				break;
		}
	}

	// --- Granular refresh helpers ---

	async function refreshWorkspaces() {
		try {
			const res = await fetch("/api/workspaces");
			if (res.ok) {
				useStore.getState().setWorkspaces(await res.json());
			}
		} catch {}
	}

	async function refreshFlows() {
		const { selectedWorkspaceId } = useStore.getState();
		if (!selectedWorkspaceId) return;
		try {
			const res = await fetch(`/api/workspaces/${selectedWorkspaceId}/flows`);
			if (res.ok) {
				useStore.getState().setFlows(await res.json());
			}
		} catch {}
	}

	async function refreshFlowData() {
		const { selectedFlowId, selectedWorkspaceId } = useStore.getState();

		if (selectedWorkspaceId) {
			try {
				const res = await fetch(`/api/workspaces/${selectedWorkspaceId}/flows`);
				if (res.ok) useStore.getState().setFlows(await res.json());
			} catch {}
		}

		if (!selectedFlowId) return;

		try {
			const [stepsRes, artifactsRes, interviewsRes] = await Promise.all([
				fetch(`/api/flows/${selectedFlowId}/steps`),
				fetch(`/api/flows/${selectedFlowId}/artifacts`),
				fetch(`/api/flows/${selectedFlowId}/interviews`),
			]);

			if (stepsRes.ok) useStore.getState().setSteps(await stepsRes.json());
			if (artifactsRes.ok)
				useStore.getState().setArtifacts(await artifactsRes.json());
			if (interviewsRes.ok)
				useStore.getState().setInterviews(await interviewsRes.json());
		} catch {}
	}

	async function refreshArtifacts() {
		const { selectedFlowId } = useStore.getState();
		if (!selectedFlowId) return;
		try {
			const res = await fetch(`/api/flows/${selectedFlowId}/artifacts`);
			if (res.ok) useStore.getState().setArtifacts(await res.json());
		} catch {}
	}

	async function refreshMemories() {
		const { selectedWorkspaceId } = useStore.getState();
		if (!selectedWorkspaceId) return;
		try {
			const res = await fetch(
				`/api/workspaces/${selectedWorkspaceId}/memories`,
			);
			if (res.ok) useStore.getState().setMemories(await res.json());
		} catch {}
	}

	async function refreshInterviews() {
		const { selectedFlowId } = useStore.getState();
		if (!selectedFlowId) return;
		try {
			const res = await fetch(`/api/flows/${selectedFlowId}/interviews`);
			if (res.ok) useStore.getState().setInterviews(await res.json());
		} catch {}
	}

	return { refreshFlowData };
}
