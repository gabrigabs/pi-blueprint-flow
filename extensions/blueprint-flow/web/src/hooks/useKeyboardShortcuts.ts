import { useEffect } from "react";
import { useStore } from "../store";

/**
 * Global keyboard shortcuts for Blueprint Flow.
 *
 * Navigation:
 *   j / ArrowDown — next step
 *   k / ArrowUp   — previous step
 *   Enter         — expand/collapse current step
 *   Escape        — close modal or deselect
 *
 * Panels:
 *   [ — toggle sidebar
 *   ] — toggle right panel
 *   \ — toggle footer (memory panel)
 *
 * Actions:
 *   n — new feature (when project selected)
 */
export function useKeyboardShortcuts() {
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			// Don't capture when typing in inputs/textareas
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
				// --- Panel toggles ---
				case "[":
					e.preventDefault();
					store.toggleSidebar();
					break;

				case "]":
					e.preventDefault();
					store.toggleRightPanel();
					break;

				case "\\":
					e.preventDefault();
					store.toggleFooter();
					break;

				// --- Modal / deselect ---
				case "Escape":
					if (store.activeModal) {
						store.closeModal();
					} else if (store.selectedArtifactId) {
						store.selectArtifact(null);
					}
					break;

				// --- New feature shortcut ---
				case "n":
					if (store.selectedProjectId && !store.activeModal) {
						e.preventDefault();
						store.openModal("create_feature");
					}
					break;

				// --- View mode toggle ---
				case "c":
					if (!store.activeModal && store.selectedFeatureId) {
						e.preventDefault();
						store.setViewMode("canvas");
					}
					break;

				case "K":
					if (!store.activeModal && store.selectedFeatureId) {
						e.preventDefault();
						store.setViewMode("kanban");
					}
					break;

				// --- Step navigation (dispatched as custom events for VerticalKanban) ---
				case "j":
				case "ArrowDown":
					if (!store.activeModal) {
						e.preventDefault();
						window.dispatchEvent(
							new CustomEvent("blueprint:step-nav", { detail: "next" }),
						);
					}
					break;

				case "k":
				case "ArrowUp":
					if (!store.activeModal) {
						e.preventDefault();
						window.dispatchEvent(
							new CustomEvent("blueprint:step-nav", { detail: "prev" }),
						);
					}
					break;

				case "Enter":
					if (!store.activeModal) {
						e.preventDefault();
						window.dispatchEvent(
							new CustomEvent("blueprint:step-nav", { detail: "toggle" }),
						);
					}
					break;
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);
}
