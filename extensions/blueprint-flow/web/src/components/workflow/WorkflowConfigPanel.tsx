import { ChevronDown, ChevronUp, RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { WORKFLOW_TEMPLATES, type WorkflowTemplate } from "../../constants/workflow-templates";
import { api } from "../../lib/api";
import type { WorkflowStep } from "../../store";
import { useStore } from "../../store";
import { WorkflowStepList } from "./WorkflowStepList";
import { WorkflowTemplateSelector } from "../onboarding/WorkflowTemplateSelector";

export function WorkflowConfigPanel() {
	const { selectedProjectId, activeWorkflow, setActiveWorkflow, setWorkflows } = useStore();
	const [steps, setSteps] = useState<WorkflowStep[]>([]);
	const [showTemplates, setShowTemplates] = useState(false);
	const [showEditor, setShowEditor] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [dirty, setDirty] = useState(false);

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
		<div
			className="rounded-xl border"
			style={{ borderColor: "var(--border-default)", background: "var(--bg-elevated)" }}
		>
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3">
				<div>
					<h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
						Workflow
					</h3>
					<p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
						{matchedTemplate?.name ?? "Custom"} — {steps.length} steps
					</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={() => { setShowTemplates(!showTemplates); setShowEditor(false); }}
						className="rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-[var(--bg-surface-hover)]"
						style={{ color: "var(--text-tertiary)" }}
					>
						Change Template
					</button>
					<button
						onClick={() => { setShowEditor(!showEditor); setShowTemplates(false); }}
						className="rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-[var(--bg-surface-hover)]"
						style={{ color: "var(--text-tertiary)" }}
					>
						{showEditor ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
						<span className="ml-1">Customize</span>
					</button>
				</div>
			</div>

			{/* Step dots preview */}
			{!showEditor && !showTemplates && (
				<div className="px-4 pb-3">
					<div className="flex items-center gap-1.5 flex-wrap">
						{steps.map((step, i) => (
							<div key={step.name || i} className="flex items-center gap-1.5">
								{i > 0 && (
									<div className="h-px w-3" style={{ background: "var(--border-default)" }} />
								)}
								<div
									className="flex items-center gap-1 rounded-md px-1.5 py-0.5"
									style={{ background: "var(--bg-surface)" }}
								>
									<div
										className="h-1.5 w-1.5 rounded-full"
										style={{ background: "var(--accent-primary)" }}
									/>
									<span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
										{step.label || step.name}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Template selector */}
			{showTemplates && (
				<div className="border-t px-4 py-4" style={{ borderColor: "var(--border-subtle)" }}>
					<WorkflowTemplateSelector
						selected={matchedTemplate?.id ?? null}
						onSelect={handleTemplateSelect}
					/>
				</div>
			)}

			{/* Step editor */}
			{showEditor && (
				<div className="border-t px-4 py-4 space-y-3" style={{ borderColor: "var(--border-subtle)" }}>
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
