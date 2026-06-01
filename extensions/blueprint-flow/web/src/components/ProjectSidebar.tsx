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

	const statusColors: Record<string, string> = {
		pending: "var(--text-muted)",
		in_progress: "var(--accent-primary)",
		done: "var(--accent-success)",
		archived: "var(--text-muted)",
	};

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div
				className="flex items-center justify-between px-4 py-3.5"
				style={{ borderBottom: "1px solid var(--border-subtle)" }}
			>
				<span className="section-label">Flows</span>
				<div className="flex items-center gap-1">
					{selectedWorkspaceId && (
						<button
							type="button"
							onClick={() => openModal("create_flow")}
							title="New flow"
							className="rounded-lg p-1.5 transition-all duration-150 hover:bg-[var(--bg-surface-hover)] active:scale-90"
							style={{ color: "var(--text-tertiary)" }}
						>
							<Plus size={14} />
						</button>
					)}
					<button
						type="button"
						onClick={toggleSidebar}
						title="Hide sidebar"
						className="rounded-lg p-1.5 transition-all duration-150 hover:bg-[var(--bg-surface-hover)] active:scale-90"
						style={{ color: "var(--text-muted)" }}
					>
						<PanelLeftClose size={14} />
					</button>
				</div>
			</div>

			{/* Flow list */}
			<div className="flex-1 overflow-y-auto scrollbar-thin py-2">
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
					<ul>
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
										className="group relative w-full px-4 py-2.5 text-left transition-all duration-150 active:opacity-70"
										style={{
											paddingLeft: isSelected ? "18px" : "16px",
										}}
									>
										{/* Selected indicator — a thin line flush to the left edge */}
										<span
											className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-r-full transition-all duration-200"
											style={{
												height: isSelected ? "60%" : "0%",
												background: "var(--accent-primary)",
												opacity: isSelected ? 1 : 0,
											}}
										/>
										<div className="flex items-center justify-between gap-2">
											<span
												className="block truncate text-[13px] leading-tight transition-colors duration-150"
												style={{
													color: isSelected
														? "var(--text-primary)"
														: "var(--text-tertiary)",
													fontWeight: isSelected ? 500 : 400,
												}}
											>
												{f.title}
											</span>
											<button
												type="button"
												onClick={(e) => handleDeleteFlow(e, f.id)}
												className="hidden shrink-0 group-hover:flex items-center rounded p-0.5 transition-all duration-150 active:scale-90"
												style={{ color: "var(--text-muted)", opacity: 0.5 }}
												title="Delete flow"
											>
												<Trash2 size={11} />
											</button>
										</div>
										<div className="flex items-center gap-1.5 mt-1">
											<span
												className="inline-block h-1 w-1 rounded-full shrink-0"
												style={{
													background:
														statusColors[f.status] ?? "var(--text-muted)",
													boxShadow:
														f.status === "in_progress"
															? "0 0 4px var(--accent-primary)"
															: "none",
												}}
											/>
											<span
												className="text-[11px] truncate transition-colors duration-150"
												style={{
													color: isSelected
														? "var(--text-muted)"
														: "var(--text-muted)",
													opacity: isSelected ? 1 : 0.6,
												}}
											>
												{f.current_step || "Pending"}
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
