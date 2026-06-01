import { useEffect } from "react";
import { CreateFlowModal } from "./components/CreateFlowModal";
import { WorkflowCanvas } from "./components/canvas/WorkflowCanvas";
import { KnowledgeModal } from "./components/KnowledgeModal";
import { AppHeader } from "./components/layout/AppHeader";
import { CreateWorkspaceModal } from "./components/onboarding/CreateWorkspaceModal";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { Toasts } from "./components/Toasts";
import { HomeView } from "./components/views/HomeView";
import { ProjectHomeView } from "./components/views/ProjectHomeView";
import { WorkflowEditor } from "./components/WorkflowEditor";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useWebSocket } from "./hooks/useWebSocket";
import { useStore } from "./store";

export function App() {
	useWebSocket();
	useKeyboardShortcuts();
	const { selectedWorkspaceId, selectedFlowId, activeModal, sidebarCollapsed } =
		useStore();

	useEffect(() => {
		if (selectedWorkspaceId) {
			fetch(`/api/workspaces/${selectedWorkspaceId}/flows`)
				.then((r) => r.json())
				.then((flows) => useStore.getState().setFlows(flows))
				.catch(() => {});

			fetch(`/api/workspaces/${selectedWorkspaceId}/memories`)
				.then((r) => r.json())
				.then((memories) => useStore.getState().setMemories(memories))
				.catch(() => {});
		}
	}, [selectedWorkspaceId]);

	useEffect(() => {
		if (selectedFlowId) {
			Promise.all([
				fetch(`/api/flows/${selectedFlowId}/steps`).then((r) => r.json()),
				fetch(`/api/flows/${selectedFlowId}/artifacts`).then((r) => r.json()),
				fetch(`/api/flows/${selectedFlowId}/interviews`).then((r) => r.json()),
			])
				.then(([steps, artifacts, interviews]) => {
					useStore.getState().setSteps(steps);
					useStore.getState().setArtifacts(artifacts);
					useStore.getState().setInterviews(interviews);
				})
				.catch(() => {});
		}
	}, [selectedFlowId]);

	return (
		<div className="flex h-screen flex-col overflow-hidden">
			<AppHeader />

			<div className="flex flex-1 overflow-hidden">
				{/* Sidebar: Features */}
				{!sidebarCollapsed && (
					<aside
						className="w-64 shrink-0 flex flex-col overflow-hidden border-r sidebar-transition"
						style={{
							borderColor: "var(--border-subtle)",
							background: "var(--bg-elevated)",
						}}
					>
						<ProjectSidebar />
					</aside>
				)}

				{/* Main content */}
				<main
					className="flex flex-1 flex-col overflow-hidden animate-fade-in"
					style={{ background: "var(--bg-base)" }}
				>
					{selectedFlowId ? (
						<WorkflowCanvas />
					) : selectedWorkspaceId ? (
						<ProjectHomeView />
					) : (
						<HomeView />
					)}
				</main>
			</div>

			{/* Modals */}
			{activeModal === "create_workspace" && <CreateWorkspaceModal />}
			{activeModal === "create_flow" && <CreateFlowModal />}
			{activeModal === "workflow_editor" && <WorkflowEditor />}
			{activeModal === "knowledge" && <KnowledgeModal />}

			<Toasts />
		</div>
	);
}
