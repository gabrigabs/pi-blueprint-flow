import { Download, FolderOpen, GitBranch, Plus, Settings2 } from "lucide-react";
import { useStore } from "../store";

export function ProjectSidebar() {
	const {
		projects,
		features,
		selectedProjectId,
		selectedFeatureId,
		selectProject,
		selectFeature,
		openModal,
	} = useStore();

	return (
		<div className="flex h-full flex-col">
			{/* Projects section */}
			<div
				className="border-b p-4"
				style={{ borderColor: "var(--border-subtle)" }}
			>
				<div className="mb-3 flex items-center justify-between">
					<h2 className="section-label flex items-center gap-1.5">
						<FolderOpen size={11} /> Projects
					</h2>
					<div className="flex items-center gap-0.5">
						<button
							onClick={() => openModal("import_project")}
							title="Import project"
							className="rounded p-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
							style={{ color: "var(--text-tertiary)" }}
						>
							<Download size={12} />
						</button>
						<button
							onClick={() => openModal("create_project")}
							title="New project"
							className="rounded p-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
							style={{ color: "var(--text-tertiary)" }}
						>
							<Plus size={12} />
						</button>
						{selectedProjectId && (
							<button
								onClick={() => openModal("workflow_editor")}
								title="Edit workflow"
								className="rounded p-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
								style={{ color: "var(--text-tertiary)" }}
							>
								<Settings2 size={12} />
							</button>
						)}
					</div>
				</div>
				{projects.length === 0 ? (
					<button
						onClick={() => openModal("create_project")}
						className="w-full rounded-lg border border-dashed px-3 py-3 text-xs transition-colors hover:border-amber-500/30 hover:text-amber-300"
						style={{
							borderColor: "var(--border-default)",
							color: "var(--text-tertiary)",
						}}
					>
						<span className="font-mono text-[10px] uppercase tracking-wider">
							+ Initialize Project
						</span>
					</button>
				) : (
					<ul className="space-y-1">
						{projects.map((p) => (
							<li key={p.id}>
								<button
									onClick={() => selectProject(p.id)}
									className={`group w-full rounded-lg px-3 py-2 text-left transition-all ${
										selectedProjectId === p.id
											? "instrument-glow-amber"
											: "hover:bg-[var(--bg-surface-hover)]"
									}`}
									style={{
										background:
											selectedProjectId === p.id
												? "var(--amber-glow)"
												: undefined,
									}}
								>
									<span
										className="block truncate text-sm font-medium"
										style={{
											color:
												selectedProjectId === p.id
													? "var(--amber-300)"
													: "var(--text-primary)",
										}}
									>
										{p.name}
									</span>
									{p.description && (
										<span
											className="block truncate text-xs mt-0.5"
											style={{ color: "var(--text-tertiary)" }}
										>
											{p.description}
										</span>
									)}
								</button>
							</li>
						))}
					</ul>
				)}
			</div>

			{/* Features section */}
			{selectedProjectId && (
				<div className="flex-1 overflow-y-auto scrollbar-thin p-4">
					<div className="mb-3 flex items-center justify-between">
						<h2 className="section-label flex items-center gap-1.5">
							<GitBranch size={11} /> Features
						</h2>
						<button
							onClick={() => openModal("create_feature")}
							title="New feature"
							className="rounded p-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
							style={{ color: "var(--text-tertiary)" }}
						>
							<Plus size={12} />
						</button>
					</div>
					{features.length === 0 ? (
						<button
							onClick={() => openModal("create_feature")}
							className="w-full rounded-lg border border-dashed px-3 py-3 text-xs transition-colors hover:border-cyan-500/30 hover:text-cyan-300"
							style={{
								borderColor: "var(--border-default)",
								color: "var(--text-tertiary)",
							}}
						>
							<span className="font-mono text-[10px] uppercase tracking-wider">
								+ New Feature
							</span>
						</button>
					) : (
						<ul className="space-y-1">
							{features.map((f) => {
								const isSelected = selectedFeatureId === f.id;
								return (
									<li key={f.id}>
										<button
											onClick={() => selectFeature(f.id)}
											className={`group w-full rounded-lg px-3 py-2.5 text-left transition-all ${
												isSelected
													? "instrument-glow-cyan"
													: "hover:bg-[var(--bg-surface-hover)]"
											}`}
											style={{
												background: isSelected ? "var(--cyan-glow)" : undefined,
											}}
										>
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
											<div className="flex items-center gap-2 mt-1">
												<StatusIndicator status={f.status} />
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
			)}
		</div>
	);
}

function StatusIndicator({ status }: { status: string }) {
	const colors: Record<string, string> = {
		pending: "bg-[var(--text-muted)]",
		in_progress: "bg-cyan-400",
		done: "bg-emerald-400",
		archived: "bg-[var(--text-muted)]",
	};

	return (
		<span
			className={`inline-block h-1.5 w-1.5 rounded-full ${colors[status] || "bg-[var(--text-muted)]"}`}
		/>
	);
}

function TypeBadge({ type }: { type: string }) {
	if (!type || type === "feature") return null;

	const colors: Record<string, string> = {
		bugfix: "text-rose-400",
		refactor: "text-purple-400",
		spike: "text-amber-400",
		research: "text-cyan-400",
		maintenance: "text-[var(--text-tertiary)]",
	};

	return (
		<span
			className={`font-mono text-[10px] ${colors[type] || "text-[var(--text-tertiary)]"}`}
		>
			{type}
		</span>
	);
}
