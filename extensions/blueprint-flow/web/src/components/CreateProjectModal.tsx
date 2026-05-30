import {
	ArrowLeft,
	ArrowRight,
	CheckCircle,
	FolderPlus,
	Loader2,
	Sparkles,
} from "lucide-react";
import { useState } from "react";
import type { AgentRunSettingsPayload } from "../lib/api";
import { api } from "../lib/api";
import { useStore } from "../store";
import { AgentRunSettingsPanel } from "./AgentRunSettingsPanel";
import { BlueprintModal } from "./BlueprintModal";

type WizardStep = "details" | "settings" | "creating" | "complete";

export function CreateProjectModal() {
	const { closeModal, setProjects, selectProject } = useStore();
	const [wizardStep, setWizardStep] = useState<WizardStep>("details");
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [repoPath, setRepoPath] = useState("");
	const [stack, setStack] = useState("");
	const [settings, setSettings] = useState<AgentRunSettingsPayload>({
		effortLevel: "balanced",
		executionMode: "draft",
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [createdName, setCreatedName] = useState("");

	async function handleCreate() {
		if (!name.trim()) return;

		setLoading(true);
		setError(null);
		setWizardStep("creating");

		try {
			const project = await api.projects.create({
				name: name.trim(),
				description: description.trim() || undefined,
				repoPath: repoPath.trim() || undefined,
				stack: stack.trim()
					? stack.split(",").map((s) => s.trim()).filter(Boolean)
					: undefined,
			});

			const projects = await api.projects.list();
			setProjects(projects);
			selectProject(project.id);
			setCreatedName(project.name);
			setWizardStep("complete");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create project");
			setWizardStep("details");
		} finally {
			setLoading(false);
		}
	}

	function getTitle() {
		switch (wizardStep) {
			case "details":
				return "New Project — Details";
			case "settings":
				return "New Project — Agent Settings";
			case "creating":
				return "New Project — Creating...";
			case "complete":
				return "New Project — Ready";
		}
	}

	function getFooter() {
		switch (wizardStep) {
			case "details":
				return (
					<div className="flex justify-between">
						<button
							type="button"
							onClick={closeModal}
							className="rounded px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-300"
						>
							Cancel
						</button>
						<div className="flex gap-2">
							<button
								onClick={() => setWizardStep("settings")}
								className="rounded px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-300"
							>
								Settings
							</button>
							<button
								onClick={handleCreate}
								disabled={!name.trim() || loading}
								className="flex items-center gap-1.5 rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Create <ArrowRight size={14} />
							</button>
						</div>
					</div>
				);
			case "settings":
				return (
					<div className="flex justify-between">
						<button
							onClick={() => setWizardStep("details")}
							className="flex items-center gap-1 rounded px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-300"
						>
							<ArrowLeft size={14} /> Back
						</button>
						<button
							onClick={() => setWizardStep("details")}
							className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
						>
							Apply Settings
						</button>
					</div>
				);
			case "creating":
				return null;
			case "complete":
				return (
					<div className="flex justify-end">
						<button
							onClick={closeModal}
							className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
						>
							Get Started
						</button>
					</div>
				);
		}
	}

	return (
		<BlueprintModal
			open
			onClose={closeModal}
			title={getTitle()}
			icon={<FolderPlus size={16} className="text-blue-400" />}
			footer={getFooter()}
			preventOutsideClose={wizardStep === "creating"}
		>
			{/* Step indicator */}
			<div className="flex items-center gap-2 mb-4">
				{(["details", "complete"] as const).map((step, i) => (
					<div key={step} className="flex items-center gap-2">
						{i > 0 && <div className="h-px w-6 bg-gray-700" />}
						<div
							className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${
								wizardStep === step || (wizardStep === "creating" && step === "details")
									? "bg-blue-900/30 text-blue-300"
									: wizardStep === "complete" && step === "details"
										? "bg-emerald-900/30 text-emerald-400"
										: "bg-gray-800 text-gray-500"
							}`}
						>
							{wizardStep === "complete" && step === "details" ? (
								<CheckCircle size={10} />
							) : (
								<span>{i + 1}</span>
							)}
							{step === "details" ? "Details" : "Done"}
						</div>
					</div>
				))}
			</div>

			{/* Wizard content */}
			{wizardStep === "details" && (
				<form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-3">
					<div>
						<label className="mb-1 block text-xs font-medium text-gray-400">
							Name <span className="text-red-400">*</span>
						</label>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="my-project"
							autoFocus
							className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
						/>
					</div>

					<div>
						<label className="mb-1 block text-xs font-medium text-gray-400">
							Description
						</label>
						<input
							type="text"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Brief project description"
							className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
						/>
					</div>

					<div>
						<label className="mb-1 block text-xs font-medium text-gray-400">
							Repository Path
						</label>
						<input
							type="text"
							value={repoPath}
							onChange={(e) => setRepoPath(e.target.value)}
							placeholder="/path/to/repo"
							className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-mono text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
						/>
						<p className="mt-1 text-[10px] text-gray-600">
							Optional — link to an existing repository
						</p>
					</div>

					<div>
						<label className="mb-1 block text-xs font-medium text-gray-400">
							Stack <span className="text-gray-600">(comma-separated)</span>
						</label>
						<input
							type="text"
							value={stack}
							onChange={(e) => setStack(e.target.value)}
							placeholder="TypeScript, React, Node.js"
							className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
						/>
					</div>

					{error && (
						<p className="rounded bg-red-900/30 px-3 py-2 text-xs text-red-400">
							{error}
						</p>
					)}
				</form>
			)}

			{wizardStep === "settings" && (
				<div className="space-y-3">
					<p className="text-xs text-gray-400">
						Configure default agent settings for this project.
					</p>
					<AgentRunSettingsPanel value={settings} onChange={setSettings} />
				</div>
			)}

			{wizardStep === "creating" && (
				<div className="flex flex-col items-center justify-center py-10">
					<Loader2 size={32} className="animate-spin text-blue-400 mb-3" />
					<p className="text-sm text-gray-300">Creating project...</p>
					<p className="text-xs text-gray-500 mt-1">
						Initializing workflow and configuration
					</p>
				</div>
			)}

			{wizardStep === "complete" && (
				<div className="space-y-4">
					<div className="rounded border border-emerald-800/50 bg-emerald-950/30 p-3">
						<div className="flex items-center gap-2">
							<CheckCircle size={14} className="text-emerald-400" />
							<p className="text-sm font-medium text-emerald-300">
								Project "{createdName}" created successfully
							</p>
						</div>
					</div>

					<div className="rounded border border-gray-800 bg-gray-900/50 p-3">
						<h3 className="text-xs font-medium text-gray-300 mb-1.5 flex items-center gap-1.5">
							<Sparkles size={11} className="text-amber-400" />
							Next Steps
						</h3>
						<ul className="space-y-1 text-xs text-gray-400">
							<li className="flex items-start gap-1.5">
								<span className="text-gray-600 mt-0.5">1.</span>
								Create a feature to start working on this project
							</li>
							<li className="flex items-start gap-1.5">
								<span className="text-gray-600 mt-0.5">2.</span>
								Import an existing repo for deeper analysis
							</li>
							<li className="flex items-start gap-1.5">
								<span className="text-gray-600 mt-0.5">3.</span>
								Customize the workflow from the sidebar settings
							</li>
						</ul>
					</div>
				</div>
			)}
		</BlueprintModal>
	);
}
