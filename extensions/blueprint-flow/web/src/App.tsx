import { useEffect } from "react";
import { WorkflowCanvas } from "./components/canvas/WorkflowCanvas";
import { CreateFeatureModal } from "./components/CreateFeatureModal";
import { AppHeader } from "./components/layout/AppHeader";
import { NodeSidebar } from "./components/NodeSidebar";
import { OnboardingModal } from "./components/onboarding/OnboardingModal";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { Toasts } from "./components/Toasts";
import { ProjectHomeView } from "./components/views/ProjectHomeView";
import { WorkflowEditor } from "./components/WorkflowEditor";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useWebSocket } from "./hooks/useWebSocket";
import { useStore } from "./store";

export function App() {
	useWebSocket();
	useKeyboardShortcuts();
	const {
		selectedProjectId,
		selectedFeatureId,
		selectedNodeId,
		activeModal,
		sidebarCollapsed,
	} = useStore();

	useEffect(() => {
		if (selectedProjectId) {
			fetch(`/api/projects/${selectedProjectId}/features`)
				.then((r) => r.json())
				.then((features) => useStore.getState().setFeatures(features))
				.catch(() => {});

			fetch(`/api/projects/${selectedProjectId}/memories`)
				.then((r) => r.json())
				.then((memories) => useStore.getState().setMemories(memories))
				.catch(() => {});
		}
	}, [selectedProjectId]);

	useEffect(() => {
		if (selectedFeatureId) {
			Promise.all([
				fetch(`/api/features/${selectedFeatureId}/steps`).then((r) => r.json()),
				fetch(`/api/features/${selectedFeatureId}/artifacts`).then((r) => r.json()),
				fetch(`/api/features/${selectedFeatureId}/interviews`).then((r) => r.json()),
			])
				.then(([steps, artifacts, interviews]) => {
					useStore.getState().setSteps(steps);
					useStore.getState().setArtifacts(artifacts);
					useStore.getState().setInterviews(interviews);
				})
				.catch(() => {});
		}
	}, [selectedFeatureId]);

	return (
		<div className="flex h-screen flex-col overflow-hidden">
			<AppHeader />

			<div className="flex flex-1 overflow-hidden">
				{/* Sidebar: Features */}
				{!sidebarCollapsed && (
					<aside
						className="w-64 shrink-0 flex flex-col overflow-hidden border-r sidebar-transition"
						style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
					>
						<ProjectSidebar />
					</aside>
				)}

				{/* Main content */}
				<main className="flex flex-1 flex-col overflow-hidden" style={{ background: "var(--bg-base)" }}>
					{selectedFeatureId ? (
						<WorkflowCanvas />
					) : selectedProjectId ? (
						<ProjectHomeView />
					) : (
						<div className="flex flex-1 items-center justify-center">
							<div className="text-center animate-fade-in">
								<div
									className="mx-auto mb-4 h-16 w-16 rounded-xl flex items-center justify-center"
									style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
								>
									<span className="font-display text-2xl" style={{ color: "var(--text-muted)" }}>&#9671;</span>
								</div>
								<p className="font-display text-lg" style={{ color: "var(--text-tertiary)" }}>
									Create or select a project to begin
								</p>
							</div>
						</div>
					)}
				</main>

				{/* Right: Node detail panel */}
				{selectedNodeId && selectedFeatureId && <NodeSidebar />}
			</div>

			{/* Modals */}
			{activeModal === "onboarding" && <OnboardingModal />}
			{activeModal === "create_feature" && <CreateFeatureModal />}
			{activeModal === "workflow_editor" && <WorkflowEditor />}

			<Toasts />
		</div>
	);
}
