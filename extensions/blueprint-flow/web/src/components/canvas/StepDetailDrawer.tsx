import { Cpu, FileText, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { STEP_LABELS } from "../../constants/steps";
import {
	type AgentConfigResponse,
	type AgentModelInfo,
	api,
} from "../../lib/api";
import { useStore } from "../../store";
import { InlineActionRuns } from "../InlineActionRuns";
import { InlineInterviewSection } from "../InlineInterviewSection";
import { MarkdownContent } from "../MarkdownContent";

type Tab = "artifacts" | "activity" | "output" | "interview";

export function StepDetailDrawer() {
	const {
		selectedNodeId,
		selectedFeatureId,
		selectNode,
		steps,
		artifacts,
		actionRuns,
		interviews,
		features,
	} = useStore();
	const currentFeature = features.find((f) => f.id === selectedFeatureId);
	const step = steps.find((s) => s.id === selectedNodeId);
	const [activeTab, setActiveTab] = useState<Tab>("artifacts");
	const [artifactContent, setArtifactContent] = useState<string>("");
	const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(
		null,
	);
	const [loadingContent, setLoadingContent] = useState(false);
	const artifactContentVersion = useStore((s) => s.artifactContentVersion);

	useEffect(() => {
		setActiveTab("artifacts");
		setSelectedArtifactId(null);
	}, [selectedNodeId]);

	useEffect(() => {
		if (!selectedArtifactId) {
			setArtifactContent("");
			return;
		}
		setLoadingContent(true);
		fetch(`/api/artifacts/${selectedArtifactId}`)
			.then((r) => r.json())
			.then((data) => {
				if (data.content) setArtifactContent(data.content);
			})
			.catch(() => {})
			.finally(() => setLoadingContent(false));
	}, [selectedArtifactId, artifactContentVersion]);

	const [injectText, setInjectText] = useState("");
	const [injecting, setInjecting] = useState(false);

	const liveMessagePreview = useStore((s) => s.liveMessagePreview);
	const liveToolName = useStore((s) => s.liveToolName);
	const liveToolHistory = useStore((s) => s.liveToolHistory);
	const actionTimeout = useStore((s) => s.actionTimeout);
	const pendingInterviews = interviews.filter((i) => !i.answer);
	const activeRun = actionRuns.find(
		(r) =>
			r.feature_id === selectedFeatureId &&
			r.step_name === step?.name &&
			!["completed", "failed", "cancelled", "not_connected"].includes(r.status),
	);

	useEffect(() => {
		if (activeTab === "output" && !activeRun) {
			setActiveTab("activity");
		}
	}, [activeRun, activeTab]);

	useEffect(() => {
		if (activeRun && activeTab !== "output") {
			setActiveTab("output");
		}
	}, [activeRun?.id]);

	const prevPendingCount = useRef(0);
	useEffect(() => {
		if (
			pendingInterviews.length > prevPendingCount.current &&
			pendingInterviews.length > 0
		) {
			setActiveTab("interview");
		}
		prevPendingCount.current = pendingInterviews.length;
	}, [pendingInterviews.length]);

	if (!step || !selectedFeatureId) return null;

	const stepArtifacts = artifacts.filter((a) => a.step_name === step.name);
	const isCurrentStep = currentFeature?.current_step === step.name;
	const isActive =
		step.status === "current" ||
		step.status === "running" ||
		step.status === "needs_user";

	const tabs: { id: Tab; label: string; count?: number }[] = [
		{ id: "artifacts", label: "Artifacts", count: stepArtifacts.length },
		...(activeRun ? [{ id: "output" as Tab, label: "Output" }] : []),
		{ id: "activity", label: "Activity" },
	];
	if (pendingInterviews.length > 0)
		tabs.push({
			id: "interview",
			label: "Interview",
			count: pendingInterviews.length,
		});

	async function handleInject() {
		if (!injectText.trim()) return;
		if (!activeRun) return;
		setInjecting(true);
		try {
			await api.actionRuns.inject(activeRun.id, injectText.trim());
			setInjectText("");
		} catch {}
		setInjecting(false);
	}

	return (
		<div
			className="absolute top-0 right-0 bottom-0 z-20 w-[400px] flex flex-col overflow-hidden border-l animate-fade-in"
			style={{
				background: "var(--bg-elevated)",
				borderColor: "var(--border-default)",
				boxShadow: "-8px 0 32px rgba(0, 0, 0, 0.4)",
			}}
		>
			{/* Header */}
			<div
				className="flex items-center justify-between px-5 py-3.5 border-b shrink-0"
				style={{ borderColor: "var(--border-subtle)" }}
			>
				<div className="flex items-center gap-2.5 min-w-0">
					<h3
						className="text-sm font-semibold truncate"
						style={{ color: "var(--text-primary)" }}
					>
						{STEP_LABELS[step.name] || step.name}
					</h3>
					<StatusPill status={step.status} />
				</div>
				<button
					onClick={() => selectNode(null)}
					className="rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
					style={{ color: "var(--text-muted)" }}
				>
					<X size={14} />
				</button>
			</div>

			{/* Tabs */}
			<div className="flex items-center gap-1 px-5 pt-3 pb-1 shrink-0">
				{tabs.map((tab) => (
					<button
						key={tab.id}
						onClick={() => setActiveTab(tab.id)}
						className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all"
						style={{
							color:
								activeTab === tab.id
									? "var(--text-primary)"
									: "var(--text-tertiary)",
							background:
								activeTab === tab.id ? "var(--bg-surface)" : "transparent",
						}}
					>
						{tab.label}
						{tab.count != null && tab.count > 0 && (
							<span
								className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold"
								style={{
									background:
										activeTab === tab.id
											? "rgba(91, 155, 213, 0.15)"
											: "rgba(255,255,255,0.04)",
									color:
										activeTab === tab.id
											? "var(--cyan-400)"
											: "var(--text-muted)",
								}}
							>
								{tab.count}
							</span>
						)}
					</button>
				))}
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-3">
				{activeTab === "artifacts" && (
					<ArtifactsTab
						artifacts={stepArtifacts}
						selectedId={selectedArtifactId}
						onSelect={setSelectedArtifactId}
						content={artifactContent}
						loading={loadingContent}
					/>
				)}
				{activeTab === "activity" && (
					<InlineActionRuns
						stepName={step.name}
						featureId={selectedFeatureId}
					/>
				)}
				{activeTab === "output" && (
					<LiveOutputTab
						message={liveMessagePreview}
						toolName={liveToolName}
						toolHistory={liveToolHistory}
						timeout={actionTimeout}
					/>
				)}
				{activeTab === "interview" && (
					<InlineInterviewSection featureId={selectedFeatureId} />
				)}
			</div>

			{/* Run Settings (model + effort) */}
			{(isCurrentStep || isActive) && (
				<div
					className="border-t px-5 py-3 shrink-0"
					style={{ borderColor: "var(--border-subtle)" }}
				>
					<DrawerRunSettings />
				</div>
			)}

			{activeRun && (
				<div
					className="border-t px-5 py-3 shrink-0"
					style={{ borderColor: "var(--border-subtle)" }}
				>
					<div className="flex gap-1.5">
						<input
							type="text"
							value={injectText}
							onChange={(e) => setInjectText(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									handleInject();
								}
							}}
							placeholder="Send context to agent..."
							className="flex-1 rounded-lg border px-3 py-1.5 text-xs focus:outline-none"
							style={{
								background: "var(--bg-inset)",
								borderColor: "var(--border-subtle)",
								color: "var(--text-primary)",
							}}
						/>
						<button
							type="button"
							onClick={handleInject}
							disabled={injecting || !injectText.trim()}
							className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
							style={{
								color: "var(--accent-primary)",
								background: "var(--cyan-glow)",
								border: "1px solid rgba(91, 155, 213, 0.2)",
							}}
						>
							{injecting ? "..." : "Send"}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

function StatusPill({ status }: { status: string }) {
	const config: Record<string, { bg: string; color: string }> = {
		done: { bg: "var(--emerald-glow)", color: "var(--accent-success)" },
		current: { bg: "var(--cyan-glow)", color: "var(--accent-primary)" },
		running: { bg: "var(--cyan-glow)", color: "var(--accent-primary)" },
		needs_user: { bg: "var(--amber-glow)", color: "var(--amber-400)" },
		blocked: { bg: "var(--rose-glow)", color: "var(--rose-400)" },
		pending: { bg: "rgba(255,255,255,0.03)", color: "var(--text-muted)" },
	};
	const c = config[status] ?? config.pending;
	return (
		<span
			className="rounded-md px-2 py-0.5 text-[10px] font-mono font-medium"
			style={{ background: c.bg, color: c.color }}
		>
			{status}
		</span>
	);
}

function ArtifactsTab({
	artifacts,
	selectedId,
	onSelect,
	content,
	loading,
}: {
	artifacts: { id: string; filename: string; type: string }[];
	selectedId: string | null;
	onSelect: (id: string | null) => void;
	content: string;
	loading: boolean;
}) {
	if (artifacts.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12 gap-3">
				<FileText size={24} style={{ color: "var(--text-muted)" }} />
				<p className="text-xs" style={{ color: "var(--text-muted)" }}>
					No artifacts generated yet
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{/* Artifact list */}
			<div className="flex flex-wrap gap-1.5">
				{artifacts.map((a) => (
					<button
						key={a.id}
						onClick={() => onSelect(selectedId === a.id ? null : a.id)}
						className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-mono transition-all"
						style={{
							background:
								selectedId === a.id
									? "var(--bg-surface)"
									: "rgba(255,255,255,0.02)",
							border: `1px solid ${selectedId === a.id ? "var(--border-strong)" : "var(--border-subtle)"}`,
							color:
								selectedId === a.id
									? "var(--text-primary)"
									: "var(--text-secondary)",
						}}
					>
						<FileText
							size={11}
							className="shrink-0"
							style={{ color: "var(--text-muted)" }}
						/>
						<span className="truncate max-w-[120px]">{a.filename}</span>
					</button>
				))}
			</div>

			{/* Content viewer */}
			{selectedId && (
				<div
					className="mt-3 rounded-xl border overflow-hidden"
					style={{
						background: "var(--bg-inset)",
						borderColor: "var(--border-subtle)",
					}}
				>
					{loading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2
								size={16}
								className="animate-spin"
								style={{ color: "var(--text-muted)" }}
							/>
						</div>
					) : (
						<div className="max-h-[400px] overflow-y-auto scrollbar-thin p-4">
							<MarkdownContent content={content} />
						</div>
					)}
				</div>
			)}
		</div>
	);
}

const FALLBACK_MODELS: AgentModelInfo[] = [
	{
		id: "claude-haiku-4-5-20251001",
		name: "Haiku 4.5",
		provider: "anthropic",
		reasoning: false,
		contextWindow: 200000,
		maxTokens: 8192,
		cost: { input: 0.8, output: 4 },
		supportedThinkingLevels: ["off"],
	},
	{
		id: "claude-sonnet-4-6-20250514",
		name: "Sonnet 4.6",
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
		name: "Opus 4.7",
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

function DrawerRunSettings() {
	const [config, setConfig] = useState<AgentConfigResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const { runModelId, runThinkingLevel, setRunModelId, setRunThinkingLevel } =
		useStore();

	useEffect(() => {
		api.config
			.agent()
			.then((c) => {
				setConfig(c);
				setLoading(false);
			})
			.catch(() => setLoading(false));

		function handleConfigUpdate() {
			api.config
				.agent()
				.then((c) => setConfig(c))
				.catch(() => {});
		}
		window.addEventListener("blueprint:config-updated", handleConfigUpdate);
		return () =>
			window.removeEventListener(
				"blueprint:config-updated",
				handleConfigUpdate,
			);
	}, []);

	const models = config?.models ?? [];
	const displayModels = models.length > 0 ? models : FALLBACK_MODELS;
	const defaultModel = config?.defaultModel;

	return (
		<div className="space-y-2.5">
			{/* Model */}
			<div>
				<label
					className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide"
					style={{ color: "var(--text-muted)" }}
				>
					<Cpu size={9} />
					Model
				</label>
				{loading ? (
					<div
						className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px]"
						style={{
							background: "var(--bg-inset)",
							borderColor: "var(--border-subtle)",
							color: "var(--text-muted)",
						}}
					>
						<Loader2 size={9} className="animate-spin" />
						Loading...
					</div>
				) : (
					<select
						value={runModelId ?? ""}
						onChange={(e) => setRunModelId(e.target.value || null)}
						className="w-full rounded-lg border px-2.5 py-1.5 text-[11px] focus:outline-none"
						style={{
							background: "var(--bg-inset)",
							borderColor: "var(--border-subtle)",
							color: "var(--text-primary)",
						}}
					>
						<option value="">
							{defaultModel ? `default (${defaultModel})` : "default"}
						</option>
						{displayModels.map((m) => (
							<option key={m.id} value={m.id}>
								{m.name}
								{m.reasoning ? " (reasoning)" : ""}
							</option>
						))}
					</select>
				)}
			</div>

			{/* Thinking Level */}
			<div>
				<label
					className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide"
					style={{ color: "var(--text-muted)" }}
				>
					Thinking
				</label>
				{(() => {
					const selectedModel = displayModels.find((m) => m.id === runModelId);
					const levels = selectedModel?.supportedThinkingLevels ??
						config?.thinkingLevels ?? [
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
							<p
								className="text-[10px] italic"
								style={{ color: "var(--text-muted)" }}
							>
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
									onClick={() => setRunThinkingLevel(level)}
									className="flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1.5 text-[10px] font-medium capitalize transition-all"
									style={{
										background:
											runThinkingLevel === level
												? "var(--cyan-glow)"
												: "rgba(255,255,255,0.02)",
										border: `1px solid ${runThinkingLevel === level ? "rgba(91, 155, 213, 0.3)" : "var(--border-subtle)"}`,
										color:
											runThinkingLevel === level
												? "var(--cyan-400)"
												: "var(--text-tertiary)",
									}}
								>
									{level === "xhigh" ? "max" : level}
								</button>
							))}
						</div>
					);
				})()}
			</div>
		</div>
	);
}

function LiveOutputTab({
	message,
	toolName,
	toolHistory,
	timeout,
}: {
	message: string | null;
	toolName: string | null;
	toolHistory: { name: string; startedAt: number; endedAt?: number }[];
	timeout: { timeoutMs: number; startedAt: number } | null;
}) {
	const [remaining, setRemaining] = useState<number | null>(null);

	useEffect(() => {
		if (!timeout) {
			setRemaining(null);
			return;
		}
		function tick() {
			const elapsed = Date.now() - timeout!.startedAt;
			const left = Math.max(0, timeout!.timeoutMs - elapsed);
			setRemaining(left);
		}
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	}, [timeout]);

	return (
		<div className="space-y-3">
			{/* Timeout countdown */}
			{remaining != null && remaining > 0 && (
				<div
					className="flex items-center justify-between rounded-lg px-3 py-1.5"
					style={{
						background: "rgba(255,255,255,0.02)",
						border: "1px solid var(--border-subtle)",
					}}
				>
					<span
						className="text-[10px] font-medium"
						style={{ color: "var(--text-tertiary)" }}
					>
						Timeout
					</span>
					<span
						className="text-[11px] font-mono"
						style={{
							color:
								remaining < 60000 ? "var(--rose-400)" : "var(--text-secondary)",
						}}
					>
						{Math.floor(remaining / 60000)}:
						{String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0")}
					</span>
				</div>
			)}
			{/* Current tool indicator */}
			{toolName && (
				<div
					className="flex items-center gap-2 rounded-lg px-3 py-2"
					style={{
						background: "var(--cyan-glow)",
						border: "1px solid rgba(91, 155, 213, 0.15)",
					}}
				>
					<Loader2
						size={11}
						className="animate-spin"
						style={{ color: "var(--cyan-400)" }}
					/>
					<span
						className="text-[11px] font-mono"
						style={{ color: "var(--cyan-400)" }}
					>
						{toolName}
					</span>
				</div>
			)}

			{/* Tool history timeline */}
			{toolHistory.length > 0 && (
				<div className="space-y-1">
					<p
						className="text-[10px] font-medium uppercase tracking-wide"
						style={{ color: "var(--text-muted)" }}
					>
						Tools
					</p>
					<div className="space-y-0.5">
						{toolHistory.map((t, i) => {
							const duration = t.endedAt
								? t.endedAt - t.startedAt
								: Date.now() - t.startedAt;
							return (
								<div key={i} className="flex items-center gap-2">
									<span
										className="text-[10px] font-mono w-[100px] truncate"
										style={{ color: "var(--text-secondary)" }}
									>
										{t.name}
									</span>
									<div
										className="flex-1 h-1.5 rounded-full overflow-hidden"
										style={{ background: "rgba(255,255,255,0.04)" }}
									>
										<div
											className={`h-full rounded-full ${!t.endedAt ? "animate-pulse" : ""}`}
											style={{
												width: `${Math.min(100, (duration / 10000) * 100)}%`,
												background: t.endedAt
													? "var(--accent-primary)"
													: "var(--cyan-400)",
											}}
										/>
									</div>
									<span
										className="text-[9px] font-mono w-8 text-right"
										style={{ color: "var(--text-muted)" }}
									>
										{(duration / 1000).toFixed(1)}s
									</span>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Streaming message output */}
			{message ? (
				<div
					className="rounded-xl border p-3 max-h-[300px] overflow-y-auto scrollbar-thin"
					style={{
						background: "var(--bg-inset)",
						borderColor: "var(--border-subtle)",
					}}
				>
					<MarkdownContent content={message} />
				</div>
			) : (
				<div className="flex flex-col items-center justify-center py-8 gap-2">
					<Loader2
						size={16}
						className="animate-spin"
						style={{ color: "var(--text-muted)" }}
					/>
					<p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
						Waiting for output...
					</p>
				</div>
			)}
		</div>
	);
}
