import { Loader2, Radio, Wifi, WifiOff } from "lucide-react";
import { useEffect } from "react";
import { ActionRunPanel } from "./components/ActionRunPanel";
import { ArtifactInspector } from "./components/ArtifactInspector";
import { CreateFeatureModal } from "./components/CreateFeatureModal";
import { CreateProjectModal } from "./components/CreateProjectModal";
import { ImportProjectModal } from "./components/ImportProjectModal";
import { InterviewPanel } from "./components/InterviewPanel";
import { MemoryPanel } from "./components/MemoryPanel";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { Toasts } from "./components/Toasts";
import { VerticalKanban } from "./components/VerticalKanban";
import { WorkflowEditor } from "./components/WorkflowEditor";
import { useWebSocket } from "./hooks/useWebSocket";
import { useStore } from "./store";

export function App() {
	useWebSocket();
	const {
		connected,
		selectedProjectId,
		selectedFeatureId,
		activeModal,
		bridgeStatus,
		actionRuns,
	} = useStore();

	const currentFeature = useStore((s) =>
		s.features.find((f) => f.id === s.selectedFeatureId),
	);

	// Determine if any action is actively running
	const activeRun = actionRuns.find((r) =>
		["agent_running", "tool_running", "injected", "waiting_for_pi"].includes(
			r.status,
		),
	);

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
				fetch(`/api/features/${selectedFeatureId}/artifacts`).then((r) =>
					r.json(),
				),
				fetch(`/api/features/${selectedFeatureId}/interviews`).then((r) =>
					r.json(),
				),
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
		<div className="flex h-screen flex-col bg-gray-950">
			{/* Header */}
			<header className="flex items-center justify-between border-b border-gray-800 px-4 py-2">
				<div className="flex items-center gap-3">
					<h1 className="text-lg font-semibold text-gray-100">
						Blueprint Flow
					</h1>
					{currentFeature && (
						<span className="text-sm text-gray-500 truncate max-w-[200px]">
							/ {currentFeature.title}
						</span>
					)}
				</div>
				<div className="flex items-center gap-3 text-sm">
					{/* Active run indicator */}
					{activeRun && (
						<span className="flex items-center gap-1.5 text-fuchsia-400">
							<Loader2 size={12} className="animate-spin" />
							<span className="text-xs">Pi running</span>
						</span>
					)}
					{/* Bridge status */}
					{bridgeStatus === "not_connected" && !activeRun && (
						<span className="flex items-center gap-1 text-xs text-red-400/70">
							<Radio size={11} />
							Pi offline
						</span>
					)}
					{/* WebSocket connection */}
					{connected ? (
						<span className="flex items-center gap-1 text-emerald-400">
							<Wifi size={14} />
						</span>
					) : (
						<span className="flex items-center gap-1 text-red-400">
							<WifiOff size={14} /> Disconnected
						</span>
					)}
				</div>
			</header>

			{/* Main layout */}
			<div className="flex flex-1 overflow-hidden">
				{/* Left sidebar */}
				<aside className="w-64 shrink-0 overflow-y-auto border-r border-gray-800">
					<ProjectSidebar />
				</aside>

				{/* Center content */}
				<main className="flex flex-1 flex-col overflow-hidden">
					{selectedFeatureId ? (
						<div className="flex flex-1 overflow-hidden">
							<div className="flex flex-1 flex-col overflow-hidden">
								<VerticalKanban />
							</div>

							{/* Right panel */}
							<aside className="w-96 shrink-0 overflow-y-auto border-l border-gray-800">
								<ActionRunPanel />
								<ArtifactInspector />
								<InterviewPanel />
							</aside>
						</div>
					) : (
						<div className="flex flex-1 items-center justify-center text-gray-500">
							<p>Select a feature to view its flow</p>
						</div>
					)}
				</main>
			</div>

			{/* Bottom panel — Memory */}
			{selectedProjectId && (
				<footer className="h-48 shrink-0 overflow-y-auto border-t border-gray-800">
					<MemoryPanel />
				</footer>
			)}

			{/* Modals */}
			{activeModal === "create_project" && <CreateProjectModal />}
			{activeModal === "create_feature" && <CreateFeatureModal />}
			{activeModal === "import_project" && <ImportProjectModal />}
			{activeModal === "workflow_editor" && <WorkflowEditor />}

			{/* Notifications */}
			<Toasts />
		</div>
	);
}
