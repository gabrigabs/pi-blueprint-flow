import { GitBranch, PanelLeftClose, Plus, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { useStore } from "../store";
import { EmptyState } from "./ui/EmptyState";

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
				<h2
					className="text-xs font-medium uppercase tracking-wide animate-slide-in-left"
					style={{ color: "var(--text-tertiary)" }}
				>
					Flows
				</h2>
				<div className="flex items-center gap-0.5">
					{selectedWorkspaceId && (
						<button
							type="button"
							onClick={() => openModal("create_flow")}
							title="New flow (N)"
							className="rounded-lg p-1.5 transition-all duration-150 hover:bg-[var(--bg-surface-hover)] active:scale-90"
							style={{ color: "var(--text-tertiary)" }}
						>
							<Plus size={13} />
						</button>
					)}
					<button
						type="button"
						onClick={toggleSidebar}
						title="Hide sidebar ([)"
						className="rounded-lg p-1.5 transition-all duration-150 hover:bg-[var(--bg-surface-hover)] active:scale-90"
						style={{ color: "var(--text-muted)" }}
					>
						<PanelLeftClose size={13} />
					</button>
				</div>
			</div>

			{/* Flow list */}
			<div className="flex-1 overflow-y-auto scrollbar-thin p-2">
				{!selectedWorkspaceId ? (
					<EmptyState
						icon={GitBranch}
						title="No workspace selected"
						description="Select a workspace to see its flows"
					/>
				) : flows.length === 0 ? (
					<EmptyState
						icon={GitBranch}
						title="No flows yet"
						description="Start your first flow"
						action={{
							label: "+ New Flow",
							onClick: () => openModal("create_flow"),
						}}
					/>
				) : (
					<ul className="space-y-0.5">
						{flows.map((f, i) => {
							const isSelected = selectedFlowId === f.id;
							return (
								<li
									key={f.id}
									className={`animate-fade-up stagger-${Math.min(i + 1, 8)}`}
								>
									<button
										type="button"
										onClick={() => selectFlow(f.id)}
										className="group w-full rounded-xl px-3 py-2.5 text-left transition-all duration-150 hover:bg-[var(--bg-surface-hover)] active:scale-[0.98]"
										style={{
											background: isSelected ? "var(--bg-surface)" : undefined,
											boxShadow: isSelected
												? "inset 2px 0 0 var(--accent-primary)"
												: undefined,
										}}
									>
										<div className="flex items-center justify-between">
											<span
												className="block truncate text-[13px]"
												style={{
													color: isSelected
														? "var(--text-primary)"
														: "var(--text-secondary)",
													fontWeight: isSelected ? 500 : 400,
												}}
											>
												{f.title}
											</span>
											<button
												type="button"
												onClick={(e) => handleDeleteFlow(e, f.id)}
												className="hidden group-hover:flex items-center rounded p-0.5 transition-all duration-150 hover:bg-[var(--rose-glow)] active:scale-90"
												style={{ color: "var(--rose-400)" }}
												title="Delete flow"
											>
												<Trash2 size={11} />
											</button>
										</div>
										<div className="flex items-center gap-2 mt-1">
											<StatusDot status={f.status} />
											<span
												className="text-[11px]"
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
