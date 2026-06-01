import { useEffect } from "react";
import { CreateFlowModal } from "./components/CreateFlowModal";
import { WorkflowCanvas } from "./components/canvas/WorkflowCanvas";
import { KnowledgeModal } from "./components/KnowledgeModal";
import { AppHeader } from "./components/layout/AppHeader";
import { CreateWorkspaceModal } from "./components/onboarding/CreateWorkspaceModal";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { Toasts } from "./components/Toasts";
import { HomeView } from "./components/views/HomeView";
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
				fetch(`/api/flows/${selectedFlowId}`).then((r) => r.json()),
				fetch(`/api/flows/${selectedFlowId}/steps`).then((r) => r.json()),
				fetch(`/api/flows/${selectedFlowId}/artifacts`).then((r) => r.json()),
				fetch(`/api/flows/${selectedFlowId}/interviews`).then((r) => r.json()),
			])
				.then(([flow, steps, artifacts, interviews]) => {
					const store = useStore.getState();
					store.setSteps(steps);
					store.setArtifacts(artifacts);
					store.setInterviews(interviews);

					if (flow.workflow_id) {
						fetch(`/api/workflows/${flow.workflow_id}`)
							.then((r) => r.json())
							.then((workflow) =>
								useStore.getState().setActiveWorkflow(workflow),
							)
							.catch(() => {});
					}
				})
				.catch(() => {});
		} else {
			useStore.getState().setActiveWorkflow(null);
		}
	}, [selectedFlowId]);

	const showSidebar = selectedWorkspaceId && !sidebarCollapsed;

	return (
		<div className="flex h-screen flex-col overflow-hidden">
			<AppHeader />

			<div className="flex flex-1 overflow-hidden">
				{showSidebar && (
					<aside
						className="w-60 shrink-0 flex flex-col overflow-hidden border-r sidebar-transition"
						style={{
							borderColor: "var(--border-subtle)",
							background: "var(--bg-elevated)",
						}}
					>
						<ProjectSidebar />
					</aside>
				)}

				<main
					className="flex flex-1 flex-col overflow-hidden"
					style={{ background: "var(--bg-base)" }}
				>
					{selectedFlowId ? <WorkflowCanvas /> : <HomeView />}
				</main>
			</div>

			{activeModal === "create_workspace" && <CreateWorkspaceModal />}
			{activeModal === "create_flow" && <CreateFlowModal />}
			{activeModal === "workflow_editor" && <WorkflowEditor />}
			{activeModal === "knowledge" && <KnowledgeModal />}

			<Toasts />
		</div>
	);
}
