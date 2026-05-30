import { Brain, ChevronDown, Loader2, PanelLeftOpen, Radio, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useStore } from "../../store";

export function AppHeader() {
	const {
		projects,
		selectedProjectId,
		selectedFeatureId,
		connectionState,
		bridgeStatus,
		actionRuns,
		sidebarCollapsed,
		selectProject,
		openModal,
		toggleSidebar,
	} = useStore();

	const currentProject = projects.find((p) => p.id === selectedProjectId);
	const currentFeature = useStore((s) => s.features.find((f) => f.id === s.selectedFeatureId));
	const steps = useStore((s) => s.steps);
	const currentStep = steps.find((s) => s.status === "running" || s.status === "needs_user");
	const memories = useStore((s) => s.memories);

	const activeRun = actionRuns.find((r) =>
		["agent_running", "tool_running", "injected", "waiting_for_pi"].includes(r.status),
	);

	const [dropdownOpen, setDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				setDropdownOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	return (
		<header
			className="relative z-10 flex items-center justify-between border-b px-5 py-2.5"
			style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
		>
			{/* Left: Logo + Project selector */}
			<div className="flex items-center gap-4">
				<div className="flex items-center gap-2.5">
					<div className="h-5 w-5 rounded-sm bg-gradient-to-br from-[var(--accent-primary)] to-[var(--cyan-500)] flex items-center justify-center">
						<span className="text-[9px] font-bold text-white font-mono">BF</span>
					</div>
					<h1 className="font-display text-lg font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
						Blueprint Flow
					</h1>
				</div>

				{sidebarCollapsed && (
					<button
						onClick={toggleSidebar}
						title="Show sidebar"
						className="rounded p-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
						style={{ color: "var(--text-muted)" }}
					>
						<PanelLeftOpen size={14} />
					</button>
				)}

				{/* Project dropdown */}
				<div className="relative" ref={dropdownRef}>
					<button
						onClick={() => setDropdownOpen(!dropdownOpen)}
						className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-[var(--bg-surface-hover)]"
						style={{ color: currentProject ? "var(--text-primary)" : "var(--text-tertiary)" }}
					>
						{currentProject?.name ?? "Select project"}
						<ChevronDown size={12} style={{ color: "var(--text-muted)" }} />
					</button>

					{dropdownOpen && (
						<div
							className="absolute top-full left-0 mt-1 w-56 rounded-xl border py-1 shadow-xl animate-fade-in"
							style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)" }}
						>
							{projects.map((p) => (
								<button
									key={p.id}
									onClick={() => { selectProject(p.id); setDropdownOpen(false); }}
									className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--bg-surface-hover)]"
									style={{
										color: p.id === selectedProjectId ? "var(--accent-primary)" : "var(--text-primary)",
									}}
								>
									{p.name}
								</button>
							))}
							<div className="border-t my-1" style={{ borderColor: "var(--border-subtle)" }} />
							<button
								onClick={() => { openModal("onboarding"); setDropdownOpen(false); }}
								className="w-full px-3 py-2 text-left text-xs transition-colors hover:bg-[var(--bg-surface-hover)]"
								style={{ color: "var(--text-tertiary)" }}
							>
								+ New Project
							</button>
						</div>
					)}
				</div>

				{/* Breadcrumb */}
				{currentFeature && (
					<div className="flex items-center gap-2">
						<span style={{ color: "var(--text-muted)" }}>/</span>
						<span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
							{currentFeature.title}
						</span>
						{currentStep && (
							<>
								<span style={{ color: "var(--text-muted)" }}>/</span>
								<span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
									{currentStep.name}
								</span>
							</>
						)}
					</div>
				)}
			</div>

			{/* Right: Status indicators */}
			<div className="flex items-center gap-4">
				{activeRun && (
					<div
						className="flex items-center gap-2 rounded-md px-2.5 py-1"
						style={{ background: "var(--amber-glow)", border: "1px solid rgba(230, 126, 34, 0.15)" }}
					>
						<Loader2 size={11} className="animate-spin" style={{ color: "var(--amber-400)" }} />
						<span className="font-mono text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--amber-300)" }}>
							Agent Active
						</span>
					</div>
				)}

				{bridgeStatus === "not_connected" && !activeRun && (
					<div className="flex items-center gap-1.5">
						<Radio size={10} style={{ color: "var(--rose-400)" }} />
						<span className="font-mono text-[10px]" style={{ color: "var(--rose-400)" }}>Pi Offline</span>
					</div>
				)}

				{/* Knowledge base button */}
				{selectedProjectId && (
					<button
						onClick={() => openModal("knowledge")}
						title="Knowledge Base"
						className="relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] transition-colors hover:bg-[var(--bg-surface-hover)]"
						style={{ color: "var(--text-tertiary)" }}
					>
						<Brain size={13} />
						<span className="hidden sm:inline">Knowledge</span>
						{memories.length > 0 && (
							<span
								className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold"
								style={{ background: "rgba(167, 139, 250, 0.2)", color: "#a78bfa" }}
							>
								{memories.length > 9 ? "9+" : memories.length}
							</span>
						)}
					</button>
				)}

				<div className="flex items-center gap-1.5">
					{connectionState === "connected" ? (
						<>
							<div className="status-dot bg-[var(--accent-success)]" />
							<Wifi size={12} style={{ color: "var(--accent-success)", opacity: 0.6 }} />
						</>
					) : connectionState === "reconnecting" ? (
						<>
							<div className="status-dot bg-[var(--amber-400)] animate-pulse" />
							<RefreshCw size={12} className="animate-spin" style={{ color: "var(--amber-400)", opacity: 0.7 }} />
						</>
					) : (
						<>
							<div className="status-dot bg-[var(--rose-400)]" />
							<WifiOff size={12} style={{ color: "var(--rose-400)", opacity: 0.6 }} />
						</>
					)}
				</div>
			</div>
		</header>
	);
}
