import { GripVertical, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
	getSuggestionLabel,
	STEP_MODEL_SUGGESTIONS,
} from "../constants/model-suggestions";
import type { AgentConfigResponse, AgentModelInfo } from "../lib/api";
import { api } from "../lib/api";
import type { Workflow, WorkflowStep } from "../store";
import { useStore } from "../store";
import { ModelBadges } from "./ModelBadges";

export function WorkflowEditor() {
	const {
		selectedProjectId,
		activeWorkflow,
		setActiveWorkflow,
		setWorkflows,
		closeModal,
	} = useStore();
	const [steps, setSteps] = useState<WorkflowStep[]>([]);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [models, setModels] = useState<AgentModelInfo[]>([]);

	useEffect(() => {
		api.config
			.agent()
			.then((config) => setModels(config.models))
			.catch(() => {});
	}, []);

	useEffect(() => {
		if (selectedProjectId) {
			api.workflows
				.getProjectWorkflow(selectedProjectId)
				.then((w) => {
					setActiveWorkflow(w);
					setSteps(w.steps);
					setName(w.name);
					setDescription(w.description ?? "");
				})
				.catch(() => {});
		}
	}, [selectedProjectId, setActiveWorkflow]);

	const handleAddStep = () => {
		setSteps([...steps, { name: "", label: "", actionType: "run_step" }]);
	};

	const handleRemoveStep = (index: number) => {
		setSteps(steps.filter((_, i) => i !== index));
	};

	const handleStepChange = (
		index: number,
		field: keyof WorkflowStep,
		value: string | boolean,
	) => {
		setSteps(steps.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
	};

	const handleMoveStep = (from: number, to: number) => {
		if (to < 0 || to >= steps.length) return;
		const newSteps = [...steps];
		const [moved] = newSteps.splice(from, 1);
		newSteps.splice(to, 0, moved);
		setSteps(newSteps);
	};

	const handleSave = async () => {
		if (!selectedProjectId) return;
		setError(null);
		setSaving(true);

		try {
			// Validate
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
				// Update existing
				await api.workflows.update(activeWorkflow.id, {
					name,
					description,
					steps,
				});
			} else {
				// Create new project-specific workflow
				const created = await api.workflows.create({
					projectId: selectedProjectId,
					name: name || "Custom Workflow",
					description,
					steps,
				});
				await api.workflows.assignToProject(selectedProjectId, created.id);
				setActiveWorkflow(created);
			}

			// Refresh workflows list
			const workflows = await api.workflows.list(selectedProjectId);
			setWorkflows(workflows);
			closeModal();
		} catch (err: any) {
			setError(err.message ?? "Failed to save workflow");
		} finally {
			setSaving(false);
		}
	};

	const handleReset = async () => {
		if (!selectedProjectId) return;
		try {
			await api.workflows.assignToProject(selectedProjectId, "default");
			const w = await api.workflows.getProjectWorkflow(selectedProjectId);
			setActiveWorkflow(w);
			setSteps(w.steps);
			setName(w.name);
			setDescription(w.description ?? "");
		} catch {}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
			<div className="w-full max-w-2xl rounded-xl border border-white/[0.06] bg-zinc-900 shadow-2xl">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
					<div>
						<h2 className="text-base font-semibold text-zinc-100">
							Workflow Editor
						</h2>
						<p className="text-xs text-zinc-500 mt-0.5">
							Configure the step sequence for this project
						</p>
					</div>
					<button
						type="button"
						onClick={closeModal}
						className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
					>
						<X size={18} />
					</button>
				</div>

				{/* Body */}
				<div className="px-5 py-4 max-h-[60vh] overflow-y-auto space-y-4">
					{/* Name & Description */}
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500 mb-1">
								Name
							</label>
							<input
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="w-full rounded-lg border border-white/[0.06] bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-fuchsia-500/40 focus:outline-none"
								placeholder="Workflow name"
							/>
						</div>
						<div>
							<label className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500 mb-1">
								Description
							</label>
							<input
								type="text"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								className="w-full rounded-lg border border-white/[0.06] bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-fuchsia-500/40 focus:outline-none"
								placeholder="Optional description"
							/>
						</div>
					</div>

					{/* Steps */}
					<div>
						<div className="flex items-center justify-between mb-2">
							<label className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
								Steps ({steps.length})
							</label>
							<button
								type="button"
								onClick={handleAddStep}
								className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-fuchsia-400 hover:bg-fuchsia-950/30 transition-colors"
							>
								<Plus size={12} /> Add Step
							</button>
						</div>

						<div className="space-y-1.5">
							{steps.map((step, i) => (
								<div
									key={i}
									className="rounded-lg border border-white/[0.04] bg-zinc-800/30 px-2 py-1.5"
								>
									<div className="flex items-center gap-2">
										<div className="flex flex-col gap-0.5 text-zinc-600">
											<button
												type="button"
												onClick={() => handleMoveStep(i, i - 1)}
												className="hover:text-zinc-300 text-[10px] leading-none"
												disabled={i === 0}
											>
												▲
											</button>
											<button
												type="button"
												onClick={() => handleMoveStep(i, i + 1)}
												className="hover:text-zinc-300 text-[10px] leading-none"
												disabled={i === steps.length - 1}
											>
												▼
											</button>
										</div>

										<span className="text-[10px] text-zinc-600 w-5 text-center shrink-0">
											{i + 1}
										</span>

										<input
											type="text"
											value={step.name}
											onChange={(e) =>
												handleStepChange(
													i,
													"name",
													e.target.value.toLowerCase().replace(/\s+/g, "_"),
												)
											}
											className="w-28 rounded border border-white/[0.04] bg-zinc-900/50 px-2 py-1 text-xs text-zinc-300 font-mono focus:border-fuchsia-500/40 focus:outline-none"
											placeholder="step_name"
										/>

										<input
											type="text"
											value={step.label}
											onChange={(e) =>
												handleStepChange(i, "label", e.target.value)
											}
											className="flex-1 rounded border border-white/[0.04] bg-zinc-900/50 px-2 py-1 text-xs text-zinc-300 focus:border-fuchsia-500/40 focus:outline-none"
											placeholder="Display Label"
										/>

										<select
											value={step.actionType ?? "run_step"}
											onChange={(e) =>
												handleStepChange(i, "actionType", e.target.value)
											}
											className="w-32 rounded border border-white/[0.04] bg-zinc-900/50 px-2 py-1 text-xs text-zinc-400 focus:border-fuchsia-500/40 focus:outline-none"
										>
											<option value="run_step">Run Step</option>
											<option value="research">Research</option>
											<option value="interview">Interview</option>
											<option value="spec">Spec</option>
											<option value="ddd">DDD</option>
											<option value="behavior">Behavior</option>
											<option value="implementation_plan">Impl Plan</option>
											<option value="implementation">Implementation</option>
											<option value="review">Review</option>
											<option value="memory_update">Memory</option>
										</select>

										<button
											type="button"
											onClick={() => handleRemoveStep(i)}
											className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
										>
											<Trash2 size={12} />
										</button>
									</div>

									{/* Model & Thinking Level per step */}
									<div className="flex items-center gap-2 mt-1.5 ml-10 pl-1">
										<select
											value={step.modelId ?? ""}
											onChange={(e) =>
												handleStepChange(i, "modelId", e.target.value)
											}
											className="w-36 rounded border border-white/[0.04] bg-zinc-900/50 px-1.5 py-0.5 text-[10px] text-zinc-400 focus:border-fuchsia-500/40 focus:outline-none"
										>
											<option value="">
												{STEP_MODEL_SUGGESTIONS[step.name]
													? `auto (${getSuggestionLabel(STEP_MODEL_SUGGESTIONS[step.name].prefer)})`
													: "default model"}
											</option>
											{models.map((m) => (
												<option key={m.id} value={m.id}>
													{m.name}
												</option>
											))}
										</select>

										{step.modelId &&
											models.length > 0 &&
											(() => {
												const selected = models.find(
													(m) => m.id === step.modelId,
												);
												return selected ? (
													<ModelBadges model={selected} compact />
												) : null;
											})()}

										<select
											value={step.thinkingLevel ?? ""}
											onChange={(e) =>
												handleStepChange(i, "thinkingLevel", e.target.value)
											}
											className="w-24 rounded border border-white/[0.04] bg-zinc-900/50 px-1.5 py-0.5 text-[10px] text-zinc-400 focus:border-fuchsia-500/40 focus:outline-none"
										>
											<option value="">thinking: auto</option>
											<option value="off">off</option>
											<option value="minimal">minimal</option>
											<option value="low">low</option>
											<option value="medium">medium</option>
											<option value="high">high</option>
											<option value="xhigh">max</option>
										</select>

										{STEP_MODEL_SUGGESTIONS[step.name] && !step.modelId && (
											<span className="text-[9px] text-zinc-600 italic">
												{STEP_MODEL_SUGGESTIONS[step.name].reason}
											</span>
										)}
									</div>
								</div>
							))}
						</div>
					</div>

					{error && (
						<p className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded-lg px-3 py-2">
							{error}
						</p>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
					<button
						type="button"
						onClick={handleReset}
						className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
					>
						<RotateCcw size={12} /> Reset to Default
					</button>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={closeModal}
							className="rounded-lg px-4 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleSave}
							disabled={saving || steps.length === 0}
							className="flex items-center gap-1.5 rounded-lg bg-fuchsia-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							<Save size={12} /> {saving ? "Saving..." : "Save Workflow"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
