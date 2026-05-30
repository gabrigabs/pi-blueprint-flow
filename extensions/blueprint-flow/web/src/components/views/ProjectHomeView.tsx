import { GitBranch, Plus } from "lucide-react";
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
			<div className="w-full max-w-2xl space-y-6 animate-fade-in">
				{/* Project header */}
				<div>
					<h2
						className="font-display text-xl font-semibold"
						style={{ color: "var(--text-primary)" }}
					>
						{project.name}
					</h2>
					{project.repo_path && (
						<p className="mt-1 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
							{project.repo_path}
						</p>
					)}
				</div>

				{/* Stats */}
				<div className="grid grid-cols-3 gap-3">
					<StatCard label="Features" value={features.length} />
					<StatCard label="Active" value={activeFeatures} color="var(--accent-primary)" />
					<StatCard label="Completed" value={doneFeatures} color="var(--accent-success)" />
				</div>

				{/* Workflow config */}
				<WorkflowConfigPanel />

				{/* Create feature CTA */}
				<button
					onClick={() => openModal("create_feature")}
					className="w-full rounded-xl border border-dashed p-5 text-center transition-all hover:border-[var(--accent-primary)] hover:bg-[var(--bg-surface)]"
					style={{ borderColor: "var(--border-default)" }}
				>
					<div className="flex items-center justify-center gap-2">
						<div
							className="flex h-8 w-8 items-center justify-center rounded-lg"
							style={{ background: "var(--cyan-glow)", color: "var(--cyan-400)" }}
						>
							<Plus size={16} />
						</div>
						<div className="text-left">
							<p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
								Create a Feature
							</p>
							<p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
								Start working on something new
							</p>
						</div>
					</div>
				</button>

				{/* Recent features */}
				{features.length > 0 && (
					<div>
						<h3 className="section-label mb-3 flex items-center gap-1.5">
							<GitBranch size={11} /> Recent Features
						</h3>
						<div className="space-y-1.5">
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

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
	return (
		<div
			className="rounded-lg border px-4 py-3"
			style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
		>
			<p className="text-xs font-mono uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
				{label}
			</p>
			<p className="mt-1 text-lg font-semibold font-mono" style={{ color: color ?? "var(--text-primary)" }}>
				{value}
			</p>
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
