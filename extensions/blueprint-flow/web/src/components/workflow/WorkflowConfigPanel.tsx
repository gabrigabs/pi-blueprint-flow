import {
	BookOpen,
	Brain,
	ChevronDown,
	ChevronUp,
	Code2,
	FileSearch,
	Layers,
	MessageSquare,
	Microscope,
	PenTool,
	RotateCcw,
	Save,
	Shield,
	Sparkles,
	Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { WORKFLOW_TEMPLATES, type WorkflowTemplate } from "../../constants/workflow-templates";
import { api } from "../../lib/api";
import type { WorkflowStep } from "../../store";
import { useStore } from "../../store";
import { WorkflowStepList } from "./WorkflowStepList";
import { WorkflowTemplateSelector } from "../onboarding/WorkflowTemplateSelector";

const STEP_ICONS: Record<string, typeof Zap> = {
	intake: Zap,
	research: Microscope,
	interview: MessageSquare,
	spec: FileSearch,
	ddd: Brain,
	design: PenTool,
	behavior: Layers,
	implementation_plan: BookOpen,
	implementation: Code2,
	review: Shield,
	memory_update: Sparkles,
};

const STEP_COLORS: Record<string, string> = {
	intake: "#a78bfa",
	research: "#7ec8e3",
	interview: "#fcd34d",
	spec: "#5b9bd5",
	ddd: "#c084fc",
	design: "#f472b6",
	behavior: "#6bcf7f",
	implementation_plan: "#e67e22",
	implementation: "#22d3ee",
	review: "#6bcf7f",
	memory_update: "#a78bfa",
};

function PipelineVisualization({ steps, hoveredStep, setHoveredStep }: {
	steps: WorkflowStep[];
	hoveredStep: number | null;
	setHoveredStep: (i: number | null) => void;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		const t = requestAnimationFrame(() => setMounted(true));
		return () => cancelAnimationFrame(t);
	}, []);

	const nodeSize = steps.length > 8 ? 36 : steps.length > 5 ? 40 : 44;
	const iconSize = steps.length > 8 ? 14 : steps.length > 5 ? 15 : 17;

	return (
		<div className="px-5 pb-5">
			<div
				className="relative rounded-xl overflow-hidden"
				style={{ border: "1px solid var(--border-subtle)" }}
			>
				<div
					className="absolute inset-0"
					style={{
						background: "linear-gradient(180deg, var(--bg-inset) 0%, rgba(22, 25, 30, 0.95) 100%)",
					}}
				/>
				<div
					className="absolute inset-0 opacity-30 pointer-events-none"
					style={{
						backgroundImage: "radial-gradient(circle at 1px 1px, rgba(91, 155, 213, 0.05) 1px, transparent 0)",
						backgroundSize: "24px 24px",
					}}
				/>

				<div ref={containerRef} className="relative py-8 px-8">
					<div className="flex items-start justify-between gap-1">
						{steps.map((step, i) => {
							const Icon = STEP_ICONS[step.name] ?? Zap;
							const color = STEP_COLORS[step.name] ?? "var(--accent-primary)";
							const isHovered = hoveredStep === i;
							const isLast = i === steps.length - 1;

							return (
								<div
									key={step.name || i}
									className="flex flex-col items-center flex-1 min-w-0 relative"
									style={{
										opacity: mounted ? 1 : 0,
										transform: mounted
											? isHovered ? "translateY(-4px)" : "translateY(0)"
											: "translateY(8px)",
										transition: `opacity 0.4s ease ${i * 50}ms, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)`,
									}}
									onMouseEnter={() => setHoveredStep(i)}
									onMouseLeave={() => setHoveredStep(null)}
								>
									{/* Connector line — between nodes, not through them */}
									{!isLast && (
										<div
											className="absolute pointer-events-none"
											style={{
												top: `${nodeSize / 2}px`,
												left: `calc(50% + ${nodeSize / 2 + 4}px)`,
												right: `calc(-50% + ${nodeSize / 2 + 4}px)`,
												height: "2px",
											}}
										>
											<div
												className="h-full w-full rounded-full"
												style={{
													background: `linear-gradient(90deg, ${color}50, ${STEP_COLORS[steps[i + 1]?.name] ?? "var(--accent-primary)"}50)`,
													opacity: mounted ? 1 : 0,
													transition: `opacity 0.6s ease ${i * 50 + 200}ms`,
												}}
											/>
										</div>
									)}

									{/* Node circle */}
									<div
										className="relative flex items-center justify-center rounded-xl cursor-default z-10"
										style={{
											width: `${nodeSize}px`,
											height: `${nodeSize}px`,
											background: isHovered ? `${color}18` : `${color}08`,
											border: `1.5px solid ${isHovered ? `${color}60` : `${color}25`}`,
											boxShadow: isHovered
												? `0 0 24px ${color}25, 0 6px 16px ${color}12`
												: "0 2px 8px rgba(0,0,0,0.15)",
											transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
										}}
									>
										<Icon
											size={iconSize}
											style={{
												color,
												opacity: isHovered ? 1 : 0.75,
												transition: "opacity 0.2s, transform 0.3s",
												transform: isHovered ? "scale(1.1)" : "scale(1)",
											}}
										/>
										{isHovered && (
											<div
												className="absolute inset-[-3px] rounded-xl pointer-events-none"
												style={{
													border: `1px solid ${color}20`,
													animation: "pipeline-pulse 1.8s ease-in-out infinite",
												}}
											/>
										)}
									</div>

									{/* Label */}
									<div className="mt-2.5 flex flex-col items-center gap-0.5 w-full px-0.5">
										<span
											className="font-mono text-[9px] font-medium text-center leading-tight truncate w-full"
											style={{
												color: isHovered ? color : "var(--text-tertiary)",
												transition: "color 0.2s",
											}}
										>
											{step.label || step.name}
										</span>
										<span
											className="text-[8px] font-mono tabular-nums"
											style={{ color: "var(--text-muted)" }}
										>
											{String(i + 1).padStart(2, "0")}
										</span>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			<style>{`
				@keyframes pipeline-pulse {
					0%, 100% { opacity: 0.6; transform: scale(1); }
					50% { opacity: 0; transform: scale(1.15); }
				}
			`}</style>
		</div>
	);
}

export function WorkflowConfigPanel() {
	const { selectedProjectId, activeWorkflow, setActiveWorkflow, setWorkflows } = useStore();
	const [steps, setSteps] = useState<WorkflowStep[]>([]);
	const [showTemplates, setShowTemplates] = useState(false);
	const [showEditor, setShowEditor] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [dirty, setDirty] = useState(false);
	const [hoveredStep, setHoveredStep] = useState<number | null>(null);

	useEffect(() => {
		if (selectedProjectId) {
			api.workflows.getProjectWorkflow(selectedProjectId).then((w) => {
				setActiveWorkflow(w);
				setSteps(w.steps);
			}).catch(() => {});
		}
	}, [selectedProjectId, setActiveWorkflow]);

	const matchedTemplate = WORKFLOW_TEMPLATES.find(
		(t) =>
			t.steps.length === steps.length &&
			t.steps.every((s, i) => s.name === steps[i]?.name),
	);

	function handleTemplateSelect(template: WorkflowTemplate) {
		setSteps(template.steps);
		setShowTemplates(false);
		setDirty(true);
	}

	function handleStepsChange(newSteps: WorkflowStep[]) {
		setSteps(newSteps);
		setDirty(true);
	}

	async function handleSave() {
		if (!selectedProjectId) return;
		setSaving(true);
		setError(null);

		try {
			for (const step of steps) {
				if (!step.name.trim() || !step.label.trim()) {
					setError("All steps must have a name and label");
					setSaving(false);
					return;
				}
			}

			const uniqueNames = new Set(steps.map((s) => s.name));
			if (uniqueNames.size !== steps.length) {
				setError("Step names must be unique");
				setSaving(false);
				return;
			}

			if (activeWorkflow && !activeWorkflow.is_default) {
				await api.workflows.update(activeWorkflow.id, {
					name: matchedTemplate?.name ?? "Custom Workflow",
					description: matchedTemplate?.description,
					steps,
				});
			} else {
				const created = await api.workflows.create({
					projectId: selectedProjectId,
					name: matchedTemplate?.name ?? "Custom Workflow",
					description: matchedTemplate?.description,
					steps,
				});
				await api.workflows.assignToProject(selectedProjectId, created.id);
				setActiveWorkflow(created);
			}

			const workflows = await api.workflows.list(selectedProjectId);
			setWorkflows(workflows);
			setDirty(false);
		} catch (err: any) {
			setError(err.message ?? "Failed to save");
		} finally {
			setSaving(false);
		}
	}

	async function handleReset() {
		if (!selectedProjectId) return;
		try {
			await api.workflows.assignToProject(selectedProjectId, "default");
			const w = await api.workflows.getProjectWorkflow(selectedProjectId);
			setActiveWorkflow(w);
			setSteps(w.steps);
			setDirty(false);
		} catch {}
	}

	return (
		<div className="workflow-config-panel rounded-xl border overflow-hidden" style={{ borderColor: "var(--border-default)" }}>
			{/* Atmospheric background */}
			<div className="relative" style={{ background: "linear-gradient(135deg, var(--bg-elevated) 0%, rgba(91, 155, 213, 0.03) 50%, var(--bg-elevated) 100%)" }}>
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4">
					<div className="flex items-center gap-3">
						<div
							className="flex h-8 w-8 items-center justify-center rounded-lg"
							style={{
								background: "linear-gradient(135deg, rgba(91, 155, 213, 0.15), rgba(167, 139, 250, 0.1))",
								border: "1px solid rgba(91, 155, 213, 0.2)",
							}}
						>
							<Layers size={14} style={{ color: "var(--cyan-400)" }} />
						</div>
						<div>
							<h3 className="text-sm font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
								Pipeline
							</h3>
							<p className="font-mono text-[10px] uppercase tracking-wider mt-0.5" style={{ color: "var(--text-muted)" }}>
								{matchedTemplate?.name ?? "Custom"} · {steps.length} stages
							</p>
						</div>
					</div>
					<div className="flex items-center gap-1.5">
						<button
							onClick={() => { setShowTemplates(!showTemplates); setShowEditor(false); }}
							className="rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all hover:bg-[var(--bg-surface-hover)]"
							style={{
								color: showTemplates ? "var(--cyan-400)" : "var(--text-tertiary)",
								background: showTemplates ? "rgba(91, 155, 213, 0.08)" : undefined,
							}}
						>
							Templates
						</button>
						<button
							onClick={() => { setShowEditor(!showEditor); setShowTemplates(false); }}
							className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all hover:bg-[var(--bg-surface-hover)]"
							style={{
								color: showEditor ? "var(--cyan-400)" : "var(--text-tertiary)",
								background: showEditor ? "rgba(91, 155, 213, 0.08)" : undefined,
							}}
						>
							{showEditor ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
							Edit
						</button>
					</div>
				</div>

				{/* Pipeline visualization */}
				{!showEditor && !showTemplates && steps.length > 0 && (
					<PipelineVisualization
						steps={steps}
						hoveredStep={hoveredStep}
						setHoveredStep={setHoveredStep}
					/>
				)}
			</div>

			{/* Template selector */}
			{showTemplates && (
				<div className="border-t px-5 py-4" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}>
					<WorkflowTemplateSelector
						selected={matchedTemplate?.id ?? null}
						onSelect={handleTemplateSelect}
					/>
				</div>
			)}

			{/* Step editor */}
			{showEditor && (
				<div className="border-t px-5 py-4 space-y-3" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}>
					<WorkflowStepList steps={steps} onChange={handleStepsChange} />

					{error && (
						<p className="text-xs rounded-lg px-3 py-2" style={{ background: "var(--rose-glow)", color: "var(--rose-400)" }}>
							{error}
						</p>
					)}

					<div className="flex items-center justify-between pt-1">
						<button
							onClick={handleReset}
							className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-[var(--bg-surface-hover)]"
							style={{ color: "var(--text-tertiary)" }}
						>
							<RotateCcw size={11} /> Reset to Default
						</button>
						{dirty && (
							<button
								onClick={handleSave}
								disabled={saving || steps.length === 0}
								className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50"
								style={{ background: "var(--accent-primary)" }}
							>
								<Save size={11} /> {saving ? "Saving..." : "Save"}
							</button>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
