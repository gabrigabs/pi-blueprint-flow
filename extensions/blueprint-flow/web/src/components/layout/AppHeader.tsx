import {
	Brain,
	ChevronDown,
	Loader2,
	PanelLeftOpen,
	Radio,
	RefreshCw,
	Trash2,
	Wifi,
	WifiOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { useStore } from "../../store";

export function AppHeader() {
	const {
		workspaces,
		selectedWorkspaceId,
		connectionState,
		bridgeStatus,
		actionRuns,
		sidebarCollapsed,
		selectWorkspace,
		selectFlow,
		openModal,
		toggleSidebar,
	} = useStore();

	const currentWorkspace = workspaces.find((p) => p.id === selectedWorkspaceId);
	const currentFlow = useStore((s) =>
		s.flows.find((f) => f.id === s.selectedFlowId),
	);
	const memories = useStore((s) => s.memories);

	const activeRun = actionRuns.find((r) =>
		["agent_running", "tool_running", "injected", "waiting_for_pi"].includes(
			r.status,
		),
	);

	async function handleDeleteWorkspace(
		e: React.MouseEvent,
		workspaceId: string,
	) {
		e.stopPropagation();
		if (!confirm("Delete this workspace and all its flows?")) return;
		try {
			await api.workspaces.delete(workspaceId);
			setDropdownOpen(false);
			if (selectedWorkspaceId === workspaceId) {
				const remaining = workspaces.filter((p) => p.id !== workspaceId);
				selectWorkspace(remaining.length > 0 ? remaining[0].id : null);
			}
			const res = await fetch("/api/workspaces");
			if (res.ok) useStore.getState().setWorkspaces(await res.json());
		} catch {}
	}

	const [dropdownOpen, setDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node)
			) {
				setDropdownOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	return (
		<header
			className="relative z-10 flex items-center justify-between border-b px-5 py-3"
			style={{
				borderColor: "var(--border-subtle)",
				background: "var(--bg-elevated)",
			}}
		>
			{/* Left: Logo + Workspace selector */}
			<div className="flex items-center gap-4">
				<div className="flex items-center gap-2.5">
					{sidebarCollapsed && selectedWorkspaceId && (
						<button
							type="button"
							onClick={toggleSidebar}
							title="Show sidebar"
							className="rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
							style={{ color: "var(--text-muted)" }}
						>
							<PanelLeftOpen size={15} />
						</button>
					)}
					<button
						type="button"
						onClick={() => {
							selectWorkspace(null);
							selectFlow(null);
						}}
						title="Home"
						className="shrink-0 transition-opacity hover:opacity-80"
					>
						<svg
							width="24"
							height="24"
							viewBox="0 0 22 22"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							aria-label="Blueprint Flow"
						>
							<rect
								width="22"
								height="22"
								rx="6"
								fill="var(--accent-primary)"
								fillOpacity="0.15"
							/>
							<circle cx="6" cy="11" r="2" fill="var(--accent-primary)" />
							<circle cx="16" cy="6" r="2" fill="var(--cyan-300)" />
							<circle cx="16" cy="16" r="2" fill="var(--accent-success)" />
							<line
								x1="8"
								y1="11"
								x2="14"
								y2="6.5"
								stroke="var(--accent-primary)"
								strokeOpacity="0.6"
								strokeWidth="1.2"
							/>
							<line
								x1="8"
								y1="11"
								x2="14"
								y2="15.5"
								stroke="var(--accent-primary)"
								strokeOpacity="0.6"
								strokeWidth="1.2"
							/>
						</svg>
					</button>
				</div>

				{/* Workspace selector — prominent */}
				<div className="relative" ref={dropdownRef}>
					<button
						type="button"
						onClick={() => setDropdownOpen(!dropdownOpen)}
						className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-150 hover:bg-[var(--bg-surface-hover)] active:scale-[0.98]"
						style={{
							color: currentWorkspace
								? "var(--text-primary)"
								: "var(--text-tertiary)",
						}}
					>
						{currentWorkspace?.name ?? "All Workspaces"}
						<ChevronDown
							size={14}
							style={{ color: "var(--text-muted)", opacity: 0.7 }}
						/>
					</button>

					{dropdownOpen && (
						<div
							className="absolute top-full left-0 mt-2 w-64 rounded-xl border py-1.5 shadow-2xl animate-fade-in"
							style={{
								background: "var(--bg-elevated)",
								borderColor: "var(--border-default)",
							}}
						>
							<button
								type="button"
								onClick={() => {
									selectWorkspace(null);
									selectFlow(null);
									setDropdownOpen(false);
								}}
								className="flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors hover:bg-[var(--bg-surface-hover)]"
								style={{
									color: !selectedWorkspaceId
										? "var(--accent-primary)"
										: "var(--text-secondary)",
									fontWeight: !selectedWorkspaceId ? 500 : 400,
								}}
							>
								All Workspaces
							</button>
							<div
								className="border-t my-1"
								style={{ borderColor: "var(--border-subtle)" }}
							/>
							{workspaces.map((p) => (
								<div
									key={p.id}
									className="group flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
								>
									<button
										type="button"
										onClick={() => {
											selectWorkspace(p.id);
											setDropdownOpen(false);
										}}
										className="flex-1 text-left text-sm"
										style={{
											color:
												p.id === selectedWorkspaceId
													? "var(--accent-primary)"
													: "var(--text-primary)",
											fontWeight: p.id === selectedWorkspaceId ? 500 : 400,
										}}
									>
										{p.name}
									</button>
									<button
										type="button"
										onClick={(e) => handleDeleteWorkspace(e, p.id)}
										className="hidden group-hover:flex items-center rounded p-1 transition-colors hover:bg-[var(--rose-glow)]"
										style={{ color: "var(--rose-400)" }}
										title="Delete workspace"
									>
										<Trash2 size={12} />
									</button>
								</div>
							))}
							<div
								className="border-t my-1"
								style={{ borderColor: "var(--border-subtle)" }}
							/>
							<button
								type="button"
								onClick={() => {
									openModal("create_workspace");
									setDropdownOpen(false);
								}}
								className="w-full px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-[var(--bg-surface-hover)]"
								style={{ color: "var(--accent-primary)" }}
							>
								+ New Workspace
							</button>
						</div>
					)}
				</div>

				{/* Breadcrumb */}
				{currentFlow && (
					<div className="flex items-center gap-2">
						<span
							className="text-sm"
							style={{ color: "var(--border-strong)", opacity: 0.5 }}
						>
							/
						</span>
						<span
							className="text-sm"
							style={{ color: "var(--text-secondary)" }}
						>
							{currentFlow.title}
						</span>
					</div>
				)}
			</div>

			{/* Right: Status indicators */}
			<div className="flex items-center gap-3">
				{activeRun && (
					<div
						className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
						style={{
							background: "var(--amber-glow)",
							border: "1px solid rgba(230, 126, 34, 0.15)",
						}}
					>
						<Loader2
							size={11}
							className="animate-spin"
							style={{ color: "var(--amber-400)" }}
						/>
						<span
							className="text-xs font-medium"
							style={{ color: "var(--amber-400)" }}
						>
							Running
						</span>
					</div>
				)}

				{bridgeStatus === "not_connected" && !activeRun && (
					<div className="flex items-center gap-1.5">
						<Radio size={10} style={{ color: "var(--rose-400)" }} />
						<span className="text-xs" style={{ color: "var(--rose-400)" }}>
							Pi Offline
						</span>
					</div>
				)}

				{selectedWorkspaceId && (
					<button
						type="button"
						onClick={() => openModal("knowledge")}
						title="Knowledge Base"
						className="relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-[var(--bg-surface-hover)]"
						style={{ color: "var(--text-tertiary)" }}
					>
						<Brain size={14} />
						<span className="hidden sm:inline">Knowledge</span>
						{memories.length > 0 && (
							<span
								className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold"
								style={{
									background: "rgba(167, 139, 250, 0.2)",
									color: "#a78bfa",
								}}
							>
								{memories.length > 9 ? "9+" : memories.length}
							</span>
						)}
					</button>
				)}

				<div className="flex items-center gap-1.5">
					{connectionState === "connected" ? (
						<Wifi
							size={13}
							style={{ color: "var(--accent-success)", opacity: 0.7 }}
						/>
					) : connectionState === "reconnecting" ? (
						<RefreshCw
							size={13}
							className="animate-spin"
							style={{ color: "var(--amber-400)", opacity: 0.7 }}
						/>
					) : (
						<WifiOff
							size={13}
							style={{ color: "var(--rose-400)", opacity: 0.6 }}
						/>
					)}
				</div>
			</div>
		</header>
	);
}
