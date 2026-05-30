import { ArrowLeft, CheckCircle, Download, FolderOpen, Loader2 } from "lucide-react";
import { useState } from "react";
import type { ImportResult } from "../../lib/api";
import { api } from "../../lib/api";
import { useStore } from "../../store";
import { type WorkflowTemplate } from "../../constants/workflow-templates";
import { WorkflowTemplateSelector } from "./WorkflowTemplateSelector";

type Step = "path" | "scanning" | "template" | "done";

interface Props {
	onBack: () => void;
}

export function ImportProjectFlow({ onBack }: Props) {
	const { closeModal, setProjects, selectProject } = useStore();
	const [step, setStep] = useState<Step>("path");
	const [repoPath, setRepoPath] = useState("");
	const [result, setResult] = useState<ImportResult | null>(null);
	const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function handleScan() {
		if (!repoPath.trim()) return;

		setStep("scanning");
		setError(null);

		try {
			const importResult = await api.projects.import({
				repoPath: repoPath.trim(),
				mode: "migrate_with_review",
			});

			setResult(importResult);

			if (importResult.projectId) {
				const projects = await api.projects.list();
				setProjects(projects);
				selectProject(importResult.projectId);
			}

			setStep("template");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Import failed");
			setStep("path");
		}
	}

	async function handleFinish() {
		if (!result?.projectId || !selectedTemplate) return;

		try {
			const workflow = await api.workflows.create({
				projectId: result.projectId,
				name: selectedTemplate.name,
				description: selectedTemplate.description,
				steps: selectedTemplate.steps,
			});
			await api.workflows.assignToProject(result.projectId, workflow.id);
		} catch {
			// Non-critical — project already created
		}

		setStep("done");
		setTimeout(() => closeModal(), 1200);
	}

	if (step === "scanning") {
		return (
			<div className="flex flex-col items-center justify-center py-12">
				<Loader2 size={28} className="animate-spin mb-3" style={{ color: "var(--amber-400)" }} />
				<p className="text-sm" style={{ color: "var(--text-primary)" }}>Scanning repository...</p>
				<p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
					Detecting stack, scripts, and structure
				</p>
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
					Project imported
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-5">
			{step === "path" && (
				<>
					<div>
						<label
							className="mb-1.5 flex items-center gap-1.5 text-xs font-medium"
							style={{ color: "var(--text-secondary)" }}
						>
							<FolderOpen size={12} />
							Repository Path
						</label>
						<input
							type="text"
							value={repoPath}
							onChange={(e) => setRepoPath(e.target.value)}
							placeholder="/path/to/existing/project"
							autoFocus
							className="w-full rounded-lg border px-3 py-2.5 text-sm font-mono focus:outline-none"
							style={{
								borderColor: "var(--border-default)",
								background: "var(--bg-surface)",
								color: "var(--text-primary)",
							}}
						/>
						<p className="mt-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
							Absolute path to the project root. Name will be auto-detected from the folder.
						</p>
					</div>

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
							onClick={onBack}
							className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-surface-hover)]"
							style={{ color: "var(--text-tertiary)" }}
						>
							<ArrowLeft size={14} /> Back
						</button>
						<button
							onClick={handleScan}
							disabled={!repoPath.trim()}
							className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-40"
							style={{ background: "var(--amber-400)" }}
						>
							<Download size={14} /> Scan & Import
						</button>
					</div>
				</>
			)}

			{step === "template" && result && (
				<>
					{/* Scan results summary */}
					<div
						className="rounded-lg border p-3"
						style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
					>
						<div className="flex items-center gap-2 mb-2">
							<CheckCircle size={14} style={{ color: "var(--emerald-400)" }} />
							<span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
								{result.projectName}
							</span>
						</div>
						<div className="flex flex-wrap gap-1.5">
							{[
								...result.stack.languages,
								...result.stack.frameworks,
							].slice(0, 8).map((item) => (
								<span
									key={item}
									className="rounded-md px-2 py-0.5 text-[11px] font-mono"
									style={{
										background: "var(--bg-elevated)",
										color: "var(--text-secondary)",
										border: "1px solid var(--border-subtle)",
									}}
								>
									{item}
								</span>
							))}
							<span className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
								{result.structure.totalFiles} files
							</span>
						</div>
					</div>

					<div>
						<h3
							className="text-sm font-medium mb-1"
							style={{ color: "var(--text-primary)" }}
						>
							Choose a workflow template
						</h3>
						<p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
							This defines the steps your features will follow.
						</p>
					</div>

					<WorkflowTemplateSelector
						selected={selectedTemplate?.id ?? null}
						onSelect={setSelectedTemplate}
					/>

					<div className="flex justify-end pt-2">
						<button
							onClick={handleFinish}
							disabled={!selectedTemplate}
							className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-40"
							style={{ background: "var(--accent-primary)" }}
						>
							Done
						</button>
					</div>
				</>
			)}
		</div>
	);
}
