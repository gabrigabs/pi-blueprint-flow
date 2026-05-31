import {
	BookOpen,
	CheckCircle,
	ChevronDown,
	ChevronUp,
	Code,
	Dumbbell,
	GitBranch,
	GraduationCap,
	Loader2,
	PenTool,
	Plus,
	Search,
	Wallet,
	Zap,
} from "lucide-react";
import { useState } from "react";
import {
	WORKFLOW_TEMPLATES,
	type WorkflowTemplate,
} from "../constants/workflow-templates";
import { api } from "../lib/api";
import { useStore } from "../store";
import { BlueprintModal } from "./BlueprintModal";

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
	code: Code,
	search: Search,
	dumbbell: Dumbbell,
	wallet: Wallet,
	"pen-tool": PenTool,
	"graduation-cap": GraduationCap,
	zap: Zap,
	plus: Plus,
};

const FLOW_TYPES = [
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
type WorkflowMode = "workspace" | "custom";

export function CreateFlowModal() {
	const {
		closeModal,
		selectedWorkspaceId,
		activeWorkflow,
		setFlows,
		selectFlow,
	} = useStore();
	const [modalState, setModalState] = useState<ModalState>("form");
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [workflowMode, setWorkflowMode] = useState<WorkflowMode>("workspace");
	const [customTemplate, setCustomTemplate] = useState<WorkflowTemplate | null>(
		null,
	);
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [type, setType] = useState("feature");
	const [priority, setPriority] = useState("medium");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [createdTitle, setCreatedTitle] = useState("");

	const workflowName =
		workflowMode === "workspace"
			? (activeWorkflow?.name ?? "Default")
			: (customTemplate?.name ?? "None selected");

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

			if (
				workflowMode === "custom" &&
				customTemplate &&
				customTemplate.steps.length > 0
			) {
				const workflow = await api.workflows.create({
					workspaceId: selectedWorkspaceId,
					name: `${flow.title} — ${customTemplate.name}`,
					description: customTemplate.description,
					steps: customTemplate.steps,
				});
				await api.workflows.assignToWorkspace(selectedWorkspaceId, workflow.id);
			}

			const flows = await api.flows.list(selectedWorkspaceId);
			setFlows(flows);
			selectFlow(flow.id);
			setCreatedTitle(flow.title);
			setModalState("success");

			setTimeout(() => closeModal(), 1000);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create flow");
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
					? "Creating Flow..."
					: modalState === "success"
						? "Flow Created"
						: "New Flow"
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
							type="button"
							onClick={() => handleSubmit()}
							disabled={!title.trim() || loading}
							className="rounded-lg px-4 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-40"
							style={{ background: "var(--accent-success)" }}
						>
							Create Flow
						</button>
					</div>
				) : null
			}
		>
			{modalState === "form" && (
				<form onSubmit={handleSubmit} className="space-y-4">
					<label className="block">
						<span
							className="mb-1.5 block text-xs font-medium"
							style={{ color: "var(--text-secondary)" }}
						>
							Title
						</span>
						<input
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="What do you want to accomplish?"
							className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
							style={{
								borderColor: "var(--border-default)",
								background: "var(--bg-surface)",
								color: "var(--text-primary)",
							}}
						/>
					</label>

					<label className="block">
						<span
							className="mb-1.5 block text-xs font-medium"
							style={{ color: "var(--text-secondary)" }}
						>
							Description
							<span
								className="ml-1.5 font-normal"
								style={{ color: "var(--text-muted)" }}
							>
								optional
							</span>
						</span>
						<textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Brief context or goals..."
							rows={2}
							className="w-full resize-none rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
							style={{
								borderColor: "var(--border-default)",
								background: "var(--bg-surface)",
								color: "var(--text-primary)",
							}}
						/>
					</label>

					{/* Workflow mode toggle */}
					<div
						className="rounded-lg border p-3"
						style={{
							borderColor: "var(--border-subtle)",
							background: "var(--bg-elevated)",
						}}
					>
						<div className="flex items-center gap-3 mb-2">
							<span
								className="text-xs font-medium"
								style={{ color: "var(--text-secondary)" }}
							>
								Workflow
							</span>
							<div
								className="flex rounded-md border"
								style={{ borderColor: "var(--border-default)" }}
							>
								<button
									type="button"
									onClick={() => setWorkflowMode("workspace")}
									className="px-2.5 py-1 text-[11px] font-medium rounded-l-md transition-colors"
									style={{
										background:
											workflowMode === "workspace"
												? "var(--bg-surface-hover)"
												: "transparent",
										color:
											workflowMode === "workspace"
												? "var(--text-primary)"
												: "var(--text-muted)",
									}}
								>
									Workspace Default
								</button>
								<button
									type="button"
									onClick={() => setWorkflowMode("custom")}
									className="px-2.5 py-1 text-[11px] font-medium rounded-r-md transition-colors"
									style={{
										background:
											workflowMode === "custom"
												? "var(--bg-surface-hover)"
												: "transparent",
										color:
											workflowMode === "custom"
												? "var(--text-primary)"
												: "var(--text-muted)",
										borderLeft: "1px solid var(--border-default)",
									}}
								>
									Custom
								</button>
							</div>
							<span
								className="font-mono text-[10px]"
								style={{ color: "var(--text-muted)" }}
							>
								{workflowName}
							</span>
						</div>

						{workflowMode === "custom" && (
							<div className="grid grid-cols-2 gap-2 mt-3">
								{WORKFLOW_TEMPLATES.filter((t) => t.id !== "blank").map(
									(template) => {
										const Icon = TEMPLATE_ICONS[template.icon] ?? BookOpen;
										const isSelected = customTemplate?.id === template.id;

										return (
											<button
												key={template.id}
												type="button"
												onClick={() => setCustomTemplate(template)}
												className="flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all"
												style={{
													borderColor: isSelected
														? template.color
														: "var(--border-default)",
													background: isSelected
														? `color-mix(in srgb, ${template.color} 6%, transparent)`
														: "transparent",
												}}
											>
												<div
													className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
													style={{
														background: `color-mix(in srgb, ${template.color} 12%, transparent)`,
														color: template.color,
													}}
												>
													<Icon size={12} />
												</div>
												<div className="min-w-0">
													<p
														className="text-[11px] font-medium truncate"
														style={{
															color: isSelected
																? template.color
																: "var(--text-primary)",
														}}
													>
														{template.name}
													</p>
													<p
														className="text-[10px] truncate"
														style={{ color: "var(--text-muted)" }}
													>
														{template.steps.length} steps
													</p>
												</div>
											</button>
										);
									},
								)}
							</div>
						)}
					</div>

					{/* Advanced section */}
					<div
						className="rounded-lg border"
						style={{ borderColor: "var(--border-subtle)" }}
					>
						<button
							type="button"
							onClick={() => setShowAdvanced(!showAdvanced)}
							className="flex w-full items-center justify-between px-3 py-2"
						>
							<span
								className="text-[11px] font-medium"
								style={{ color: "var(--text-muted)" }}
							>
								Advanced
							</span>
							{showAdvanced ? (
								<ChevronUp size={12} style={{ color: "var(--text-muted)" }} />
							) : (
								<ChevronDown size={12} style={{ color: "var(--text-muted)" }} />
							)}
						</button>

						{showAdvanced && (
							<div
								className="grid grid-cols-2 gap-3 border-t px-3 py-3"
								style={{ borderColor: "var(--border-subtle)" }}
							>
								<label className="block">
									<span
										className="mb-1 block text-[11px]"
										style={{ color: "var(--text-muted)" }}
									>
										Type
									</span>
									<select
										value={type}
										onChange={(e) => setType(e.target.value)}
										className="w-full rounded-md border px-2 py-1.5 text-xs focus:outline-none"
										style={{
											borderColor: "var(--border-default)",
											background: "var(--bg-surface)",
											color: "var(--text-primary)",
										}}
									>
										{FLOW_TYPES.map((t) => (
											<option key={t.value} value={t.value}>
												{t.label}
											</option>
										))}
									</select>
								</label>
								<label className="block">
									<span
										className="mb-1 block text-[11px]"
										style={{ color: "var(--text-muted)" }}
									>
										Priority
									</span>
									<select
										value={priority}
										onChange={(e) => setPriority(e.target.value)}
										className="w-full rounded-md border px-2 py-1.5 text-xs focus:outline-none"
										style={{
											borderColor: "var(--border-default)",
											background: "var(--bg-surface)",
											color: "var(--text-primary)",
										}}
									>
										{PRIORITY_OPTIONS.map((p) => (
											<option key={p.value} value={p.value}>
												{p.label}
											</option>
										))}
									</select>
								</label>
							</div>
						)}
					</div>

					{error && (
						<p
							className="rounded-lg px-3 py-2 text-xs"
							style={{
								background: "var(--rose-glow)",
								color: "var(--rose-400)",
							}}
						>
							{error}
						</p>
					)}
				</form>
			)}

			{modalState === "creating" && (
				<div className="flex flex-col items-center justify-center py-10">
					<Loader2
						size={28}
						className="animate-spin mb-3"
						style={{ color: "var(--accent-success)" }}
					/>
					<p className="text-sm" style={{ color: "var(--text-primary)" }}>
						Creating flow and initializing steps...
					</p>
				</div>
			)}

			{modalState === "success" && (
				<div className="flex flex-col items-center justify-center py-10">
					<div
						className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
						style={{
							background: "var(--emerald-glow)",
							border: "1px solid rgba(107, 207, 127, 0.3)",
						}}
					>
						<CheckCircle size={22} style={{ color: "var(--emerald-400)" }} />
					</div>
					<p
						className="text-sm font-medium"
						style={{ color: "var(--emerald-400)" }}
					>
						"{createdTitle}" created
					</p>
				</div>
			)}
		</BlueprintModal>
	);
}
