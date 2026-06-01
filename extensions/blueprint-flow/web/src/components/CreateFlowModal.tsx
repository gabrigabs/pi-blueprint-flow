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
			if (
				workflowMode === "custom" &&
				customTemplate &&
				customTemplate.steps.length > 0
			) {
				const workflow = await api.workflows.create({
					workspaceId: selectedWorkspaceId,
					name: `${title.trim()} — ${customTemplate.name}`,
					description: customTemplate.description,
					steps: customTemplate.steps,
				});
				await api.workflows.assignToWorkspace(selectedWorkspaceId, workflow.id);
			}

			const flow = await api.flows.create(selectedWorkspaceId, {
				title: title.trim(),
				description: goal.trim() || undefined,
			});

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
			width="lg"
			preventOutsideClose={modalState === "creating"}
			footer={
				modalState === "form" ? (
					<div className="flex items-center justify-between">
						<span
							className="text-[11px]"
							style={{ color: "var(--text-muted)" }}
						>
							{workflowMode === "custom" && customTemplate
								? `${customTemplate.steps.length} steps`
								: activeWorkflow
									? `${activeWorkflow.steps.length} steps`
									: ""}
						</span>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={closeModal}
								className="rounded-lg px-3.5 py-2 text-[13px] transition-colors hover:bg-[var(--bg-surface-hover)]"
								style={{ color: "var(--text-tertiary)" }}
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={() => handleSubmit()}
								disabled={!title.trim() || loading}
								className="rounded-lg px-5 py-2 text-[13px] font-medium text-white transition-all disabled:opacity-40 active:scale-[0.97]"
								style={{
									background: "var(--accent-success)",
									boxShadow:
										"0 2px 8px rgba(107, 207, 127, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
								}}
							>
								Create Flow
							</button>
						</div>
					</div>
				) : null
			}
		>
			{modalState === "form" && (
				<form onSubmit={handleSubmit} className="space-y-5">
					{/* Title */}
					<label className="block">
						<span
							className="section-label mb-2 block"
							style={{ color: "var(--text-secondary)" }}
						>
							Title
						</span>
						<input
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="What do you want to accomplish?"
							autoFocus
							className="w-full rounded-lg border px-3.5 py-2.5 text-[13px] focus:outline-none transition-all duration-150"
							style={{
								borderColor: "var(--border-default)",
								background: "var(--bg-base)",
								color: "var(--text-primary)",
								boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)",
							}}
							onFocus={(e) => {
								e.currentTarget.style.borderColor = "var(--accent-primary)";
								e.currentTarget.style.boxShadow =
									"inset 0 1px 3px rgba(0,0,0,0.2), 0 0 0 2px rgba(91, 155, 213, 0.1)";
							}}
							onBlur={(e) => {
								e.currentTarget.style.borderColor = "var(--border-default)";
								e.currentTarget.style.boxShadow =
									"inset 0 1px 3px rgba(0,0,0,0.2)";
							}}
						/>
					</label>

					{/* Goal / Context */}
					<label className="block">
						<span
							className="section-label mb-2 block"
							style={{ color: "var(--text-secondary)" }}
						>
							Goal or context
							<span
								className="ml-1.5 font-normal normal-case tracking-normal"
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
							className="w-full resize-none rounded-lg border px-3.5 py-2.5 text-[13px] focus:outline-none transition-all duration-150"
							style={{
								borderColor: "var(--border-default)",
								background: "var(--bg-base)",
								color: "var(--text-primary)",
								boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)",
							}}
							onFocus={(e) => {
								e.currentTarget.style.borderColor = "var(--accent-primary)";
								e.currentTarget.style.boxShadow =
									"inset 0 1px 3px rgba(0,0,0,0.2), 0 0 0 2px rgba(91, 155, 213, 0.1)";
							}}
							onBlur={(e) => {
								e.currentTarget.style.borderColor = "var(--border-default)";
								e.currentTarget.style.boxShadow =
									"inset 0 1px 3px rgba(0,0,0,0.2)";
							}}
						/>
					</label>

					{/* Workflow (collapsible) */}
					<div
						className="rounded-xl overflow-hidden transition-all duration-200"
						style={{
							border: "1px solid var(--border-subtle)",
							background: showWorkflow ? "var(--bg-surface)" : "transparent",
						}}
					>
						<button
							type="button"
							onClick={() => setShowWorkflow(!showWorkflow)}
							className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-[var(--bg-surface-hover)]"
						>
							<div className="flex items-center gap-2.5">
								<span
									className="section-label"
									style={{ color: "var(--text-secondary)" }}
								>
									Workflow
								</span>
								<span
									className="font-mono text-[10px] rounded-md px-2 py-0.5"
									style={{
										background: "var(--bg-elevated)",
										color: "var(--text-muted)",
										border: "1px solid var(--border-subtle)",
									}}
								>
									{workflowName}
								</span>
							</div>
							{showWorkflow ? (
								<ChevronUp size={13} style={{ color: "var(--text-muted)" }} />
							) : (
								<ChevronDown size={13} style={{ color: "var(--text-muted)" }} />
							)}
						</button>

						{showWorkflow && (
							<div
								className="px-4 pb-4 pt-1 space-y-3"
								style={{ borderTop: "1px solid var(--border-subtle)" }}
							>
								{/* Mode toggle */}
								<div
									className="inline-flex rounded-lg p-0.5"
									style={{
										background: "var(--bg-base)",
										border: "1px solid var(--border-subtle)",
									}}
								>
									{(["workspace", "custom"] as const).map((mode) => (
										<button
											key={mode}
											type="button"
											onClick={() => setWorkflowMode(mode)}
											className="rounded-md px-3 py-1.5 text-[11px] font-medium transition-all duration-150"
											style={{
												background:
													workflowMode === mode
														? "var(--bg-elevated)"
														: "transparent",
												color:
													workflowMode === mode
														? "var(--text-primary)"
														: "var(--text-muted)",
												boxShadow:
													workflowMode === mode
														? "0 1px 3px rgba(0,0,0,0.2)"
														: "none",
											}}
										>
											{mode === "workspace"
												? "Workspace Default"
												: "Custom Template"}
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
														className="group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all duration-150 active:scale-[0.98]"
														style={{
															borderColor: isSelected
																? template.color
																: "var(--border-subtle)",
															background: isSelected
																? `color-mix(in srgb, ${template.color} 5%, var(--bg-base))`
																: "var(--bg-base)",
															boxShadow: isSelected
																? `0 0 12px -4px color-mix(in srgb, ${template.color} 30%, transparent)`
																: "none",
														}}
													>
														<div
															className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-transform duration-150 group-hover:scale-105"
															style={{
																background: `color-mix(in srgb, ${template.color} 12%, transparent)`,
																border: `1px solid color-mix(in srgb, ${template.color} 20%, transparent)`,
																color: template.color,
															}}
														>
															<Icon size={13} />
														</div>
														<div className="min-w-0">
															<p
																className="text-[12px] font-medium truncate"
																style={{
																	color: isSelected
																		? template.color
																		: "var(--text-primary)",
																}}
															>
																{template.name}
															</p>
															<p
																className="text-[11px] truncate mt-0.5"
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
						<div
							className="flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-[12px]"
							style={{
								background: "rgba(231, 76, 60, 0.06)",
								border: "1px solid rgba(231, 76, 60, 0.2)",
								color: "var(--rose-400)",
							}}
						>
							{error}
						</div>
					)}
				</form>
			)}

			{modalState === "creating" && (
				<div className="flex flex-col items-center justify-center py-12">
					<div
						className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
						style={{
							background:
								"linear-gradient(135deg, rgba(107, 207, 127, 0.08) 0%, rgba(107, 207, 127, 0.02) 100%)",
							border: "1px solid rgba(107, 207, 127, 0.2)",
						}}
					>
						<Loader2
							size={20}
							className="animate-spin"
							style={{ color: "var(--accent-success)" }}
						/>
					</div>
					<p
						className="text-[13px] font-medium"
						style={{ color: "var(--text-secondary)" }}
					>
						Setting up your flow...
					</p>
				</div>
			)}

			{modalState === "success" && (
				<div className="flex flex-col items-center justify-center py-12 animate-scale-in">
					<div
						className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
						style={{
							background:
								"linear-gradient(135deg, rgba(107, 207, 127, 0.1) 0%, rgba(107, 207, 127, 0.03) 100%)",
							border: "1px solid rgba(107, 207, 127, 0.3)",
							boxShadow: "0 0 20px -4px rgba(107, 207, 127, 0.2)",
						}}
					>
						<CheckCircle size={20} style={{ color: "var(--emerald-400)" }} />
					</div>
					<p
						className="text-[13px] font-medium"
						style={{ color: "var(--emerald-400)" }}
					>
						"{createdTitle}" created
					</p>
				</div>
			)}
		</BlueprintModal>
	);
}
