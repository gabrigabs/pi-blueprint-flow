import { CheckCircle, ChevronDown, ChevronUp, GitBranch, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { WORKFLOW_TEMPLATES, type WorkflowTemplate } from "../constants/workflow-templates";
import { api } from "../lib/api";
import type { WorkflowStep } from "../store";
import { useStore } from "../store";
import { BlueprintModal } from "./BlueprintModal";
import { WorkflowTemplateSelector } from "./onboarding/WorkflowTemplateSelector";

const FEATURE_TYPES = [
	{ value: "feature", label: "Feature" },
	{ value: "bugfix", label: "Bugfix" },
	{ value: "refactor", label: "Refactor" },
	{ value: "spike", label: "Spike" },
	{ value: "research", label: "Research" },
	{ value: "maintenance", label: "Maintenance" },
] as const;

const PRIORITY_OPTIONS = [
	{ value: "low", label: "Low" },
	{ value: "medium", label: "Medium" },
	{ value: "high", label: "High" },
] as const;

type ModalState = "form" | "creating" | "success";

export function CreateFeatureModal() {
	const { closeModal, selectedWorkspaceId, activeWorkflow, setFlows, selectFlow } = useStore();
	const [modalState, setModalState] = useState<ModalState>("form");
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [type, setType] = useState("feature");
	const [priority, setPriority] = useState("medium");
	const [showWorkflow, setShowWorkflow] = useState(false);
	const [workflowOverride, setWorkflowOverride] = useState<WorkflowTemplate | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [createdTitle, setCreatedTitle] = useState("");

	const currentSteps: WorkflowStep[] = workflowOverride?.steps ?? activeWorkflow?.steps ?? [];
	const currentTemplateName = workflowOverride?.name
		?? WORKFLOW_TEMPLATES.find(
			(t) =>
				activeWorkflow &&
				t.steps.length === activeWorkflow.steps.length &&
				t.steps.every((s, i) => s.name === activeWorkflow.steps[i]?.name),
		)?.name
		?? "Custom";

	async function handleSubmit(e?: React.FormEvent) {
		e?.preventDefault();
		if (!title.trim() || !selectedWorkspaceId) return;

		setLoading(true);
		setError(null);
		setModalState("creating");

		try {
			const flow = await api.flows.create(selectedWorkspaceId, {
				title: title.trim(),
				description: description.trim() || undefined,
				type,
				priority,
			});

			if (workflowOverride) {
				const workflow = await api.workflows.create({
					workspaceId: selectedWorkspaceId,
					name: `${flow.title} — ${workflowOverride.name}`,
					description: workflowOverride.description,
					steps: workflowOverride.steps,
				});
				await api.workflows.assignToWorkspace(selectedWorkspaceId, workflow.id);
			}

			const flows = await api.flows.list(selectedWorkspaceId);
			setFlows(flows);
			selectFlow(flow.id);
			setCreatedTitle(flow.title);
			setModalState("success");

			setTimeout(() => closeModal(), 1200);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create feature");
			setModalState("form");
		} finally {
			setLoading(false);
		}
	}

	return (
		<BlueprintModal
			open
			onClose={closeModal}
			title={
				modalState === "creating"
					? "Creating Feature..."
					: modalState === "success"
						? "Feature Created"
						: "New Feature"
			}
			icon={<GitBranch size={16} style={{ color: "var(--accent-success)" }} />}
			width="lg"
			preventOutsideClose={modalState === "creating"}
			footer={
				modalState === "form" ? (
					<div className="flex justify-end gap-2">
						<button
							type="button"
							onClick={closeModal}
							className="rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-[var(--bg-surface-hover)]"
							style={{ color: "var(--text-tertiary)" }}
						>
							Cancel
						</button>
						<button
							onClick={() => handleSubmit()}
							disabled={!title.trim() || loading}
							className="rounded-lg px-4 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-40"
							style={{ background: "var(--accent-success)" }}
						>
							Create
						</button>
					</div>
				) : null
			}
		>
			{modalState === "form" && (
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label
							className="mb-1.5 block text-xs font-medium"
							style={{ color: "var(--text-secondary)" }}
						>
							Title
						</label>
						<input
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Add user authentication with OAuth2"
							autoFocus
							className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
							style={{
								borderColor: "var(--border-default)",
								background: "var(--bg-surface)",
								color: "var(--text-primary)",
							}}
						/>
					</div>

					<div>
						<label
							className="mb-1.5 block text-xs font-medium"
							style={{ color: "var(--text-secondary)" }}
						>
							Description
							<span className="ml-1.5 font-normal" style={{ color: "var(--text-muted)" }}>
								optional
							</span>
						</label>
						<textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="What should this accomplish..."
							rows={2}
							className="w-full resize-none rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
							style={{
								borderColor: "var(--border-default)",
								background: "var(--bg-surface)",
								color: "var(--text-primary)",
							}}
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label
								className="mb-1.5 block text-xs font-medium"
								style={{ color: "var(--text-secondary)" }}
							>
								Type
							</label>
							<select
								value={type}
								onChange={(e) => setType(e.target.value)}
								className="w-full rounded-lg border px-2.5 py-2 text-sm focus:outline-none"
								style={{
									borderColor: "var(--border-default)",
									background: "var(--bg-surface)",
									color: "var(--text-primary)",
								}}
							>
								{FEATURE_TYPES.map((t) => (
									<option key={t.value} value={t.value}>{t.label}</option>
								))}
							</select>
						</div>
						<div>
							<label
								className="mb-1.5 block text-xs font-medium"
								style={{ color: "var(--text-secondary)" }}
							>
								Priority
							</label>
							<select
								value={priority}
								onChange={(e) => setPriority(e.target.value)}
								className="w-full rounded-lg border px-2.5 py-2 text-sm focus:outline-none"
								style={{
									borderColor: "var(--border-default)",
									background: "var(--bg-surface)",
									color: "var(--text-primary)",
								}}
							>
								{PRIORITY_OPTIONS.map((p) => (
									<option key={p.value} value={p.value}>{p.label}</option>
								))}
							</select>
						</div>
					</div>

					{/* Workflow section */}
					<div
						className="rounded-lg border"
						style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
					>
						<button
							type="button"
							onClick={() => setShowWorkflow(!showWorkflow)}
							className="flex w-full items-center justify-between px-3 py-2.5"
						>
							<div className="flex items-center gap-2">
								<span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
									Workflow
								</span>
								<span
									className="rounded-md px-2 py-0.5 text-[11px] font-mono"
									style={{ background: "var(--bg-surface)", color: "var(--text-tertiary)" }}
								>
									{currentTemplateName} ({currentSteps.length} steps)
								</span>
								{workflowOverride && (
									<span className="text-[10px]" style={{ color: "var(--amber-400)" }}>
										overridden
									</span>
								)}
							</div>
							{showWorkflow ? (
								<ChevronUp size={14} style={{ color: "var(--text-muted)" }} />
							) : (
								<ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
							)}
						</button>

						{showWorkflow && (
							<div className="border-t px-3 py-3" style={{ borderColor: "var(--border-subtle)" }}>
								<p className="text-xs mb-3" style={{ color: "var(--text-tertiary)" }}>
									Override the project workflow for this feature only.
								</p>
								<WorkflowTemplateSelector
									selected={workflowOverride?.id ?? null}
									onSelect={(t) => setWorkflowOverride(t)}
								/>
								{workflowOverride && (
									<button
										type="button"
										onClick={() => setWorkflowOverride(null)}
										className="mt-2 text-xs transition-colors hover:underline"
										style={{ color: "var(--text-tertiary)" }}
									>
										Use project default instead
									</button>
								)}
							</div>
						)}
					</div>

					{error && (
						<p
							className="rounded-lg px-3 py-2 text-xs"
							style={{ background: "var(--rose-glow)", color: "var(--rose-400)" }}
						>
							{error}
						</p>
					)}
				</form>
			)}

			{modalState === "creating" && (
				<div className="flex flex-col items-center justify-center py-10">
					<Loader2 size={28} className="animate-spin mb-3" style={{ color: "var(--accent-success)" }} />
					<p className="text-sm" style={{ color: "var(--text-primary)" }}>
						Creating feature and initializing steps...
					</p>
				</div>
			)}

			{modalState === "success" && (
				<div className="flex flex-col items-center justify-center py-10">
					<div
						className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
						style={{ background: "var(--emerald-glow)", border: "1px solid rgba(107, 207, 127, 0.3)" }}
					>
						<CheckCircle size={22} style={{ color: "var(--emerald-400)" }} />
					</div>
					<p className="text-sm font-medium" style={{ color: "var(--emerald-400)" }}>
						"{createdTitle}" created
					</p>
				</div>
			)}
		</BlueprintModal>
	);
}
