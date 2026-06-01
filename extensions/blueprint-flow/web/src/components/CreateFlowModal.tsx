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
	const [goal, setGoal] = useState("");
	const [workflowMode, setWorkflowMode] = useState<WorkflowMode>("workspace");
	const [customTemplate, setCustomTemplate] = useState<WorkflowTemplate | null>(
		null,
	);
	const [showWorkflow, setShowWorkflow] = useState(false);
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
				description: goal.trim() || undefined,
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

			setTimeout(() => closeModal(), 900);
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
					? "Creating..."
					: modalState === "success"
						? "Flow Created"
						: "New Flow"
			}
			icon={<GitBranch size={16} style={{ color: "var(--accent-success)" }} />}
			width="md"
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
							className="rounded-lg px-4 py-1.5 text-sm font-medium text-white transition-all disabled:opacity-40 active:scale-[0.98]"
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
					{/* Title */}
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
							className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--border-accent)]"
							style={{
								borderColor: "var(--border-default)",
								background: "var(--bg-surface)",
								color: "var(--text-primary)",
								transition: "border-color 0.15s",
							}}
						/>
					</label>

					{/* Goal / Context */}
					<label className="block">
						<span
							className="mb-1.5 block text-xs font-medium"
							style={{ color: "var(--text-secondary)" }}
						>
							Goal or context
							<span
								className="ml-1.5 font-normal"
								style={{ color: "var(--text-muted)" }}
							>
								optional
							</span>
						</span>
						<textarea
							value={goal}
							onChange={(e) => setGoal(e.target.value)}
							placeholder="Describe what you're trying to achieve, any constraints, or relevant context..."
							rows={3}
							className="w-full resize-none rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--border-accent)]"
							style={{
								borderColor: "var(--border-default)",
								background: "var(--bg-surface)",
								color: "var(--text-primary)",
								transition: "border-color 0.15s",
							}}
						/>
					</label>

					{/* Workflow (collapsible) */}
					<div
						className="rounded-lg border overflow-hidden"
						style={{ borderColor: "var(--border-subtle)" }}
					>
						<button
							type="button"
							onClick={() => setShowWorkflow(!showWorkflow)}
							className="flex w-full items-center justify-between px-3 py-2.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
						>
							<div className="flex items-center gap-2">
								<span
									className="text-xs font-medium"
									style={{ color: "var(--text-secondary)" }}
								>
									Workflow
								</span>
								<span
									className="font-mono text-[10px] rounded px-1.5 py-0.5"
									style={{
										background: "var(--bg-surface)",
										color: "var(--text-muted)",
									}}
								>
									{workflowName}
								</span>
							</div>
							{showWorkflow ? (
								<ChevronUp size={12} style={{ color: "var(--text-muted)" }} />
							) : (
								<ChevronDown size={12} style={{ color: "var(--text-muted)" }} />
							)}
						</button>

						{showWorkflow && (
							<div
								className="border-t px-3 py-3 space-y-3"
								style={{ borderColor: "var(--border-subtle)" }}
							>
								{/* Mode toggle */}
								<div
									className="flex rounded-md border self-start"
									style={{ borderColor: "var(--border-default)" }}
								>
									{(["workspace", "custom"] as const).map((mode) => (
										<button
											key={mode}
											type="button"
											onClick={() => setWorkflowMode(mode)}
											className="px-3 py-1 text-[11px] font-medium transition-colors first:rounded-l-md last:rounded-r-md"
											style={{
												background:
													workflowMode === mode
														? "var(--bg-surface-hover)"
														: "transparent",
												color:
													workflowMode === mode
														? "var(--text-primary)"
														: "var(--text-muted)",
												borderLeft:
													mode === "custom"
														? "1px solid var(--border-default)"
														: undefined,
											}}
										>
											{mode === "workspace" ? "Workspace Default" : "Custom"}
										</button>
									))}
								</div>

								{workflowMode === "custom" && (
									<div className="grid grid-cols-2 gap-2">
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
						size={24}
						className="animate-spin mb-3"
						style={{ color: "var(--accent-success)" }}
					/>
					<p className="text-sm" style={{ color: "var(--text-secondary)" }}>
						Setting up your flow...
					</p>
				</div>
			)}

			{modalState === "success" && (
				<div className="flex flex-col items-center justify-center py-10">
					<div
						className="mb-3 flex h-11 w-11 items-center justify-center rounded-full"
						style={{
							background: "var(--emerald-glow)",
							border: "1px solid rgba(107, 207, 127, 0.3)",
						}}
					>
						<CheckCircle size={20} style={{ color: "var(--emerald-400)" }} />
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
