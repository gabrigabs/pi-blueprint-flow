import { Loader2, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Radio, RefreshCw, Wifi, WifiOff } from "lucide-react";
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
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useWebSocket } from "./hooks/useWebSocket";
import { useStore } from "./store";

export function App() {
	useWebSocket();
	useKeyboardShortcuts();
	const {
		connected,
		connectionState,
		selectedProjectId,
		selectedFeatureId,
		activeModal,
		bridgeStatus,
		actionRuns,
		sidebarCollapsed,
		rightPanelCollapsed,
		footerCollapsed,
		toggleSidebar,
		toggleRightPanel,
		toggleFooter,
	} = useStore();

	const currentFeature = useStore((s) =>
		s.features.find((f) => f.id === s.selectedFeatureId),
	);

	const steps = useStore((s) => s.steps);
	const doneSteps = steps.filter((s) => s.status === "done").length;
	const progressPercent = steps.length > 0 ? (doneSteps / steps.length) * 100 : 0;

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
		<div className="flex h-screen flex-col overflow-hidden">
			{/* ═══ Header — Mission Control Bar ═══ */}
			<header
				className="relative z-10 flex items-center justify-between border-b px-5 py-2.5"
				style={{
					borderColor: "var(--border-subtle)",
					background: "var(--bg-elevated)",
				}}
			>
				{/* Left: Brand + context */}
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2.5">
						<div className="h-5 w-5 rounded-sm bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
							<span className="text-[9px] font-bold text-black font-mono">
								BF
							</span>
						</div>
						<h1
							className="font-display text-lg tracking-tight"
							style={{ color: "var(--text-primary)" }}
						>
							Blueprint Flow
						</h1>
					</div>
					{currentFeature && (
						<div className="flex items-center gap-3">
							<span className="text-[var(--text-muted)]">/</span>
							<span
								className="font-mono text-xs tracking-wide"
								style={{ color: "var(--text-secondary)" }}
							>
								{currentFeature.title}
							</span>
							{steps.length > 0 && (
								<div className="flex items-center gap-2">
									<div className="flow-progress-bar w-20">
										<div
											className="flow-progress-fill"
											style={{ width: `${progressPercent}%` }}
										/>
									</div>
									<span className="font-mono text-[10px] text-[var(--text-muted)]">
										{doneSteps}/{steps.length}
									</span>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Right: Panel toggles + Status indicators */}
				<div className="flex items-center gap-4">
					{/* Panel toggle buttons */}
					<div className="flex items-center gap-1">
						<button
							onClick={toggleSidebar}
							title={`${sidebarCollapsed ? "Show" : "Hide"} sidebar [\u005B]`}
							className="rounded p-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
							style={{ color: sidebarCollapsed ? "var(--text-muted)" : "var(--text-tertiary)" }}
						>
							{sidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
						</button>
						<button
							onClick={toggleRightPanel}
							title={`${rightPanelCollapsed ? "Show" : "Hide"} panel [\u005D]`}
							className="rounded p-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
							style={{ color: rightPanelCollapsed ? "var(--text-muted)" : "var(--text-tertiary)" }}
						>
							{rightPanelCollapsed ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
						</button>
					</div>

					{/* Separator */}
					<div className="h-4 w-px" style={{ background: "var(--border-subtle)" }} />

					{/* Active run telemetry */}
					{activeRun && (
						<div
							className="flex items-center gap-2 rounded-md px-2.5 py-1"
							style={{
								background: "var(--amber-glow)",
								border: "1px solid rgba(245, 158, 11, 0.15)",
							}}
						>
							<Loader2 size={11} className="animate-spin text-amber-400" />
							<span className="font-mono text-[10px] font-medium text-amber-300 uppercase tracking-wider">
								Agent Active
							</span>
						</div>
					)}

					{/* Bridge status */}
					{bridgeStatus === "not_connected" && !activeRun && (
						<div className="flex items-center gap-1.5">
							<Radio size={10} className="text-rose-400" />
							<span className="font-mono text-[10px] text-rose-400/80">
								Pi Offline
							</span>
						</div>
					)}

					{/* Connection indicator */}
					<div className="flex items-center gap-1.5">
						{connectionState === "connected" ? (
							<>
								<div className="status-dot bg-emerald-400" />
								<Wifi size={12} className="text-emerald-400/60" />
							</>
						) : connectionState === "reconnecting" ? (
							<>
								<div className="status-dot bg-amber-400 animate-pulse" />
								<RefreshCw size={12} className="text-amber-400/70 animate-spin" />
								<span className="font-mono text-[10px] text-amber-400/70">
									RECONNECTING
								</span>
							</>
						) : (
							<>
								<div className="status-dot bg-rose-400" />
								<WifiOff size={12} className="text-rose-400/60" />
								<span className="font-mono text-[10px] text-rose-400/60">
									DISCONNECTED
								</span>
							</>
						)}
					</div>
				</div>
			</header>

			{/* ═══ Main Layout ═══ */}
			<div className="flex flex-1 overflow-hidden">
				{/* Left sidebar — Navigation */}
				{!sidebarCollapsed && (
					<aside
						className="w-64 shrink-0 overflow-y-auto scrollbar-thin border-r transition-all duration-200"
						style={{
							borderColor: "var(--border-subtle)",
							background: "var(--bg-elevated)",
						}}
					>
						<ProjectSidebar />
					</aside>
				)}

				{/* Center — Flow Canvas */}
				<main
					className="flex flex-1 flex-col overflow-hidden"
					style={{ background: "var(--bg-base)" }}
				>
					{selectedFeatureId ? (
						<div className="flex flex-1 overflow-hidden">
							<div className="flex flex-1 flex-col overflow-hidden">
								<VerticalKanban />
							</div>

							{/* Right panel — Instruments */}
							{!rightPanelCollapsed && (
								<aside
									className="w-96 shrink-0 overflow-y-auto scrollbar-thin border-l transition-all duration-200"
									style={{
										borderColor: "var(--border-subtle)",
										background: "var(--bg-elevated)",
									}}
								>
									<ActionRunPanel />
									<ArtifactInspector />
									<InterviewPanel />
								</aside>
							)}
						</div>
					) : (
						<div className="flex flex-1 items-center justify-center">
							<div className="text-center animate-fade-in">
								<div
									className="mx-auto mb-4 h-16 w-16 rounded-xl flex items-center justify-center"
									style={{
										background: "var(--bg-surface)",
										border: "1px solid var(--border-default)",
									}}
								>
									<span
										className="font-display text-2xl"
										style={{ color: "var(--text-muted)" }}
									>
										◇
									</span>
								</div>
								<p
									className="font-display text-lg"
									style={{ color: "var(--text-tertiary)" }}
								>
									Select a feature to view its flow
								</p>
								<p
									className="mt-1 font-mono text-[10px] uppercase tracking-widest"
									style={{ color: "var(--text-muted)" }}
								>
									or create one from the sidebar
								</p>
							</div>
						</div>
					)}
				</main>
			</div>

			{/* ═══ Bottom Panel — Knowledge Base ═══ */}
			{selectedProjectId && !footerCollapsed && (
				<footer
					className="h-48 shrink-0 overflow-y-auto scrollbar-thin border-t transition-all duration-200"
					style={{
						borderColor: "var(--border-subtle)",
						background: "var(--bg-elevated)",
					}}
				>
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
