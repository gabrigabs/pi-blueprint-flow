import { useEffect } from "react";
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
					} else if (store.selectedNodeId) {
						store.selectNode(null);
					} else if (store.selectedArtifactId) {
						store.selectArtifact(null);
					}
					break;

				case "n":
					if (store.selectedProjectId && !store.activeModal) {
						e.preventDefault();
						store.openModal("create_feature");
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
