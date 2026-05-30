import { useEffect, useRef } from "react";
import { addToast } from "../components/Toasts";
import { useStore } from "../store";

/**
 * Connects to the Blueprint WebSocket and handles all realtime events.
 * Automatically refetches relevant data when backend emits changes.
 */
export function useWebSocket() {
	const wsRef = useRef<WebSocket | null>(null);
	const { setConnected, setProjects, selectProject } = useStore();

	useEffect(() => {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const wsUrl = `${protocol}//${window.location.host}/ws`;

		function connect() {
			const ws = new WebSocket(wsUrl);
			wsRef.current = ws;

			ws.onopen = () => {
				setConnected(true);
			};

			ws.onclose = () => {
				setConnected(false);
				setTimeout(connect, 2000);
			};

			ws.onerror = () => {
				ws.close();
			};

			ws.onmessage = (event) => {
				try {
					const msg = JSON.parse(event.data);
					handleMessage(msg);
				} catch {
					// Ignore malformed messages
				}
			};
		}

		connect();

		return () => {
			if (wsRef.current) {
				wsRef.current.close();
				wsRef.current = null;
			}
		};
	}, []);

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
					// Refetch steps/artifacts since completion likely changed state
					refreshFeatureData();
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
				refreshFeatureData();
				refreshProjects();
				break;

			// --- Feature events ---
			case "feature:created":
			case "feature:updated":
				refreshFeatures();
				refreshFeatureData();
				break;

			// --- Artifact events ---
			case "artifact:saved":
			case "artifact:updated":
				refreshArtifacts();
				break;

			// --- Memory events ---
			case "memory:saved":
				refreshMemories();
				break;

			// --- Interview events ---
			case "interview:asked":
				refreshInterviews();
				addToast({
					type: "info",
					message: "New interview question available",
					duration: 5000,
				});
				break;

			case "interview:answered":
				refreshInterviews();
				break;

			// --- Project events ---
			case "project:created":
			case "project:updated":
			case "project:archived":
				refreshProjects();
				break;

			// --- Import events ---
			case "import:started":
			case "import:completed":
				refreshProjects();
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
