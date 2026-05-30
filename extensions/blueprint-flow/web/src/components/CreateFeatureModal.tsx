import { CheckCircle, GitBranch, Loader2 } from "lucide-react";
import { useState } from "react";
import type { AgentRunSettingsPayload } from "../lib/api";
import { api } from "../lib/api";
import { useStore } from "../store";
import { AgentRunSettingsPanel } from "./AgentRunSettingsPanel";
import { BlueprintModal } from "./BlueprintModal";

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

const RISK_OPTIONS = [
	{ value: "auto", label: "Auto" },
	{ value: "low", label: "Low" },
	{ value: "medium", label: "Medium" },
	{ value: "high", label: "High" },
] as const;

type ModalState = "form" | "creating" | "success";

export function CreateFeatureModal() {
	const { closeModal, selectedProjectId, setFeatures, selectFeature } = useStore();
	const [modalState, setModalState] = useState<ModalState>("form");
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [type, setType] = useState("feature");
	const [priority, setPriority] = useState("medium");
	const [riskLevel, setRiskLevel] = useState("auto");
	const [settings, setSettings] = useState<AgentRunSettingsPayload>({
		effortLevel: "balanced",
		executionMode: "draft",
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [createdTitle, setCreatedTitle] = useState("");

	async function handleSubmit(e?: React.FormEvent) {
		e?.preventDefault();
		if (!title.trim() || !selectedProjectId) return;

		setLoading(true);
		setError(null);
		setModalState("creating");

		try {
			const feature = await api.features.create(selectedProjectId, {
				title: title.trim(),
				description: description.trim() || undefined,
				type,
				priority,
				riskLevel,
				agentRunSettings: settings,
			});

			const features = await api.features.list(selectedProjectId);
			setFeatures(features);
			selectFeature(feature.id);
			setCreatedTitle(feature.title);
			setModalState("success");

			// Auto-close after brief success display
			setTimeout(() => closeModal(), 1500);
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
						: "New Feature / Task"
			}
			icon={<GitBranch size={16} className="text-emerald-400" />}
			width="lg"
			preventOutsideClose={modalState === "creating"}
			footer={
				modalState === "form" ? (
					<div className="flex justify-end gap-2">
						<button
							type="button"
							onClick={closeModal}
							className="rounded px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-300"
						>
							Cancel
						</button>
						<button
							onClick={() => handleSubmit()}
							disabled={!title.trim() || loading}
							className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Create
						</button>
					</div>
				) : null
			}
		>
			{modalState === "form" && (
				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Title */}
					<div>
						<label className="mb-1 block text-xs font-medium text-gray-400">
							Title <span className="text-red-400">*</span>
						</label>
						<input
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Add user authentication with OAuth2"
							autoFocus
							className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
						/>
					</div>

					{/* Description */}
					<div>
						<label className="mb-1 block text-xs font-medium text-gray-400">
							Description
						</label>
						<textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Detailed description of what this should accomplish..."
							rows={3}
							className="w-full resize-none rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
						/>
					</div>

					{/* Type + Priority + Risk */}
					<div className="grid grid-cols-3 gap-3">
						<div>
							<label className="mb-1 block text-xs font-medium text-gray-400">
								Type
							</label>
							<select
								value={type}
								onChange={(e) => setType(e.target.value)}
								className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-gray-300 focus:border-blue-500 focus:outline-none"
							>
								{FEATURE_TYPES.map((t) => (
									<option key={t.value} value={t.value}>
										{t.label}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="mb-1 block text-xs font-medium text-gray-400">
								Priority
							</label>
							<select
								value={priority}
								onChange={(e) => setPriority(e.target.value)}
								className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-gray-300 focus:border-blue-500 focus:outline-none"
							>
								{PRIORITY_OPTIONS.map((p) => (
									<option key={p.value} value={p.value}>
										{p.label}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="mb-1 block text-xs font-medium text-gray-400">
								Risk
							</label>
							<select
								value={riskLevel}
								onChange={(e) => setRiskLevel(e.target.value)}
								className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-gray-300 focus:border-blue-500 focus:outline-none"
							>
								{RISK_OPTIONS.map((r) => (
									<option key={r.value} value={r.value}>
										{r.label}
									</option>
								))}
							</select>
						</div>
					</div>

					{/* Agent Run Settings */}
					<div className="rounded border border-gray-800 bg-gray-950/50 p-3">
						<h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
							Agent Settings
						</h3>
						<AgentRunSettingsPanel value={settings} onChange={setSettings} />
					</div>

					{error && (
						<p className="rounded bg-red-900/30 px-3 py-2 text-xs text-red-400">
							{error}
						</p>
					)}
				</form>
			)}

			{modalState === "creating" && (
				<div className="flex flex-col items-center justify-center py-10">
					<Loader2 size={32} className="animate-spin text-emerald-400 mb-3" />
					<p className="text-sm text-gray-300">Creating feature and initializing flow steps...</p>
					<p className="text-xs text-gray-500 mt-1">
						Setting up workflow pipeline
					</p>
				</div>
			)}

			{modalState === "success" && (
				<div className="flex flex-col items-center justify-center py-10">
					<div className="rounded-full bg-emerald-950/30 border border-emerald-800/50 p-3 mb-3">
						<CheckCircle size={24} className="text-emerald-400" />
					</div>
					<p className="text-sm font-medium text-emerald-300">
						"{createdTitle}" created
					</p>
					<p className="text-xs text-gray-500 mt-1">
						Opening flow view...
					</p>
				</div>
			)}
		</BlueprintModal>
	);
}
