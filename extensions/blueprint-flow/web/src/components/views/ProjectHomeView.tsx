import { ArrowRight, Folder, GitBranch, Plus } from "lucide-react";
import { useStore } from "../../store";
import { WorkflowConfigPanel } from "../workflow/WorkflowConfigPanel";

export function ProjectHomeView() {
	const { projects, features, selectedProjectId, openModal } = useStore();
	const project = projects.find((p) => p.id === selectedProjectId);

	if (!project) return null;

	const activeFeatures = features.filter((f) => f.status === "in_progress").length;
	const doneFeatures = features.filter((f) => f.status === "done").length;

	return (
		<div className="flex flex-1 items-start justify-center overflow-y-auto scrollbar-thin p-8">
			<div className="w-full max-w-2xl space-y-8 animate-fade-in">
				{/* Project header */}
				<div className="flex items-start gap-4">
					<div
						className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
						style={{
							background: "linear-gradient(135deg, rgba(91, 155, 213, 0.12), rgba(167, 139, 250, 0.08))",
							border: "1px solid rgba(91, 155, 213, 0.15)",
						}}
					>
						<Folder size={20} style={{ color: "var(--cyan-400)" }} />
					</div>
					<div className="flex-1 min-w-0">
						<h2
							className="font-display text-xl font-semibold tracking-tight"
							style={{ color: "var(--text-primary)" }}
						>
							{project.name}
						</h2>
						{project.repo_path && (
							<p className="mt-0.5 font-mono text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
								{project.repo_path}
							</p>
						)}
					</div>
				</div>

				{/* Stats */}
				<div className="grid grid-cols-3 gap-3">
					<StatCard label="Features" value={features.length} icon="◆" />
					<StatCard label="Active" value={activeFeatures} color="var(--accent-primary)" icon="▶" />
					<StatCard label="Done" value={doneFeatures} color="var(--accent-success)" icon="✓" />
				</div>

				{/* Workflow config */}
				<WorkflowConfigPanel />

				{/* Create feature CTA */}
				<button
					onClick={() => openModal("create_feature")}
					className="group w-full rounded-xl border p-5 text-left transition-all hover:border-[rgba(91,155,213,0.3)] hover:bg-[rgba(91,155,213,0.03)]"
					style={{ borderColor: "var(--border-default)", background: "var(--bg-elevated)" }}
				>
					<div className="flex items-center gap-4">
						<div
							className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
							style={{
								background: "linear-gradient(135deg, rgba(91, 155, 213, 0.15), rgba(34, 211, 238, 0.08))",
								border: "1px solid rgba(91, 155, 213, 0.2)",
							}}
						>
							<Plus size={18} style={{ color: "var(--cyan-400)" }} />
						</div>
						<div className="flex-1">
							<p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
								New Feature
							</p>
							<p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
								Start a new workflow from your pipeline template
							</p>
						</div>
						<ArrowRight
							size={14}
							className="opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5"
							style={{ color: "var(--text-tertiary)" }}
						/>
					</div>
				</button>

				{/* Recent features */}
				{features.length > 0 && (
					<div>
						<div className="flex items-center justify-between mb-3">
							<h3 className="section-label flex items-center gap-1.5">
								<GitBranch size={11} /> Recent
							</h3>
							<span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
								{features.length} total
							</span>
						</div>
						<div className="space-y-1">
							{features.slice(0, 5).map((f) => (
								<FeatureRow key={f.id} feature={f} />
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color?: string; icon?: string }) {
	return (
		<div
			className="rounded-xl border px-4 py-3.5 relative overflow-hidden"
			style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
		>
			<div className="flex items-center justify-between">
				<p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
					{label}
				</p>
				{icon && (
					<span className="text-[10px]" style={{ color: color ?? "var(--text-muted)", opacity: 0.6 }}>
						{icon}
					</span>
				)}
			</div>
			<p className="mt-1.5 text-xl font-semibold font-mono tabular-nums" style={{ color: color ?? "var(--text-primary)" }}>
				{value}
			</p>
			{color && value > 0 && (
				<div
					className="absolute bottom-0 left-0 right-0 h-0.5"
					style={{ background: `linear-gradient(90deg, ${color}40, transparent)` }}
				/>
			)}
		</div>
	);
}

function FeatureRow({ feature }: { feature: { id: string; title: string; status: string; current_step: string } }) {
	const selectFeature = useStore((s) => s.selectFeature);

	const statusColors: Record<string, string> = {
		pending: "var(--text-muted)",
		in_progress: "var(--accent-primary)",
		done: "var(--accent-success)",
	};

	return (
		<button
			onClick={() => selectFeature(feature.id)}
			className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-surface-hover)]"
		>
			<div
				className="h-2 w-2 rounded-full shrink-0"
				style={{ background: statusColors[feature.status] ?? "var(--text-muted)" }}
			/>
			<span className="flex-1 text-sm truncate" style={{ color: "var(--text-primary)" }}>
				{feature.title}
			</span>
			<span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
				{feature.current_step}
			</span>
		</button>
	);
}
