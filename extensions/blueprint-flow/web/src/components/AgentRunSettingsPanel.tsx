import { Cpu, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type {
	AgentConfigResponse,
	AgentModelInfo,
	AgentRunSettingsPayload,
} from "../lib/api";
import { api } from "../lib/api";
import { ModelBadges } from "./ModelBadges";

interface Props {
	value: AgentRunSettingsPayload;
	onChange: (settings: AgentRunSettingsPayload) => void;
	compact?: boolean;
}

const MODE_OPTIONS = [
	{
		value: "supervised",
		label: "Supervised",
		description: "Pause between steps — you decide when to advance",
	},
	{
		value: "autonomous",
		label: "Autonomous",
		description: "Auto-advance + skip optional steps",
	},
	{
		value: "draft",
		label: "Draft",
		description: "Generate artifacts without applying code",
	},
] as const;

const FALLBACK_MODELS: AgentModelInfo[] = [
	{
		id: "claude-haiku-4-5-20251001",
		name: "Claude Haiku 4.5",
		provider: "anthropic",
		reasoning: false,
		contextWindow: 200000,
		maxTokens: 8192,
		cost: { input: 0.8, output: 4 },
		supportedThinkingLevels: ["off"],
	},
	{
		id: "claude-sonnet-4-6-20250514",
		name: "Claude Sonnet 4.6",
		provider: "anthropic",
		reasoning: true,
		contextWindow: 200000,
		maxTokens: 16384,
		cost: { input: 3, output: 15 },
		supportedThinkingLevels: [
			"off",
			"minimal",
			"low",
			"medium",
			"high",
			"xhigh",
		],
	},
	{
		id: "claude-opus-4-7-20250219",
		name: "Claude Opus 4.7",
		provider: "anthropic",
		reasoning: true,
		contextWindow: 200000,
		maxTokens: 32768,
		cost: { input: 15, output: 75 },
		supportedThinkingLevels: [
			"off",
			"minimal",
			"low",
			"medium",
			"high",
			"xhigh",
		],
	},
];

export function AgentRunSettingsPanel({ value, onChange, compact }: Props) {
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [agentConfig, setAgentConfig] = useState<AgentConfigResponse | null>(
		null,
	);
	const [configLoading, setConfigLoading] = useState(true);
	const [configError, setConfigError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		setConfigLoading(true);
		api.config
			.agent()
			.then((config) => {
				if (!cancelled) {
					setAgentConfig(config);
					setConfigError(null);
				}
			})
			.catch((err: Error) => {
				if (!cancelled) setConfigError(err.message);
			})
			.finally(() => {
				if (!cancelled) setConfigLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		function handleConfigUpdate() {
			api.config
				.agent()
				.then((config) => {
					setAgentConfig(config);
					setConfigError(null);
					setConfigLoading(false);
				})
				.catch(() => {});
		}
		window.addEventListener("blueprint:config-updated", handleConfigUpdate);
		return () =>
			window.removeEventListener(
				"blueprint:config-updated",
				handleConfigUpdate,
			);
	}, []);

	function update(partial: Partial<AgentRunSettingsPayload>) {
		onChange({ ...value, ...partial });
	}

	const models = agentConfig?.models ?? [];
	const hasModels = models.length > 0;
	const displayModels = hasModels ? models : FALLBACK_MODELS;
	const defaultModel = agentConfig?.defaultModel;

	return (
		<div className="space-y-3">
			{/* Model Selector */}
			<div>
				<label className="mb-1 block text-xs font-medium text-gray-400">
					<Cpu size={10} className="mr-1 inline" />
					Model
				</label>
				{configLoading ? (
					<div className="flex items-center gap-1.5 rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-500">
						<Loader2 size={10} className="animate-spin" />
						Loading models...
					</div>
				) : (
					<select
						value={value.modelId ?? ""}
						onChange={(e) => update({ modelId: e.target.value || undefined })}
						className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
					>
						<option value="">
							{defaultModel ? `default (${defaultModel})` : "default"}
						</option>
						{groupModelsByProvider(displayModels).map(
							([provider, providerModels]) => (
								<optgroup key={provider} label={provider}>
									{providerModels.map((m) => (
										<option key={`${m.provider}/${m.id}`} value={m.id}>
											{m.name}
											{m.reasoning ? " (reasoning)" : ""}
										</option>
									))}
								</optgroup>
							),
						)}
					</select>
				)}
				{configError && !hasModels && (
					<p className="mt-0.5 text-xs text-amber-500/70">
						Pi not connected — showing known models
					</p>
				)}
				{value.modelId &&
					(() => {
						const selected = displayModels.find((m) => m.id === value.modelId);
						return selected ? (
							<div className="mt-1">
								<ModelBadges model={selected} />
							</div>
						) : null;
					})()}
			</div>

			{/* Thinking Level */}
			<div>
				<label className="mb-1.5 block text-xs font-medium text-gray-400">
					Thinking Level
				</label>
				{(() => {
					const selectedModel = displayModels.find(
						(m) => m.id === value.modelId,
					);
					const levels: string[] = selectedModel?.supportedThinkingLevels ??
						agentConfig?.thinkingLevels ?? [
							"off",
							"minimal",
							"low",
							"medium",
							"high",
							"xhigh",
						];
					const displayLevels = levels.filter((l) => l !== "off");
					const modelSupportsThinking =
						!selectedModel || selectedModel.reasoning !== false;

					if (!modelSupportsThinking) {
						return (
							<p className="text-xs italic text-gray-500">
								Not supported for this model
							</p>
						);
					}

					return (
						<div className="grid grid-cols-5 gap-1">
							{displayLevels.map((level) => (
								<button
									key={level}
									type="button"
									onClick={() => update({ thinkingLevel: level })}
									className={`rounded px-1.5 py-1 text-xs capitalize transition-colors ${
										value.thinkingLevel === level
											? "bg-violet-600/30 text-violet-300 ring-1 ring-violet-500/50"
											: "bg-gray-800 text-gray-400 hover:bg-gray-750 hover:text-gray-300"
									}`}
								>
									{level === "xhigh" ? "max" : level}
								</button>
							))}
						</div>
					);
				})()}
			</div>

			{/* Execution Mode */}
			<div>
				<label className="mb-1.5 block text-xs font-medium text-gray-400">
					Mode
				</label>
				<div className="grid grid-cols-3 gap-1">
					{MODE_OPTIONS.map(({ value: v, label, description }) => (
						<button
							key={v}
							type="button"
							onClick={() => update({ executionMode: v })}
							title={description}
							className={`flex flex-col items-center gap-0.5 rounded px-2 py-1.5 text-xs transition-colors ${
								value.executionMode === v
									? "bg-emerald-600/30 text-emerald-300 ring-1 ring-emerald-500/50"
									: "bg-gray-800 text-gray-400 hover:bg-gray-750 hover:text-gray-300"
							}`}
						>
							<span>{label}</span>
						</button>
					))}
				</div>
			</div>

			{/* Options */}
			{!compact && (
				<div className="space-y-1.5">
					<label className="mb-1 block text-xs font-medium text-gray-400">
						Options
					</label>
					<ToggleOption
						label="Use memory"
						checked={value.allowMemorySearch !== false}
						onChange={(v) => update({ allowMemorySearch: v })}
					/>
					<ToggleOption
						label="Scan repo"
						checked={value.allowRepoScan !== false}
						onChange={(v) => update({ allowRepoScan: v })}
					/>
					<ToggleOption
						label="Web research"
						checked={value.allowWebResearch !== false}
						onChange={(v) => update({ allowWebResearch: v })}
					/>
				</div>
			)}

			{/* Advanced */}
			{!compact && (
				<button
					type="button"
					onClick={() => setShowAdvanced(!showAdvanced)}
					className="text-xs text-gray-500 hover:text-gray-400"
				>
					{showAdvanced ? "Hide advanced" : "Advanced options..."}
				</button>
			)}

			{showAdvanced && !compact && (
				<div className="space-y-2 rounded border border-gray-800 bg-gray-900/50 p-2">
					<div className="grid grid-cols-2 gap-2">
						<div>
							<label className="mb-0.5 block text-xs text-gray-500">
								Max research results
							</label>
							<input
								type="number"
								min={1}
								max={30}
								value={value.maxResearchResults ?? ""}
								onChange={(e) =>
									update({
										maxResearchResults: e.target.value
											? Number(e.target.value)
											: undefined,
									})
								}
								placeholder="auto"
								className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-300 focus:border-blue-500 focus:outline-none"
							/>
						</div>
						<div>
							<label className="mb-0.5 block text-xs text-gray-500">
								Max interview questions
							</label>
							<input
								type="number"
								min={1}
								max={20}
								value={value.maxInterviewQuestions ?? ""}
								onChange={(e) =>
									update({
										maxInterviewQuestions: e.target.value
											? Number(e.target.value)
											: undefined,
									})
								}
								placeholder="auto"
								className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-300 focus:border-blue-500 focus:outline-none"
							/>
						</div>
					</div>
					<div>
						<label className="mb-0.5 block text-xs text-gray-500">
							Review strictness
						</label>
						<select
							value={value.reviewStrictness ?? "normal"}
							onChange={(e) => update({ reviewStrictness: e.target.value })}
							className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-300 focus:border-blue-500 focus:outline-none"
						>
							<option value="light">Light</option>
							<option value="normal">Normal</option>
							<option value="strict">Strict</option>
						</select>
					</div>
				</div>
			)}
		</div>
	);
}

function ToggleOption({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (value: boolean) => void;
}) {
	return (
		<label className="flex cursor-pointer items-center gap-2">
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
				className="h-3 w-3 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-0 focus:ring-offset-0"
			/>
			<span className="text-xs text-gray-400">{label}</span>
		</label>
	);
}

function groupModelsByProvider(
	models: AgentModelInfo[],
): [string, AgentModelInfo[]][] {
	const grouped = new Map<string, AgentModelInfo[]>();
	for (const model of models) {
		const existing = grouped.get(model.provider);
		if (existing) {
			existing.push(model);
		} else {
			grouped.set(model.provider, [model]);
		}
	}
	return Array.from(grouped.entries());
}
