import {
	AlertTriangle,
	ArrowLeft,
	ArrowRight,
	CheckCircle,
	Download,
	FileSearch,
	FolderOpen,
	Loader2,
	Zap,
} from "lucide-react";
import { useState } from "react";
import type { AgentRunSettingsPayload, ImportResult } from "../lib/api";
import { api } from "../lib/api";
import { useStore } from "../store";
import { AgentRunSettingsPanel } from "./AgentRunSettingsPanel";
import { BlueprintModal } from "./BlueprintModal";

type WizardStep = "path" | "scanning" | "review" | "settings" | "complete";

export function ImportProjectModal() {
	const { closeModal, setProjects, selectProject } = useStore();
	const [wizardStep, setWizardStep] = useState<WizardStep>("path");
	const [repoPath, setRepoPath] = useState("");
	const [name, setName] = useState("");
	const [mode, setMode] = useState<"analyze_only" | "migrate_with_review">(
		"migrate_with_review",
	);
	const [settings, setSettings] = useState<AgentRunSettingsPayload>({
		effortLevel: "deep",
		executionMode: "review",
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<ImportResult | null>(null);

	async function handleScan() {
		if (!repoPath.trim()) return;
		setLoading(true);
		setError(null);
		setWizardStep("scanning");

		try {
			const importResult = await api.projects.import({
				repoPath: repoPath.trim(),
				name: name.trim() || undefined,
				mode,
				agentRunSettings: settings,
			});

			setResult(importResult);

			if (importResult.projectId) {
				const projects = await api.projects.list();
				setProjects(projects);
				selectProject(importResult.projectId);
			}

			setWizardStep("review");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Import failed");
			setWizardStep("path");
		} finally {
			setLoading(false);
		}
	}

	function getTitle() {
		switch (wizardStep) {
			case "path":
				return "Import Project — Choose Repository";
			case "scanning":
				return "Import Project — Scanning...";
			case "review":
				return "Import Project — Review Results";
			case "settings":
				return "Import Project — Agent Settings";
			case "complete":
				return "Import Project — Complete";
		}
	}

	function getFooter() {
		switch (wizardStep) {
			case "path":
				return (
					<div className="flex justify-between">
						<button
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
								onClick={handleScan}
								disabled={!repoPath.trim() || loading}
								className="flex items-center gap-1.5 rounded bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Scan & Import <ArrowRight size={14} />
							</button>
						</div>
					</div>
				);
			case "scanning":
				return null;
			case "review":
				return (
					<div className="flex justify-between">
						<button
							onClick={() => setWizardStep("path")}
							className="flex items-center gap-1 rounded px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-300"
						>
							<ArrowLeft size={14} /> Back
						</button>
						<button
							onClick={closeModal}
							className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
						>
							Done
						</button>
					</div>
				);
			case "settings":
				return (
					<div className="flex justify-between">
						<button
							onClick={() => setWizardStep("path")}
							className="flex items-center gap-1 rounded px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-300"
						>
							<ArrowLeft size={14} /> Back
						</button>
						<button
							onClick={() => setWizardStep("path")}
							className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
						>
							Apply Settings
						</button>
					</div>
				);
			default:
				return null;
		}
	}

	return (
		<BlueprintModal
			open
			onClose={closeModal}
			title={getTitle()}
			icon={<Download size={16} className="text-amber-400" />}
			width="lg"
			footer={getFooter()}
			preventOutsideClose={wizardStep === "scanning"}
		>
			{/* Step indicator */}
			<div className="flex items-center gap-2 mb-4">
				{(["path", "review"] as const).map((step, i) => (
					<div key={step} className="flex items-center gap-2">
						{i > 0 && <div className="h-px w-6 bg-gray-700" />}
						<div
							className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${
								wizardStep === step
									? "bg-amber-900/30 text-amber-300"
									: wizardStep === "review" && step === "path"
										? "bg-emerald-900/30 text-emerald-400"
										: "bg-gray-800 text-gray-500"
							}`}
						>
							{wizardStep === "review" && step === "path" ? (
								<CheckCircle size={10} />
							) : (
								<span>{i + 1}</span>
							)}
							{step === "path" ? "Path" : "Review"}
						</div>
					</div>
				))}
			</div>

			{/* Wizard content */}
			{wizardStep === "path" && (
				<PathStep
					repoPath={repoPath}
					setRepoPath={setRepoPath}
					name={name}
					setName={setName}
					mode={mode}
					setMode={setMode}
					error={error}
				/>
			)}

			{wizardStep === "scanning" && <ScanningStep />}

			{wizardStep === "review" && result && <ReviewStep result={result} />}

			{wizardStep === "settings" && (
				<SettingsStep settings={settings} setSettings={setSettings} />
			)}
		</BlueprintModal>
	);
}

// --- Wizard Steps ---

function PathStep({
	repoPath,
	setRepoPath,
	name,
	setName,
	mode,
	setMode,
	error,
}: {
	repoPath: string;
	setRepoPath: (v: string) => void;
	name: string;
	setName: (v: string) => void;
	mode: "analyze_only" | "migrate_with_review";
	setMode: (v: "analyze_only" | "migrate_with_review") => void;
	error: string | null;
}) {
	return (
		<div className="space-y-4">
			<div>
				<label className="mb-1 block text-xs font-medium text-gray-400">
					<FolderOpen size={12} className="inline mr-1" />
					Repository Path <span className="text-red-400">*</span>
				</label>
				<input
					type="text"
					value={repoPath}
					onChange={(e) => setRepoPath(e.target.value)}
					placeholder="/path/to/existing/project"
					autoFocus
					className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-mono text-gray-200 placeholder-gray-600 focus:border-amber-500 focus:outline-none"
				/>
				<p className="mt-1 text-[10px] text-gray-600">
					Absolute path to the project root directory
				</p>
			</div>

			<div>
				<label className="mb-1 block text-xs font-medium text-gray-400">
					Project Name{" "}
					<span className="text-gray-600">(auto-detected if empty)</span>
				</label>
				<input
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="auto-detect from folder name"
					className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
				/>
			</div>

			{/* Mode */}
			<div>
				<label className="mb-1.5 block text-xs font-medium text-gray-400">
					Import Mode
				</label>
				<div className="grid grid-cols-2 gap-2">
					<button
						type="button"
						onClick={() => setMode("analyze_only")}
						className={`rounded border p-2.5 text-left text-xs transition-colors ${
							mode === "analyze_only"
								? "border-blue-500/50 bg-blue-950/30 text-blue-300"
								: "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
						}`}
					>
						<FileSearch size={14} className="mb-1" />
						<span className="block font-medium">Analyze Only</span>
						<span className="mt-0.5 block text-gray-500">
							Scan and review without creating project
						</span>
					</button>
					<button
						type="button"
						onClick={() => setMode("migrate_with_review")}
						className={`rounded border p-2.5 text-left text-xs transition-colors ${
							mode === "migrate_with_review"
								? "border-emerald-500/50 bg-emerald-950/30 text-emerald-300"
								: "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
						}`}
					>
						<Zap size={14} className="mb-1" />
						<span className="block font-medium">Import & Review</span>
						<span className="mt-0.5 block text-gray-500">
							Create project + Pi agent analysis
						</span>
					</button>
				</div>
			</div>

			{error && (
				<p className="rounded bg-red-900/30 px-3 py-2 text-xs text-red-400">
					{error}
				</p>
			)}
		</div>
	);
}

function ScanningStep() {
	return (
		<div className="flex flex-col items-center justify-center py-8">
			<Loader2 size={32} className="animate-spin text-amber-400 mb-3" />
			<p className="text-sm text-gray-300">Scanning repository...</p>
			<p className="text-xs text-gray-500 mt-1">
				Detecting stack, scripts, and agentic files
			</p>
		</div>
	);
}

function ReviewStep({ result }: { result: ImportResult }) {
	return (
		<div className="space-y-4">
			{/* Status banner */}
			<div className="rounded border border-emerald-800/50 bg-emerald-950/30 p-3">
				<div className="flex items-center gap-2">
					<CheckCircle size={14} className="text-emerald-400" />
					<p className="text-sm font-medium text-emerald-300">
						{result.mode === "analyze_only"
							? "Analysis complete"
							: "Project imported successfully"}
					</p>
				</div>
				<p className="mt-1 text-xs text-gray-400 font-mono">
					{result.repoPath}
				</p>
			</div>

			{/* Stack */}
			<div>
				<h3 className="mb-1.5 text-xs font-medium text-gray-400">
					Detected Stack
				</h3>
				<div className="flex flex-wrap gap-1">
					{[
						...result.stack.languages,
						...result.stack.frameworks,
						...result.stack.buildTools,
						...result.stack.testFrameworks,
					].map((item) => (
						<span
							key={item}
							className="rounded bg-blue-900/30 border border-blue-800/30 px-2 py-0.5 text-xs text-blue-300"
						>
							{item}
						</span>
					))}
					{result.stack.languages.length === 0 && (
						<span className="text-xs text-gray-500">None detected</span>
					)}
				</div>
			</div>

			{/* Structure */}
			<div>
				<h3 className="mb-1 text-xs font-medium text-gray-400">Structure</h3>
				<p className="text-xs text-gray-300">
					{result.structure.totalFiles} files, {result.structure.directories}{" "}
					directories
					{result.structure.truncated && " (scan truncated)"}
				</p>
			</div>

			{/* Scripts */}
			{result.scripts.length > 0 && (
				<div>
					<h3 className="mb-1 text-xs font-medium text-gray-400">
						Scripts ({result.scripts.length})
					</h3>
					<div className="flex flex-wrap gap-1">
						{result.scripts.slice(0, 12).map((s) => (
							<span
								key={s}
								className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] font-mono text-gray-400"
							>
								{s}
							</span>
						))}
						{result.scripts.length > 12 && (
							<span className="text-[10px] text-gray-500">
								+{result.scripts.length - 12} more
							</span>
						)}
					</div>
				</div>
			)}

			{/* Agentic Files */}
			{result.agenticFiles.length > 0 && (
				<div>
					<h3 className="mb-1.5 flex items-center gap-1 text-xs font-medium text-amber-400">
						<AlertTriangle size={10} />
						Agentic Files Detected
					</h3>
					<p className="text-[10px] text-gray-500 mb-1.5">
						These files contain agent instructions. They were preserved — not
						modified or deleted.
					</p>
					<ul className="space-y-1">
						{result.agenticFiles.map((f) => (
							<li
								key={f.relativePath}
								className="rounded border border-gray-800 bg-gray-950 px-2.5 py-1.5 flex items-center justify-between"
							>
								<span className="font-mono text-xs text-gray-300">
									{f.relativePath}
								</span>
								<div className="flex items-center gap-2">
									{f.rulesCount > 0 && (
										<span className="text-[10px] text-gray-500">
											{f.rulesCount} rules
										</span>
									)}
									<span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-500">
										{f.type}
									</span>
								</div>
							</li>
						))}
					</ul>
				</div>
			)}

			{/* Next steps */}
			<div className="rounded border border-gray-800 bg-gray-900/50 p-3">
				<h3 className="text-xs font-medium text-gray-300 mb-1.5">Next Steps</h3>
				<ul className="space-y-1 text-xs text-gray-400">
					<li className="flex items-start gap-1.5">
						<span className="text-gray-600 mt-0.5">1.</span>
						Create a feature to start working on this project
					</li>
					<li className="flex items-start gap-1.5">
						<span className="text-gray-600 mt-0.5">2.</span>
						Run /blueprint:research to analyze the codebase deeper
					</li>
					<li className="flex items-start gap-1.5">
						<span className="text-gray-600 mt-0.5">3.</span>
						Review agentic files and consolidate if needed
					</li>
				</ul>
			</div>
		</div>
	);
}

function SettingsStep({
	settings,
	setSettings,
}: {
	settings: AgentRunSettingsPayload;
	setSettings: (s: AgentRunSettingsPayload) => void;
}) {
	return (
		<div className="space-y-3">
			<p className="text-xs text-gray-400">
				Configure how the Pi agent will analyze this project during import.
			</p>
			<AgentRunSettingsPanel value={settings} onChange={setSettings} />
		</div>
	);
}
