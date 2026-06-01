import {
	ArrowRight,
	Clock,
	Folder,
	GitBranch,
	Loader2,
	Plus,
	Zap,
} from "lucide-react";
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
			<div
				className="relative flex flex-col items-center justify-center px-8 py-16 border-b"
				style={{
					borderColor: "var(--border-subtle)",
					background:
						"radial-gradient(ellipse 60% 40% at 50% 0%, rgba(91,155,213,0.06) 0%, transparent 70%)",
				}}
			>
				<p
					className="mb-2 font-mono text-[11px] uppercase tracking-widest"
					style={{ color: "var(--text-muted)" }}
				>
					Blueprint Flow
				</p>
				<h1
					className="mb-8 font-display text-2xl font-semibold tracking-tight"
					style={{ color: "var(--text-primary)" }}
				>
					What are you working on?
				</h1>

				<form
					onSubmit={handleQuickCreate}
					className="flex w-full max-w-xl items-center gap-2"
				>
					<div
						className="flex flex-1 items-center gap-2 rounded-xl border px-4 py-3 transition-all focus-within:border-[var(--border-accent)]"
						style={{
							background: "var(--bg-elevated)",
							borderColor: "var(--border-default)",
						}}
					>
						<Zap size={14} style={{ color: "var(--text-muted)" }} />
						<input
							ref={inputRef}
							type="text"
							value={quickTitle}
							onChange={(e) => setQuickTitle(e.target.value)}
							placeholder="Name your flow..."
							className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
							style={{ color: "var(--text-primary)" }}
						/>
						{workspaces.length > 1 && (
							<select
								value={quickWorkspaceId}
								onChange={(e) => setQuickWorkspaceId(e.target.value)}
								className="rounded-md border px-2 py-1 text-[11px] outline-none"
								style={{
									background: "var(--bg-surface)",
									borderColor: "var(--border-subtle)",
									color: "var(--text-secondary)",
								}}
							>
								{workspaces.map((w) => (
									<option key={w.id} value={w.id}>
										{w.name}
									</option>
								))}
							</select>
						)}
					</div>
					<button
						type="submit"
						disabled={!quickTitle.trim() || !quickWorkspaceId || creating}
						className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white transition-all disabled:opacity-40 hover:opacity-90 active:scale-[0.98]"
						style={{ background: "var(--accent-primary)" }}
					>
						{creating ? (
							<Loader2 size={14} className="animate-spin" />
						) : (
							<>
								<Plus size={14} />
								Create
							</>
						)}
					</button>
				</form>

				{workspaces.length === 0 && (
					<button
						type="button"
						onClick={() => openModal("create_workspace")}
						className="mt-4 text-xs transition-colors hover:opacity-80"
						style={{ color: "var(--accent-primary)" }}
					>
						Create your first workspace →
					</button>
				)}
			</div>

			<div className="mx-auto w-full max-w-4xl space-y-10 px-8 py-10">
				{/* Recent Flows */}
				<section>
					<div className="mb-4 flex items-center justify-between">
						<h2
							className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider"
							style={{ color: "var(--text-muted)" }}
						>
							<Clock size={11} />
							Recent
						</h2>
					</div>

					{loadingRecent ? (
						<div className="space-y-2">
							{["sk-1", "sk-2", "sk-3"].map((id) => (
								<div
									key={id}
									className="h-12 rounded-lg animate-pulse"
									style={{ background: "var(--bg-elevated)" }}
								/>
							))}
						</div>
					) : recentFlows.length === 0 ? (
						<div
							className="rounded-xl border px-6 py-8 text-center"
							style={{
								borderColor: "var(--border-subtle)",
								background: "var(--bg-elevated)",
							}}
						>
							<GitBranch
								size={20}
								className="mx-auto mb-3"
								style={{ color: "var(--text-muted)" }}
							/>
							<p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
								No flows yet. Create one above.
							</p>
						</div>
					) : (
						<div className="space-y-1">
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

				{/* Workspaces */}
				{activeWorkspaces.length > 0 && (
					<section>
						<div className="mb-4 flex items-center justify-between">
							<h2
								className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider"
								style={{ color: "var(--text-muted)" }}
							>
								<Folder size={11} />
								Workspaces
							</h2>
							<button
								type="button"
								onClick={() => openModal("create_workspace")}
								className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors hover:bg-[var(--bg-surface-hover)]"
								style={{ color: "var(--text-tertiary)" }}
							>
								<Plus size={10} />
								New
							</button>
						</div>

						<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
			className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-surface-hover)]"
		>
			<div
				className="h-2 w-2 shrink-0 rounded-full"
				style={{
					background: statusColors[flow.status] ?? "var(--text-muted)",
					boxShadow:
						flow.status === "in_progress"
							? "0 0 6px var(--accent-primary)"
							: "none",
				}}
			/>
			<span
				className="flex-1 truncate text-sm"
				style={{ color: "var(--text-primary)" }}
			>
				{flow.title}
			</span>
			<span
				className="font-mono text-[10px]"
				style={{ color: "var(--text-muted)" }}
			>
				{flow.workspace_name}
			</span>
			<span
				className="font-mono text-[10px]"
				style={{ color: "var(--text-muted)" }}
			>
				{flow.current_step}
			</span>
			<ArrowRight
				size={12}
				className="opacity-0 transition-opacity group-hover:opacity-100"
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
			className="group flex flex-col gap-2 rounded-xl border p-4 text-left transition-all hover:border-[rgba(91,155,213,0.25)] hover:bg-[rgba(91,155,213,0.03)] active:scale-[0.99]"
			style={{
				borderColor: "var(--border-default)",
				background: "var(--bg-elevated)",
			}}
		>
			<div
				className="flex h-8 w-8 items-center justify-center rounded-lg transition-transform group-hover:scale-105"
				style={{
					background:
						"linear-gradient(135deg, rgba(91,155,213,0.12), rgba(167,139,250,0.08))",
					border: "1px solid rgba(91,155,213,0.15)",
				}}
			>
				<Folder size={14} style={{ color: "var(--cyan-400)" }} />
			</div>
			<div className="min-w-0">
				<p
					className="truncate text-sm font-medium"
					style={{ color: "var(--text-primary)" }}
				>
					{workspace.name}
				</p>
				{workspace.flow_count !== undefined && (
					<p
						className="mt-0.5 font-mono text-[10px]"
						style={{ color: "var(--text-muted)" }}
					>
						{workspace.flow_count} flow{workspace.flow_count !== 1 ? "s" : ""}
					</p>
				)}
			</div>
		</button>
	);
}
