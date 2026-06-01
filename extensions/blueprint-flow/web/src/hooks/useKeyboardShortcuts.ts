import { useEffect } from "react";
import { api, mapExecutionMode } from "../lib/api";
import { useStore } from "../store";

export function useKeyboardShortcuts() {
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			const target = e.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.tagName === "SELECT" ||
				target.isContentEditable
			) {
				return;
			}

			const store = useStore.getState();
			const meta = e.metaKey || e.ctrlKey;

			// Cmd+E — toggle edit mode
			if (meta && e.key === "e") {
				e.preventDefault();
				if (store.selectedFlowId) {
					if (store.canvasEditMode) {
						store.setEditModeSteps(null);
						store.setCanvasEditMode(false);
					} else {
						const steps = store.activeWorkflow?.steps ?? [];
						store.setEditModeSteps(steps);
						store.setCanvasEditMode(true);
					}
				}
				return;
			}

			// Cmd+Enter — run current step
			if (meta && e.key === "Enter") {
				e.preventDefault();
				if (store.selectedFlowId) {
					const { runModelId, runThinkingLevel, executionMode } = store;
					api.flows
						.runStep(store.selectedFlowId, {
							modelId: runModelId ?? undefined,
							thinkingLevel: runThinkingLevel || undefined,
							executionMode: mapExecutionMode(executionMode) || undefined,
						})
						.catch(() => {});
				}
				return;
			}

			// Cmd+N — new flow
			if (meta && e.key === "n") {
				if (store.selectedWorkspaceId && !store.activeModal) {
					e.preventDefault();
					store.openModal("create_flow");
				}
				return;
			}

			// 1-9 — select step by index
			if (!meta && !e.altKey && e.key >= "1" && e.key <= "9") {
				if (store.steps.length > 0 && !store.activeModal) {
					const idx = Number.parseInt(e.key, 10) - 1;
					if (idx < store.steps.length) {
						e.preventDefault();
						store.selectNode(store.steps[idx].id);
					}
				}
				return;
			}

			switch (e.key) {
				case "[":
					e.preventDefault();
					store.toggleSidebar();
					break;

				case "]":
					e.preventDefault();
					store.selectNode(null);
					break;

				case "\\":
					e.preventDefault();
					store.toggleFooter();
					break;

				case "Escape":
					if (store.activeModal) {
						store.closeModal();
					} else if (store.canvasEditMode) {
						store.setEditModeSteps(null);
						store.setCanvasEditMode(false);
					} else if (store.selectedNodeId) {
						store.selectNode(null);
					} else if (store.selectedArtifactId) {
						store.selectArtifact(null);
					}
					break;

				case "j":
				case "ArrowDown":
					if (!store.activeModal && store.steps.length > 0) {
						e.preventDefault();
						const currentIdx = store.steps.findIndex(
							(s) => s.id === store.selectedNodeId,
						);
						const nextIdx = Math.min(currentIdx + 1, store.steps.length - 1);
						store.selectNode(store.steps[nextIdx].id);
					}
					break;

				case "k":
				case "ArrowUp":
					if (!store.activeModal && store.steps.length > 0) {
						e.preventDefault();
						const currentIdx = store.steps.findIndex(
							(s) => s.id === store.selectedNodeId,
						);
						const prevIdx = Math.max(currentIdx - 1, 0);
						store.selectNode(store.steps[prevIdx].id);
					}
					break;
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);
}
