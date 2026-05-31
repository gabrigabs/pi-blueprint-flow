import { ArrowLeft, ArrowRight, CheckCircle, FolderPlus, Loader2 } from "lucide-react";
import { useState } from "react";
import { api } from "../../lib/api";
import { useStore } from "../../store";
import { type WorkflowTemplate } from "../../constants/workflow-templates";
import { WorkflowTemplateSelector } from "./WorkflowTemplateSelector";

type Step = "details" | "template" | "creating" | "done";

interface Props {
	onBack: () => void;
}

export function NewProjectFlow({ onBack }: Props) {
	const { closeModal, setWorkspaces, selectWorkspace } = useStore();
	const [step, setStep] = useState<Step>("details");
	const [name, setName] = useState("");
	const [repoPath, setRepoPath] = useState("");
	const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function handleCreate() {
		if (!name.trim()) return;

		setStep("creating");
		setError(null);

		try {
			const workspace = await api.workspaces.create({
				name: name.trim(),
				repoPath: repoPath.trim() || undefined,
			});

			if (selectedTemplate) {
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
			setStep("done");

			setTimeout(() => closeModal(), 1200);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create project");
			setStep("template");
		}
	}

	if (step === "creating") {
		return (
			<div className="flex flex-col items-center justify-center py-12">
				<Loader2 size={28} className="animate-spin mb-3" style={{ color: "var(--accent-primary)" }} />
				<p className="text-sm" style={{ color: "var(--text-primary)" }}>Creating project...</p>
			</div>
		);
	}

	if (step === "done") {
		return (
			<div className="flex flex-col items-center justify-center py-12">
				<div
					className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
					style={{ background: "var(--emerald-glow)", border: "1px solid rgba(107, 207, 127, 0.3)" }}
				>
					<CheckCircle size={22} style={{ color: "var(--emerald-400)" }} />
				</div>
				<p className="text-sm font-medium" style={{ color: "var(--emerald-400)" }}>
					Project created
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-5">
			{step === "details" && (
				<>
					<div>
						<label
							className="mb-1.5 block text-xs font-medium"
							style={{ color: "var(--text-secondary)" }}
						>
							Project Name
						</label>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="my-project"
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
							Repository Path
							<span className="ml-1.5 font-normal" style={{ color: "var(--text-muted)" }}>
								optional
							</span>
						</label>
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
					</div>

					<div className="flex justify-between pt-2">
						<button
							onClick={onBack}
							className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-surface-hover)]"
							style={{ color: "var(--text-tertiary)" }}
						>
							<ArrowLeft size={14} /> Back
						</button>
						<button
							onClick={() => setStep("template")}
							disabled={!name.trim()}
							className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-40"
							style={{ background: "var(--accent-primary)" }}
						>
							Next <ArrowRight size={14} />
						</button>
					</div>
				</>
			)}

			{step === "template" && (
				<>
					<div>
						<h3
							className="text-sm font-medium mb-1"
							style={{ color: "var(--text-primary)" }}
						>
							Choose a workflow template
						</h3>
						<p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
							This defines the steps your flows will follow. You can change it later.
						</p>
					</div>

					<WorkflowTemplateSelector
						selected={selectedTemplate?.id ?? null}
						onSelect={setSelectedTemplate}
					/>

					{error && (
						<p
							className="rounded-lg px-3 py-2 text-xs"
							style={{ background: "var(--rose-glow)", color: "var(--rose-400)" }}
						>
							{error}
						</p>
					)}

					<div className="flex justify-between pt-2">
						<button
							onClick={() => setStep("details")}
							className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-surface-hover)]"
							style={{ color: "var(--text-tertiary)" }}
						>
							<ArrowLeft size={14} /> Back
						</button>
						<button
							onClick={handleCreate}
							disabled={!selectedTemplate}
							className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-40"
							style={{ background: "var(--accent-primary)" }}
						>
							<FolderPlus size={14} /> Create Project
						</button>
					</div>
				</>
			)}
		</div>
	);
}
