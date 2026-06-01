import {
	ArrowRight,
	Check,
	Folder,
	GitBranch,
	Loader2,
	Plus,
	Settings,
	Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import type { Flow } from "../../store";
import { useStore } from "../../store";

type RecentFlow = Flow & { workspace_name: string };

export function HomeView() {
	const {
		workspaces,
		flows,
		selectedWorkspaceId,
		openModal,
		selectWorkspace,
		selectFlow,
		setFlows,
	} = useStore();
	const [recentFlows, setRecentFlows] = useState<RecentFlow[]>([]);
	const [loadingRecent, setLoadingRecent] = useState(true);
	const [quickTitle, setQuickTitle] = useState("");
	const [creating, setCreating] = useState(false);
	const [targetWorkspaceId, setTargetWorkspaceId] = useState<string | null>(
		null,
	);
	const inputRef = useRef<HTMLInputElement>(null);

	const activeWorkspaces = workspaces.filter((w) => !w.archived);
	const currentWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId);
	const targetWorkspace = activeWorkspaces.find(
		(w) => w.id === targetWorkspaceId,
	);

	useEffect(() => {
		setLoadingRecent(true);
		api.flows
			.listRecent(8)
			.then(setRecentFlows)
			.catch(() => {})
			.finally(() => setLoadingRecent(false));
	}, []);

	async function handleQuickCreate(e: React.FormEvent) {
		e.preventDefault();
		const dest = selectedWorkspaceId || targetWorkspaceId;
		if (!quickTitle.trim() || !dest || creating) return;
		setCreating(true);
		try {
			const flow = await api.flows.create(dest, {
				title: quickTitle.trim(),
			});
			const updatedFlows = await api.flows.list(dest);
			setFlows(updatedFlows);
			selectWorkspace(dest);
			selectFlow(flow.id);
			setQuickTitle("");
			setTargetWorkspaceId(null);
		} catch {
		} finally {
			setCreating(false);
		}
	}

	const displayFlows = selectedWorkspaceId ? flows : [];
	const activeFlows = displayFlows.filter(
		(f) => f.status === "in_progress",
	).length;
	const doneFlows = displayFlows.filter((f) => f.status === "done").length;
	const hasTarget = !!(selectedWorkspaceId || targetWorkspaceId);

	return (
		<div className="flex flex-1 flex-col overflow-y-auto scrollbar-thin">
			{/* Hero */}
			<div className="relative flex flex-col items-center justify-center px-8 pt-16 pb-10">
				<div
					className="pointer-events-none absolute inset-0"
					style={{
						background: hasTarget
							? "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(91,155,213,0.06) 0%, transparent 65%)"
							: "radial-gradient(ellipse 60% 60% at 50% 15%, rgba(91,155,213,0.035) 0%, transparent 70%)",
					}}
				/>

				{!selectedWorkspaceId && (
					<div className="relative mb-5 animate-fade-up">
						<Sparkles
							size={20}
							style={{ color: "var(--accent-primary)", opacity: 0.5 }}
						/>
					</div>
				)}

				<h1
					className="relative mb-2 text-2xl font-semibold tracking-tight animate-fade-up"
					style={{
						color: "var(--text-primary)",
						fontFamily: "var(--font-display)",
					}}
				>
					{currentWorkspace ? currentWorkspace.name : "Start a new flow"}
				</h1>

				{!selectedWorkspaceId && !hasTarget && (
					<p
						className="relative mb-8 text-sm animate-fade-up stagger-1"
						style={{ color: "var(--text-tertiary)" }}
					>
						Pick a workspace to get started
					</p>
				)}
				{!selectedWorkspaceId && hasTarget && (
					<p
						className="relative mb-8 text-sm animate-fade-up stagger-1"
						style={{ color: "var(--text-secondary)" }}
					>
						Creating in{" "}
						<span style={{ color: "var(--accent-primary)", fontWeight: 500 }}>
							{targetWorkspace?.name}
						</span>
					</p>
				)}
				{selectedWorkspaceId && <div className="mb-6" />}

				{/* Command input */}
				<form
					onSubmit={handleQuickCreate}
					className="relative w-full max-w-xl animate-fade-up stagger-2"
				>
					<div
						className="relative flex items-center gap-3 rounded-2xl border px-5 py-4 transition-all duration-200"
						style={{
							background: "var(--bg-elevated)",
							borderColor: hasTarget
								? "var(--border-strong)"
								: "var(--border-default)",
							boxShadow: hasTarget
								? "0 0 0 1px rgba(91,155,213,0.08), 0 8px 32px -8px rgba(0,0,0,0.3)"
								: "0 4px 24px -8px rgba(0,0,0,0.2)",
							opacity: hasTarget ? 1 : 0.6,
						}}
					>
						<input
							ref={inputRef}
							type="text"
							value={quickTitle}
							onChange={(e) => setQuickTitle(e.target.value)}
							placeholder={
								hasTarget
									? "Describe your task or feature..."
									: "Select a workspace first..."
							}
							disabled={!hasTarget}
							className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed"
							style={{ color: "var(--text-primary)" }}
						/>
						<button
							type="submit"
							disabled={!quickTitle.trim() || !hasTarget || creating}
							className="flex items-center justify-center rounded-xl p-2.5 transition-all duration-150 disabled:opacity-20 hover:scale-105 active:scale-95"
							style={{
								background:
									hasTarget && quickTitle.trim()
										? "var(--accent-primary)"
										: "var(--bg-surface)",
								color:
									hasTarget && quickTitle.trim() ? "#fff" : "var(--text-muted)",
							}}
						>
							{creating ? (
								<Loader2 size={15} className="animate-spin" />
							) : (
								<ArrowRight size={15} />
							)}
						</button>
					</div>

					{/* Workspace selector chips — only on global home */}
					{!selectedWorkspaceId && activeWorkspaces.length > 0 && (
						<div className="mt-5 flex items-center justify-center gap-2.5 flex-wrap animate-fade-up stagger-3">
							{activeWorkspaces.map((w, i) => {
								const isTarget = targetWorkspaceId === w.id;
								return (
									<button
										key={w.id}
										type="button"
										onClick={() => setTargetWorkspaceId(isTarget ? null : w.id)}
										className={`group flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-medium transition-all duration-200 active:scale-[0.96] animate-scale-in stagger-${Math.min(i + 3, 8)}`}
										style={{
											background: isTarget
												? "rgba(91,155,213,0.08)"
												: "var(--bg-surface)",
											borderColor: isTarget
												? "rgba(91,155,213,0.35)"
												: "var(--border-subtle)",
											color: isTarget
												? "var(--accent-primary)"
												: "var(--text-secondary)",
											boxShadow: isTarget
												? "0 0 16px -4px rgba(91,155,213,0.25), inset 0 1px 0 rgba(91,155,213,0.1)"
												: "0 1px 3px rgba(0,0,0,0.1)",
										}}
									>
										{isTarget ? (
											<Check size={12} />
										) : (
											<Folder size={12} style={{ opacity: 0.6 }} />
										)}
										{w.name}
									</button>
								);
							})}
							<button
								type="button"
								onClick={() => openModal("create_workspace")}
								className="flex items-center gap-1.5 rounded-xl border border-dashed px-4 py-2.5 text-[13px] transition-all duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-hover)] active:scale-[0.96]"
								style={{
									borderColor: "var(--border-default)",
									color: "var(--text-muted)",
								}}
							>
								<Plus size={12} />
								New
							</button>
						</div>
					)}
				</form>
			</div>

			{/* Content */}
			<div className="mx-auto w-full max-w-2xl space-y-6 px-8 pb-16">
				{selectedWorkspaceId && currentWorkspace && (
					<div className="animate-fade-up stagger-3">
						{/* Stats strip */}
						<div
							className="flex items-center gap-1 rounded-xl border p-1 mb-6"
							style={{
								borderColor: "var(--border-subtle)",
								background: "var(--bg-elevated)",
							}}
						>
							<StatCard label="Total" value={displayFlows.length} />
							<StatCard
								label="Active"
								value={activeFlows}
								color="var(--accent-primary)"
								glow="rgba(91,155,213,0.06)"
							/>
							<StatCard
								label="Done"
								value={doneFlows}
								color="var(--accent-success)"
								glow="rgba(107,207,127,0.06)"
							/>
							<div className="flex-1" />
							<button
								type="button"
								onClick={() => openModal("workflow_editor")}
								className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs transition-all duration-150 hover:bg-[var(--bg-surface-hover)] active:scale-[0.97]"
								style={{ color: "var(--text-tertiary)" }}
							>
								<Settings size={12} />
								Workflow
							</button>
							<button
								type="button"
								onClick={() => openModal("create_flow")}
								className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-all duration-150 hover:opacity-90 active:scale-[0.97]"
								style={{
									background: "rgba(91,155,213,0.1)",
									color: "var(--accent-primary)",
								}}
							>
								<Plus size={12} />
								New Flow
							</button>
						</div>

						{/* Flow list */}
						{displayFlows.length > 0 ? (
							<div
								className="rounded-xl border overflow-hidden"
								style={{
									borderColor: "var(--border-subtle)",
									background: "var(--bg-elevated)",
								}}
							>
								{displayFlows.map((f, i) => (
									<div
										key={f.id}
										className={`animate-fade-up stagger-${Math.min(i + 4, 8)}`}
										style={{
											borderBottom:
												i < displayFlows.length - 1
													? "1px solid var(--border-subtle)"
													: "none",
										}}
									>
										<FlowRow flow={f} />
									</div>
								))}
							</div>
						) : (
							<EmptyFlows />
						)}
					</div>
				)}

				{!selectedWorkspaceId && (
					<div className="animate-fade-up stagger-4">
						{(loadingRecent || recentFlows.length > 0) && (
							<section>
								<h2 className="section-label mb-3 px-1">Recent</h2>

								{loadingRecent ? (
									<div className="space-y-2">
										{["sk-1", "sk-2", "sk-3"].map((id) => (
											<div key={id} className="h-12 rounded-xl skeleton" />
										))}
									</div>
								) : (
									<div className="space-y-0.5">
										{recentFlows.map((flow, i) => (
											<div
												key={flow.id}
												className={`animate-fade-up stagger-${Math.min(i + 4, 8)}`}
											>
												<RecentFlowRow
													flow={flow}
													onSelect={() => {
														selectWorkspace(flow.workspace_id);
														selectFlow(flow.id);
													}}
												/>
											</div>
										))}
									</div>
								)}
							</section>
						)}

						{activeWorkspaces.length === 0 && (
							<div
								className="flex flex-col items-center gap-4 rounded-2xl border py-14 animate-scale-in"
								style={{
									borderColor: "var(--border-subtle)",
									background: "var(--bg-elevated)",
								}}
							>
								<div
									className="flex items-center justify-center w-10 h-10 rounded-xl"
									style={{ background: "var(--bg-surface)" }}
								>
									<Folder size={18} style={{ color: "var(--text-muted)" }} />
								</div>
								<div className="text-center">
									<p
										className="text-sm font-medium mb-1"
										style={{ color: "var(--text-secondary)" }}
									>
										No workspaces yet
									</p>
									<p className="text-xs" style={{ color: "var(--text-muted)" }}>
										Create one to start organizing your flows
									</p>
								</div>
								<button
									type="button"
									onClick={() => openModal("create_workspace")}
									className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-all duration-150 hover:opacity-90 active:scale-[0.97]"
									style={{
										background: "rgba(91,155,213,0.1)",
										color: "var(--accent-primary)",
									}}
								>
									<Plus size={11} />
									New Workspace
								</button>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

function EmptyFlows() {
	return (
		<div
			className="flex flex-col items-center gap-3 rounded-xl border py-12 animate-scale-in"
			style={{
				borderColor: "var(--border-subtle)",
				background: "var(--bg-elevated)",
			}}
		>
			<GitBranch size={18} style={{ color: "var(--text-muted)" }} />
			<p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
				No flows yet. Create one above.
			</p>
		</div>
	);
}

function StatCard({
	label,
	value,
	color,
	glow,
}: {
	label: string;
	value: number;
	color?: string;
	glow?: string;
}) {
	return (
		<div
			className="flex items-baseline gap-1.5 rounded-lg px-3 py-2"
			style={{ background: glow ?? "transparent" }}
		>
			<span
				className="text-base font-semibold tabular-nums"
				style={{ color: color ?? "var(--text-primary)" }}
			>
				{value}
			</span>
			<span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
				{label}
			</span>
		</div>
	);
}

function FlowRow({
	flow,
}: {
	flow: { id: string; title: string; status: string; current_step: string };
}) {
	const selectFlow = useStore((s) => s.selectFlow);

	const statusColors: Record<string, string> = {
		pending: "var(--text-muted)",
		in_progress: "var(--accent-primary)",
		done: "var(--accent-success)",
	};

	const statusLabels: Record<string, string> = {
		pending: "Pending",
		in_progress: "Running",
		done: "Done",
	};

	return (
		<button
			type="button"
			onClick={() => selectFlow(flow.id)}
			className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-all duration-150 hover:bg-[var(--bg-surface-hover)] active:scale-[0.998]"
		>
			<div
				className="h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-200 group-hover:scale-125"
				style={{
					background: statusColors[flow.status] ?? "var(--text-muted)",
					boxShadow:
						flow.status === "in_progress"
							? "0 0 6px var(--accent-primary)"
							: "none",
				}}
			/>
			<div className="flex-1 min-w-0">
				<span
					className="block truncate text-[13px] font-medium"
					style={{ color: "var(--text-primary)" }}
				>
					{flow.title}
				</span>
				<span
					className="block text-[11px] mt-0.5"
					style={{ color: "var(--text-muted)" }}
				>
					{flow.current_step || statusLabels[flow.status] || "Pending"}
				</span>
			</div>
			<ArrowRight
				size={12}
				className="shrink-0 opacity-0 -translate-x-1 transition-all duration-150 group-hover:opacity-50 group-hover:translate-x-0"
				style={{ color: "var(--text-tertiary)" }}
			/>
		</button>
	);
}

function RecentFlowRow({
	flow,
	onSelect,
}: {
	flow: RecentFlow;
	onSelect: () => void;
}) {
	const statusColors: Record<string, string> = {
		pending: "var(--text-muted)",
		in_progress: "var(--accent-primary)",
		done: "var(--accent-success)",
	};

	return (
		<button
			type="button"
			onClick={onSelect}
			className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-150 hover:bg-[var(--bg-surface)] hover:translate-x-0.5 active:scale-[0.995]"
		>
			<div
				className="h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-200 group-hover:scale-125"
				style={{
					background: statusColors[flow.status] ?? "var(--text-muted)",
					boxShadow:
						flow.status === "in_progress"
							? "0 0 6px var(--accent-primary)"
							: "none",
				}}
			/>
			<div className="flex-1 min-w-0">
				<span
					className="block truncate text-[13px] font-medium"
					style={{ color: "var(--text-primary)" }}
				>
					{flow.title}
				</span>
			</div>
			<span
				className="text-[11px] rounded-md px-1.5 py-0.5 shrink-0 transition-opacity duration-150 group-hover:opacity-70"
				style={{
					color: "var(--text-muted)",
					background: "var(--bg-surface)",
				}}
			>
				{flow.workspace_name}
			</span>
			<ArrowRight
				size={12}
				className="shrink-0 opacity-0 -translate-x-1 transition-all duration-150 group-hover:opacity-50 group-hover:translate-x-0"
				style={{ color: "var(--text-tertiary)" }}
			/>
		</button>
	);
}
