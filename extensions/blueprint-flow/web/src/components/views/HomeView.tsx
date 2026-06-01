import {
	ArrowRight,
	Folder,
	GitBranch,
	Loader2,
	Plus,
	Settings,
	Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import type { Flow, Workspace } from "../../store";
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
	const inputRef = useRef<HTMLInputElement>(null);

	const activeWorkspaces = workspaces.filter((w) => !w.archived);
	const currentWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId);

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
		const targetWorkspace = selectedWorkspaceId || activeWorkspaces[0]?.id;
		if (!quickTitle.trim() || !targetWorkspace || creating) return;
		setCreating(true);
		try {
			const flow = await api.flows.create(targetWorkspace, {
				title: quickTitle.trim(),
			});
			const updatedFlows = await api.flows.list(targetWorkspace);
			setFlows(updatedFlows);
			selectWorkspace(targetWorkspace);
			selectFlow(flow.id);
			setQuickTitle("");
		} catch {
			// ignore
		} finally {
			setCreating(false);
		}
	}

	const displayFlows = selectedWorkspaceId ? flows : [];
	const activeFlows = displayFlows.filter(
		(f) => f.status === "in_progress",
	).length;
	const doneFlows = displayFlows.filter((f) => f.status === "done").length;

	return (
		<div className="flex flex-1 flex-col overflow-y-auto scrollbar-thin">
			{/* Hero section */}
			<div className="relative flex flex-col items-center justify-center px-8 pt-16 pb-10">
				{/* Ambient glow */}
				<div
					className="pointer-events-none absolute inset-0"
					style={{
						background:
							"radial-gradient(ellipse 50% 50% at 50% 20%, rgba(91,155,213,0.04) 0%, transparent 70%)",
					}}
				/>

				<h1
					className="relative mb-8 text-3xl font-semibold tracking-tight"
					style={{ color: "var(--text-primary)" }}
				>
					{currentWorkspace ? currentWorkspace.name : "What are you building?"}
				</h1>

				{/* Quick create input */}
				<form
					onSubmit={handleQuickCreate}
					className="relative w-full max-w-2xl space-y-3"
				>
					<div
						className="flex items-center gap-3 rounded-2xl border px-5 py-4 transition-all focus-within:border-[var(--accent-primary)] focus-within:shadow-[0_0_0_1px_rgba(91,155,213,0.25)]"
						style={{
							background: "var(--bg-elevated)",
							borderColor: "var(--border-default)",
						}}
					>
						<Zap size={16} style={{ color: "var(--text-muted)" }} />
						<input
							ref={inputRef}
							type="text"
							value={quickTitle}
							onChange={(e) => setQuickTitle(e.target.value)}
							placeholder={
								currentWorkspace
									? `New flow in ${currentWorkspace.name}...`
									: "Describe your task or feature..."
							}
							className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--text-muted)]"
							style={{ color: "var(--text-primary)" }}
						/>
						<button
							type="submit"
							disabled={
								!quickTitle.trim() ||
								(!selectedWorkspaceId && !activeWorkspaces[0]) ||
								creating
							}
							className="flex items-center rounded-xl px-3.5 py-2 text-sm font-medium text-white transition-all disabled:opacity-30 hover:opacity-90 active:scale-[0.97]"
							style={{ background: "var(--accent-primary)" }}
						>
							{creating ? (
								<Loader2 size={15} className="animate-spin" />
							) : (
								<ArrowRight size={15} />
							)}
						</button>
					</div>

					{/* Workspace chips — only when no workspace is selected */}
					{!selectedWorkspaceId && activeWorkspaces.length > 0 && (
						<div className="flex items-center gap-2 flex-wrap px-1">
							{activeWorkspaces.map((w) => (
								<button
									key={w.id}
									type="button"
									onClick={() => selectWorkspace(w.id)}
									className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)]"
									style={{
										background: "var(--bg-elevated)",
										borderColor: "var(--border-default)",
										color: "var(--text-secondary)",
									}}
								>
									<Folder size={10} />
									{w.name}
								</button>
							))}
							<button
								type="button"
								onClick={() => openModal("create_workspace")}
								className="flex items-center gap-1 rounded-full border border-dashed px-3 py-1.5 text-xs transition-all hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)]"
								style={{
									borderColor: "var(--border-default)",
									color: "var(--text-muted)",
								}}
							>
								<Plus size={10} />
								New
							</button>
						</div>
					)}
				</form>
			</div>

			{/* Content area */}
			<div className="mx-auto w-full max-w-3xl space-y-8 px-8 pb-12">
				{/* Workspace context: stats + flows */}
				{selectedWorkspaceId && currentWorkspace && (
					<>
						{/* Stats row */}
						<div className="flex items-center gap-6">
							<Stat label="Flows" value={displayFlows.length} />
							<Stat
								label="Active"
								value={activeFlows}
								color="var(--accent-primary)"
							/>
							<Stat
								label="Done"
								value={doneFlows}
								color="var(--accent-success)"
							/>
							<div className="flex-1" />
							<button
								type="button"
								onClick={() => openModal("workflow_editor")}
								className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-[var(--bg-surface-hover)]"
								style={{ color: "var(--text-tertiary)" }}
							>
								<Settings size={12} />
								Workflow
							</button>
							<button
								type="button"
								onClick={() => openModal("create_flow")}
								className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-90"
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
							<section>
								<div className="space-y-0.5">
									{displayFlows.map((f) => (
										<FlowRow key={f.id} flow={f} />
									))}
								</div>
							</section>
						) : (
							<div
								className="flex flex-col items-center gap-3 rounded-2xl border py-12"
								style={{
									borderColor: "var(--border-subtle)",
									background: "var(--bg-elevated)",
								}}
							>
								<GitBranch size={20} style={{ color: "var(--text-muted)" }} />
								<p
									className="text-sm"
									style={{ color: "var(--text-tertiary)" }}
								>
									No flows yet. Create one above.
								</p>
							</div>
						)}
					</>
				)}

				{/* Global view: recent flows */}
				{!selectedWorkspaceId && (
					<>
						{(loadingRecent || recentFlows.length > 0) && (
							<section>
								<h2
									className="mb-3 text-xs font-medium uppercase tracking-wide"
									style={{ color: "var(--text-tertiary)" }}
								>
									Recent
								</h2>

								{loadingRecent ? (
									<div className="space-y-2">
										{["sk-1", "sk-2", "sk-3"].map((id) => (
											<div key={id} className="h-11 rounded-xl skeleton" />
										))}
									</div>
								) : (
									<div className="space-y-0.5">
										{recentFlows.map((flow) => (
											<RecentFlowRow
												key={flow.id}
												flow={flow}
												onSelect={() => {
													selectWorkspace(flow.workspace_id);
													selectFlow(flow.id);
												}}
											/>
										))}
									</div>
								)}
							</section>
						)}

						{activeWorkspaces.length === 0 && (
							<div
								className="flex flex-col items-center gap-3 rounded-2xl border py-12"
								style={{
									borderColor: "var(--border-subtle)",
									background: "var(--bg-elevated)",
								}}
							>
								<Folder size={20} style={{ color: "var(--text-muted)" }} />
								<p
									className="text-sm"
									style={{ color: "var(--text-tertiary)" }}
								>
									Create a workspace to get started
								</p>
								<button
									type="button"
									onClick={() => openModal("create_workspace")}
									className="mt-1 text-sm font-medium transition-colors hover:opacity-80"
									style={{ color: "var(--accent-primary)" }}
								>
									+ New Workspace
								</button>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}

function Stat({
	label,
	value,
	color,
}: {
	label: string;
	value: number;
	color?: string;
}) {
	return (
		<div className="flex items-baseline gap-2">
			<span
				className="text-lg font-semibold tabular-nums"
				style={{ color: color ?? "var(--text-primary)" }}
			>
				{value}
			</span>
			<span className="text-xs" style={{ color: "var(--text-muted)" }}>
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

	return (
		<button
			type="button"
			onClick={() => selectFlow(flow.id)}
			className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-[var(--bg-elevated)]"
		>
			<div
				className="h-1.5 w-1.5 shrink-0 rounded-full"
				style={{
					background: statusColors[flow.status] ?? "var(--text-muted)",
					boxShadow:
						flow.status === "in_progress"
							? "0 0 5px var(--accent-primary)"
							: "none",
				}}
			/>
			<span
				className="flex-1 truncate text-sm"
				style={{ color: "var(--text-primary)" }}
			>
				{flow.title}
			</span>
			<span className="text-xs" style={{ color: "var(--text-muted)" }}>
				{flow.current_step}
			</span>
			<ArrowRight
				size={12}
				className="opacity-0 transition-opacity group-hover:opacity-60"
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
			className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-[var(--bg-elevated)]"
		>
			<div
				className="h-1.5 w-1.5 shrink-0 rounded-full"
				style={{
					background: statusColors[flow.status] ?? "var(--text-muted)",
					boxShadow:
						flow.status === "in_progress"
							? "0 0 5px var(--accent-primary)"
							: "none",
				}}
			/>
			<span
				className="flex-1 truncate text-sm"
				style={{ color: "var(--text-primary)" }}
			>
				{flow.title}
			</span>
			<span className="text-xs" style={{ color: "var(--text-muted)" }}>
				{flow.workspace_name}
			</span>
			<ArrowRight
				size={12}
				className="opacity-0 transition-opacity group-hover:opacity-60"
				style={{ color: "var(--text-tertiary)" }}
			/>
		</button>
	);
}
