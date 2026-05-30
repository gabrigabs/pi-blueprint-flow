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

	const { setConnected, setConnectionState, setProjects, selectProject } =
		useStore();

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
				retryDelayRef.current = Math.min(
					delay * BACKOFF_FACTOR,
					MAX_RETRY_MS,
				);
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
				if (msg.data.projects) {
					setProjects(msg.data.projects);
					if (msg.data.projects.length > 0 && !store.selectedProjectId) {
						selectProject(msg.data.projects[0].id);
					}
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
						project_id: msg.data.projectId ?? null,
						feature_id: msg.data.featureId ?? null,
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
				}
				break;

			case "action:completed":
				if (msg.data.id) {
					store.updateActionRun(msg.data.id, {
						status: msg.data.status ?? "completed",
						completed_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					});
					addToast({ type: "success", message: "Action completed" });
					debouncedRefresh("featureData", refreshFeatureData);
				}
				break;

			case "action:failed":
				if (msg.data.id) {
					store.updateActionRun(msg.data.id, {
						status: "failed",
						error: msg.data.error,
						completed_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					});
					addToast({
						type: "error",
						message: `Action failed: ${msg.data.error ?? "Unknown error"}`,
						duration: 10000,
					});
				}
				break;

			// --- Step events ---
			case "step:advanced":
			case "step:back":
			case "step:status_changed":
				debouncedRefresh("featureData", refreshFeatureData);
				debouncedRefresh("projects", refreshProjects);
				break;

			// --- Feature events ---
			case "feature:created":
			case "feature:updated":
				debouncedRefresh("features", refreshFeatures);
				debouncedRefresh("featureData", refreshFeatureData);
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
				addToast({
					type: "info",
					message: "New interview question available",
					duration: 5000,
				});
				break;

			case "interview:answered":
				debouncedRefresh("interviews", refreshInterviews);
				break;

			// --- Project events ---
			case "project:created":
			case "project:updated":
			case "project:archived":
				debouncedRefresh("projects", refreshProjects);
				break;

			// --- Import events ---
			case "import:started":
			case "import:completed":
				debouncedRefresh("projects", refreshProjects);
				break;

			// --- Settings ---
			case "settings:saved":
				break;
		}
	}

	// --- Granular refresh helpers ---

	async function refreshProjects() {
		try {
			const res = await fetch("/api/projects");
			if (res.ok) {
				useStore.getState().setProjects(await res.json());
			}
		} catch {}
	}

	async function refreshFeatures() {
		const { selectedProjectId } = useStore.getState();
		if (!selectedProjectId) return;
		try {
			const res = await fetch(`/api/projects/${selectedProjectId}/features`);
			if (res.ok) {
				useStore.getState().setFeatures(await res.json());
			}
		} catch {}
	}

	async function refreshFeatureData() {
		const { selectedFeatureId, selectedProjectId } = useStore.getState();

		if (selectedProjectId) {
			try {
				const res = await fetch(`/api/projects/${selectedProjectId}/features`);
				if (res.ok) useStore.getState().setFeatures(await res.json());
			} catch {}
		}

		if (!selectedFeatureId) return;

		try {
			const [stepsRes, artifactsRes, interviewsRes] = await Promise.all([
				fetch(`/api/features/${selectedFeatureId}/steps`),
				fetch(`/api/features/${selectedFeatureId}/artifacts`),
				fetch(`/api/features/${selectedFeatureId}/interviews`),
			]);

			if (stepsRes.ok) useStore.getState().setSteps(await stepsRes.json());
			if (artifactsRes.ok)
				useStore.getState().setArtifacts(await artifactsRes.json());
			if (interviewsRes.ok)
				useStore.getState().setInterviews(await interviewsRes.json());
		} catch {}
	}

	async function refreshArtifacts() {
		const { selectedFeatureId } = useStore.getState();
		if (!selectedFeatureId) return;
		try {
			const res = await fetch(`/api/features/${selectedFeatureId}/artifacts`);
			if (res.ok) useStore.getState().setArtifacts(await res.json());
		} catch {}
	}

	async function refreshMemories() {
		const { selectedProjectId } = useStore.getState();
		if (!selectedProjectId) return;
		try {
			const res = await fetch(`/api/projects/${selectedProjectId}/memories`);
			if (res.ok) useStore.getState().setMemories(await res.json());
		} catch {}
	}

	async function refreshInterviews() {
		const { selectedFeatureId } = useStore.getState();
		if (!selectedFeatureId) return;
		try {
			const res = await fetch(`/api/features/${selectedFeatureId}/interviews`);
			if (res.ok) useStore.getState().setInterviews(await res.json());
		} catch {}
	}

	return { refreshFeatureData };
}
