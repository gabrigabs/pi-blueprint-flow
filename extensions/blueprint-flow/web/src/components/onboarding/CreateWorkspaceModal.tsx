import {
	BookOpen,
	CheckCircle,
	Code,
	Dumbbell,
	FolderPlus,
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
} from "../../constants/workflow-templates";
import { api } from "../../lib/api";
import { useStore } from "../../store";
import { BlueprintModal } from "../BlueprintModal";

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

export function CreateWorkspaceModal() {
	const { closeModal, setWorkspaces, selectWorkspace } = useStore();
	const [modalState, setModalState] = useState<ModalState>("form");
	const [name, setName] = useState("");
	const [repoPath, setRepoPath] = useState("");
	const [selectedTemplate, setSelectedTemplate] =
		useState<WorkflowTemplate | null>(WORKFLOW_TEMPLATES[0]);
	const [error, setError] = useState<string | null>(null);

	async function handleCreate() {
		if (!name.trim()) return;

		setModalState("creating");
		setError(null);

		try {
			const workspace = await api.workspaces.create({
				name: name.trim(),
				repoPath: repoPath.trim() || undefined,
			});

			if (selectedTemplate && selectedTemplate.steps.length > 0) {
				const workflow = await api.workflows.create({
					workspaceId: workspace.id,
					name: selectedTemplate.name,
					description: selectedTemplate.description,
					steps: selectedTemplate.steps,
				});
				await api.workflows.assignToWorkspace(workspace.id, workflow.id);
			}

			const workspaces = await api.workspaces.list();
			setWorkspaces(workspaces);
			selectWorkspace(workspace.id);
			setModalState("success");

			setTimeout(() => closeModal(), 1000);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to create workspace",
			);
			setModalState("form");
		}
	}

	return (
		<BlueprintModal
			open
			onClose={closeModal}
			title={
				modalState === "creating"
					? "Creating Workspace..."
					: modalState === "success"
						? "Workspace Created"
						: "New Workspace"
			}
			icon={<FolderPlus size={16} style={{ color: "var(--accent-primary)" }} />}
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
							onClick={handleCreate}
							disabled={!name.trim()}
							className="rounded-lg px-4 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-40"
							style={{ background: "var(--accent-primary)" }}
						>
							Create Workspace
						</button>
					</div>
				) : null
			}
		>
			{modalState === "form" && (
				<FormContent
					name={name}
					setName={setName}
					repoPath={repoPath}
					setRepoPath={setRepoPath}
					selectedTemplate={selectedTemplate}
					setSelectedTemplate={setSelectedTemplate}
					error={error}
				/>
			)}

			{modalState === "creating" && (
				<div className="flex flex-col items-center justify-center py-10">
					<Loader2
						size={28}
						className="animate-spin mb-3"
						style={{ color: "var(--accent-primary)" }}
					/>
					<p className="text-sm" style={{ color: "var(--text-primary)" }}>
						Creating workspace and initializing workflow...
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
						Workspace ready
					</p>
				</div>
			)}
		</BlueprintModal>
	);
}

function FormContent({
	name,
	setName,
	repoPath,
	setRepoPath,
	selectedTemplate,
	setSelectedTemplate,
	error,
}: {
	name: string;
	setName: (v: string) => void;
	repoPath: string;
	setRepoPath: (v: string) => void;
	selectedTemplate: WorkflowTemplate | null;
	setSelectedTemplate: (t: WorkflowTemplate) => void;
	error: string | null;
}) {
	return (
		<div className="space-y-5">
			<div className="grid grid-cols-2 gap-3">
				<label className="block">
					<span
						className="mb-1.5 block text-xs font-medium"
						style={{ color: "var(--text-secondary)" }}
					>
						Workspace Name
					</span>
					<input
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="My Workflow Space"
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
						Repository Path
						<span
							className="ml-1.5 font-normal"
							style={{ color: "var(--text-muted)" }}
						>
							optional
						</span>
					</span>
					<input
						type="text"
						value={repoPath}
						onChange={(e) => setRepoPath(e.target.value)}
						placeholder="/path/to/repo"
						className="w-full rounded-lg border px-3 py-2.5 text-sm font-mono focus:outline-none"
						style={{
							borderColor: "var(--border-default)",
							background: "var(--bg-surface)",
							color: "var(--text-primary)",
						}}
					/>
				</label>
			</div>

			<div>
				<h3
					className="text-xs font-medium mb-3"
					style={{ color: "var(--text-secondary)" }}
				>
					Workflow Template
				</h3>
				<TemplateGrid
					selectedTemplate={selectedTemplate}
					onSelect={setSelectedTemplate}
				/>
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
		</div>
	);
}

function TemplateGrid({
	selectedTemplate,
	onSelect,
}: {
	selectedTemplate: WorkflowTemplate | null;
	onSelect: (t: WorkflowTemplate) => void;
}) {
	return (
		<div className="grid grid-cols-2 gap-2.5">
			{WORKFLOW_TEMPLATES.map((template) => {
				const Icon = TEMPLATE_ICONS[template.icon] ?? BookOpen;
				const isSelected = selectedTemplate?.id === template.id;
				const isBlank = template.id === "blank";

				return (
					<button
						key={template.id}
						type="button"
						onClick={() => onSelect(template)}
						className="group relative rounded-xl border p-3.5 text-left transition-all"
						style={{
							borderColor: isSelected
								? template.color
								: "var(--border-default)",
							background: isSelected
								? `color-mix(in srgb, ${template.color} 6%, var(--bg-surface))`
								: "var(--bg-surface)",
							borderStyle: isBlank ? "dashed" : "solid",
						}}
					>
						{isSelected && (
							<div
								className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full"
								style={{ background: template.color }}
							>
								<CheckCircle size={10} className="text-white" />
							</div>
						)}

						<div className="flex items-start gap-3">
							<div
								className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
								style={{
									background: `color-mix(in srgb, ${template.color} 12%, transparent)`,
									color: template.color,
								}}
							>
								<Icon size={15} />
							</div>
							<div className="min-w-0 flex-1">
								<p
									className="text-sm font-medium truncate"
									style={{
										color: isSelected ? template.color : "var(--text-primary)",
									}}
								>
									{template.name}
								</p>
								<p
									className="text-[11px] mt-0.5 line-clamp-2 leading-relaxed"
									style={{ color: "var(--text-tertiary)" }}
								>
									{template.description}
								</p>
							</div>
						</div>

						{template.steps.length > 0 && (
							<div className="mt-2.5 flex items-center gap-1 pl-11">
								{template.steps.map((step, i) => (
									<div key={step.name} className="flex items-center gap-1">
										{i > 0 && (
											<div
												className="h-px w-1.5"
												style={{
													background: "var(--border-default)",
												}}
											/>
										)}
										<div
											className="h-1.5 w-1.5 rounded-full"
											style={{
												background: isSelected
													? template.color
													: "var(--text-muted)",
												opacity: step.type === "manual" ? 0.5 : 1,
											}}
											title={`${step.label} (${step.type ?? "agent"})`}
										/>
									</div>
								))}
								<span
									className="ml-1 font-mono text-[9px]"
									style={{ color: "var(--text-muted)" }}
								>
									{template.steps.length}
								</span>
							</div>
						)}
					</button>
				);
			})}
		</div>
	);
}
