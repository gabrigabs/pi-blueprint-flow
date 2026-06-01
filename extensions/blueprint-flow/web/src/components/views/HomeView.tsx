import { ArrowRight, Folder, Loader2, Plus, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import type { Flow, Workspace } from "../../store";
import { useStore } from "../../store";

type RecentFlow = Flow & { workspace_name: string };

export function HomeView() {
	const { workspaces, openModal, selectWorkspace, selectFlow, setFlows } =
		useStore();
	const [recentFlows, setRecentFlows] = useState<RecentFlow[]>([]);
	const [loadingRecent, setLoadingRecent] = useState(true);
	const [quickTitle, setQuickTitle] = useState("");
	const [quickWorkspaceId, setQuickWorkspaceId] = useState<string>("");
	const [creating, setCreating] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (workspaces.length > 0 && !quickWorkspaceId) {
			setQuickWorkspaceId(workspaces[0].id);
		}
	}, [workspaces, quickWorkspaceId]);

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
		if (!quickTitle.trim() || !quickWorkspaceId || creating) return;
		setCreating(true);
		try {
			const flow = await api.flows.create(quickWorkspaceId, {
				title: quickTitle.trim(),
			});
			const flows = await api.flows.list(quickWorkspaceId);
			setFlows(flows);
			selectWorkspace(quickWorkspaceId);
			selectFlow(flow.id);
			setQuickTitle("");
		} catch {
			// ignore
		} finally {
			setCreating(false);
		}
	}

	const activeWorkspaces = workspaces.filter((w) => !w.archived);

	return (
		<div className="flex flex-1 flex-col overflow-y-auto scrollbar-thin">
			{/* Hero / Quick Create */}
			<div className="relative flex flex-col items-center justify-center px-8 pt-20 pb-12">
				<h1
					className="mb-8 text-3xl font-semibold tracking-tight"
					style={{ color: "var(--text-primary)" }}
				>
					What are you working on?
				</h1>

				<form
					onSubmit={handleQuickCreate}
					className="w-full max-w-2xl space-y-3"
				>
					<div
						className="flex items-center gap-3 rounded-2xl border px-5 py-4 transition-all focus-within:border-[var(--accent-primary)] focus-within:shadow-[0_0_0_1px_rgba(91,155,213,0.3)]"
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
							placeholder="Describe your task or feature..."
							className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--text-muted)]"
							style={{ color: "var(--text-primary)" }}
						/>
						<button
							type="submit"
							disabled={!quickTitle.trim() || !quickWorkspaceId || creating}
							className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-all disabled:opacity-30 hover:opacity-90 active:scale-[0.97]"
							style={{ background: "var(--accent-primary)" }}
						>
							{creating ? (
								<Loader2 size={14} className="animate-spin" />
							) : (
								<ArrowRight size={16} />
							)}
						</button>
					</div>

					{/* Workspace selector chips */}
					{activeWorkspaces.length > 1 && (
						<div className="flex items-center gap-2 flex-wrap">
							{activeWorkspaces.map((w) => (
								<button
									key={w.id}
									type="button"
									onClick={() => setQuickWorkspaceId(w.id)}
									className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-all"
									style={{
										background:
											quickWorkspaceId === w.id
												? "rgba(91,155,213,0.12)"
												: "var(--bg-elevated)",
										borderColor:
											quickWorkspaceId === w.id
												? "rgba(91,155,213,0.4)"
												: "var(--border-default)",
										color:
											quickWorkspaceId === w.id
												? "var(--accent-primary)"
												: "var(--text-secondary)",
									}}
								>
									<Folder size={10} />
									{w.name}
								</button>
							))}
						</div>
					)}
				</form>

				{workspaces.length === 0 && (
					<button
						type="button"
						onClick={() => openModal("create_workspace")}
						className="mt-5 text-sm transition-colors hover:opacity-80"
						style={{ color: "var(--accent-primary)" }}
					>
						Create your first workspace to get started
					</button>
				)}
			</div>

			<div className="mx-auto w-full max-w-3xl space-y-8 px-8 pb-12">
				{/* Recent Flows */}
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

				{/* Workspaces */}
				{activeWorkspaces.length > 0 && (
					<section>
						<div className="mb-3 flex items-center justify-between">
							<h2
								className="text-xs font-medium uppercase tracking-wide"
								style={{ color: "var(--text-tertiary)" }}
							>
								Workspaces
							</h2>
							<button
								type="button"
								onClick={() => openModal("create_workspace")}
								className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-[var(--bg-surface-hover)]"
								style={{ color: "var(--text-tertiary)" }}
							>
								<Plus size={11} />
								New
							</button>
						</div>

						<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
							{activeWorkspaces.map((ws) => (
								<WorkspaceCard
									key={ws.id}
									workspace={ws}
									onClick={() => selectWorkspace(ws.id)}
								/>
							))}
						</div>
					</section>
				)}
			</div>
		</div>
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

function WorkspaceCard({
	workspace,
	onClick,
}: {
	workspace: Workspace & { flow_count?: number };
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="group flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] active:scale-[0.99]"
			style={{
				borderColor: "var(--border-default)",
				background: "var(--bg-elevated)",
			}}
		>
			<Folder
				size={16}
				className="shrink-0"
				style={{ color: "var(--text-tertiary)" }}
			/>
			<div className="min-w-0 flex-1">
				<p
					className="truncate text-sm font-medium"
					style={{ color: "var(--text-primary)" }}
				>
					{workspace.name}
				</p>
			</div>
		</button>
	);
}
