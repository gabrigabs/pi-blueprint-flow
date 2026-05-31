import { GitBranch, PanelLeftClose, Plus, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { useStore } from "../store";

export function ProjectSidebar() {
	const {
		flows,
		selectedWorkspaceId,
		selectedFlowId,
		selectFlow,
		openModal,
		toggleSidebar,
	} = useStore();

	async function handleDeleteFlow(e: React.MouseEvent, flowId: string) {
		e.stopPropagation();
		if (!confirm("Delete this flow and all its data?")) return;
		try {
			await api.flows.delete(flowId);
			if (selectedFlowId === flowId) {
				useStore.getState().selectFlow(null);
			}
			const res = await fetch(`/api/workspaces/${selectedWorkspaceId}/flows`);
			if (res.ok) useStore.getState().setFlows(await res.json());
		} catch {}
	}

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div
				className="flex items-center justify-between border-b px-4 py-3"
				style={{ borderColor: "var(--border-subtle)" }}
			>
				<h2 className="section-label flex items-center gap-1.5">
					<GitBranch size={11} /> Flows
				</h2>
				<div className="flex items-center gap-0.5">
					{selectedWorkspaceId && (
						<button
							type="button"
							onClick={() => openModal("create_flow")}
							title="New flow"
							className="rounded p-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
							style={{ color: "var(--text-tertiary)" }}
						>
							<Plus size={12} />
						</button>
					)}
					<button
						type="button"
						onClick={toggleSidebar}
						title="Hide sidebar"
						className="rounded p-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
						style={{ color: "var(--text-muted)" }}
					>
						<PanelLeftClose size={12} />
					</button>
				</div>
			</div>

			{/* Feature list */}
			<div className="flex-1 overflow-y-auto scrollbar-thin p-3">
				{!selectedWorkspaceId ? (
					<p
						className="px-2 py-4 text-center text-xs"
						style={{ color: "var(--text-muted)" }}
					>
						Select a workspace to see flows
					</p>
				) : flows.length === 0 ? (
					<button
						type="button"
						onClick={() => openModal("create_flow")}
						className="w-full rounded-lg border border-dashed px-3 py-4 text-xs transition-colors hover:border-[var(--cyan-400)]/30 hover:text-[var(--cyan-400)]"
						style={{
							borderColor: "var(--border-default)",
							color: "var(--text-tertiary)",
						}}
					>
						<span className="font-mono text-[10px] uppercase tracking-wider">
							+ New Flow
						</span>
					</button>
				) : (
					<ul className="space-y-1">
						{flows.map((f) => {
							const isSelected = selectedFlowId === f.id;
							return (
								<li key={f.id}>
									<button
										type="button"
										onClick={() => selectFlow(f.id)}
										className="group w-full rounded-lg px-3 py-2.5 text-left transition-all"
										style={{
											background: isSelected ? "var(--cyan-glow)" : undefined,
											borderLeft: isSelected
												? "2px solid var(--cyan-400)"
												: "2px solid transparent",
										}}
									>
										<div className="flex items-center justify-between">
											<span
												className="block truncate text-sm font-medium"
												style={{
													color: isSelected
														? "var(--cyan-300)"
														: "var(--text-primary)",
												}}
											>
												{f.title}
											</span>
											<button
												type="button"
												onClick={(e) => handleDeleteFlow(e, f.id)}
												className="hidden group-hover:flex items-center rounded p-0.5 transition-colors hover:bg-[var(--rose-glow)]"
												style={{ color: "var(--rose-400)" }}
												title="Delete flow"
											>
												<Trash2 size={11} />
											</button>
										</div>
										<div className="flex items-center gap-2 mt-1">
											<StatusDot status={f.status} />
											<TypeBadge type={f.type} />
											<span
												className="font-mono text-[10px]"
												style={{ color: "var(--text-muted)" }}
											>
												{f.current_step}
											</span>
										</div>
									</button>
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</div>
	);
}

function StatusDot({ status }: { status: string }) {
	const colors: Record<string, string> = {
		pending: "var(--text-muted)",
		in_progress: "var(--accent-primary)",
		done: "var(--accent-success)",
		archived: "var(--text-muted)",
	};

	return (
		<span
			className="inline-block h-1.5 w-1.5 rounded-full"
			style={{ background: colors[status] ?? "var(--text-muted)" }}
		/>
	);
}

function TypeBadge({ type }: { type: string }) {
	if (!type || type === "feature") return null;

	const colors: Record<string, string> = {
		bugfix: "var(--rose-400)",
		refactor: "#a78bfa",
		spike: "var(--amber-400)",
		research: "var(--cyan-400)",
		maintenance: "var(--text-tertiary)",
	};

	return (
		<span
			className="font-mono text-[10px]"
			style={{ color: colors[type] ?? "var(--text-tertiary)" }}
		>
			{type}
		</span>
	);
}
