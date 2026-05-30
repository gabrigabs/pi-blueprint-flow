import { useEffect, useRef } from "react";
import { addToast } from "../components/Toasts";
import { useStore } from "../store";

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
				// Reconnect after 2s
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
				break;

			case "action:created":
				// Add new action run to store
				if (msg.data.id) {
					store.addActionRun({
						id: msg.data.id,
						project_id: msg.data.projectId ?? null,
						feature_id: msg.data.featureId ?? null,
						action_type: msg.data.actionType,
						step_name: null,
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
				// Dispatch custom event for live streaming in ActionRunPanel
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
						status: msg.data.status,
						completed_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					});
					addToast({
						type: "success",
						message: "Action completed successfully",
					});
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

			case "project:created":
			case "feature:created":
			case "feature:updated":
			case "step:advanced":
			case "artifact:saved":
			case "memory:saved":
			case "interview:asked":
			case "interview:answered":
				// Trigger a refresh of the relevant data
				refreshData();
				break;
		}
	}

	async function refreshData() {
		const store = useStore.getState();

		try {
			const projectsRes = await fetch("/api/projects");
			if (projectsRes.ok) {
				const projects = await projectsRes.json();
				useStore.getState().setProjects(projects);
			}

			if (store.selectedProjectId) {
				const featuresRes = await fetch(
					`/api/projects/${store.selectedProjectId}/features`,
				);
				if (featuresRes.ok) {
					const features = await featuresRes.json();
					useStore.getState().setFeatures(features);
				}
			}

			if (store.selectedFeatureId) {
				const [stepsRes, artifactsRes, interviewsRes] = await Promise.all([
					fetch(`/api/features/${store.selectedFeatureId}/steps`),
					fetch(`/api/features/${store.selectedFeatureId}/artifacts`),
					fetch(`/api/features/${store.selectedFeatureId}/interviews`),
				]);

				if (stepsRes.ok) useStore.getState().setSteps(await stepsRes.json());
				if (artifactsRes.ok)
					useStore.getState().setArtifacts(await artifactsRes.json());
				if (interviewsRes.ok)
					useStore.getState().setInterviews(await interviewsRes.json());
			}
		} catch {
			// Network error — will retry on next event
		}
	}

	return { refreshData };
}
