import {
	CheckCircle,
	Cpu,
	FileText,
	Loader2,
	PenLine,
	Sparkles,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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

type Tab =
	| "artifacts"
	| "activity"
	| "output"
	| "interview"
	| "notes"
	| "suggestion";

export function StepDetailDrawer() {
	const {
		selectedNodeId,
		selectedFlowId,
		selectNode,
		steps,
		artifacts,
		actionRuns,
		interviews,
		flows,
		activeWorkflow,
	} = useStore();
	const currentFlow = flows.find((f) => f.id === selectedFlowId);
	const step = steps.find((s) => s.id === selectedNodeId);
	const wfStep = activeWorkflow?.steps?.find((ws) => ws.name === step?.name);
	const stepType = wfStep?.type ?? "agent";
	const [activeTab, setActiveTab] = useState<Tab>("artifacts");
	const [artifactContent, setArtifactContent] = useState<string>("");
	const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(
		null,
	);
	const [loadingContent, setLoadingContent] = useState(false);
	const artifactContentVersion = useStore((s) => s.artifactContentVersion);

	useEffect(() => {
		const defaultTab: Tab =
			stepType === "manual"
				? "notes"
				: stepType === "hybrid"
					? "suggestion"
					: "artifacts";
		setActiveTab(defaultTab);
		setSelectedArtifactId(null);
	}, [selectedNodeId, stepType]);

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
			r.flow_id === selectedFlowId &&
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

	if (!step || !selectedFlowId) return null;

	const stepArtifacts = artifacts.filter((a) => a.step_name === step.name);
	const isCurrentStep = currentFlow?.current_step === step.name;
	const isActive =
		step.status === "current" ||
		step.status === "running" ||
		step.status === "needs_user";

	const tabs: { id: Tab; label: string; count?: number }[] = [];
	if (stepType === "hybrid") {
		tabs.push({ id: "suggestion", label: "Suggestion" });
	}
	if (stepType === "manual" || stepType === "hybrid") {
		tabs.push({ id: "notes", label: "Notes" });
	}
	tabs.push({
		id: "artifacts",
		label: "Artifacts",
		count: stepArtifacts.length,
	});
	if (activeRun) {
		tabs.push({ id: "output", label: "Output" });
	}
	tabs.push({ id: "activity", label: "Activity" });
	if (pendingInterviews.length > 0) {
		tabs.push({
			id: "interview",
			label: "Interview",
			count: pendingInterviews.length,
		});
	}

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
			className="absolute top-0 right-0 bottom-0 z-20 w-[400px] flex flex-col overflow-hidden border-l animate-slide-in-right"
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
				{activeTab === "notes" && (
					<NotesTab
						flowId={selectedFlowId}
						stepName={step.name}
						isCurrentStep={isCurrentStep}
					/>
				)}
				{activeTab === "suggestion" && (
					<SuggestionTab
						flowId={selectedFlowId}
						stepName={step.name}
						artifacts={stepArtifacts}
						actionRuns={actionRuns.filter(
							(r) => r.flow_id === selectedFlowId && r.step_name === step.name,
						)}
						onSwitchToNotes={() => setActiveTab("notes")}
					/>
				)}
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
					<InlineActionRuns stepName={step.name} flowId={selectedFlowId} />
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
					<InlineInterviewSection flowId={selectedFlowId} />
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
						className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-mono transition-all"
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
					className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide"
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
					className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide"
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
								className="text-[11px] italic"
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
									className="flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1.5 text-[11px] font-medium capitalize transition-all"
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
						className="text-[11px] font-medium"
						style={{ color: "var(--text-tertiary)" }}
					>
						Timeout
					</span>
					<span
						className="text-[10px] font-mono"
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
						className="text-[10px] font-mono"
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
						className="text-[11px] font-medium uppercase tracking-wide"
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

function NotesTab({
	flowId,
	stepName,
	isCurrentStep,
}: {
	flowId: string;
	stepName: string;
	isCurrentStep: boolean;
}) {
	const [notes, setNotes] = useState("");
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		fetch(`/api/artifacts?flowId=${flowId}&stepName=${stepName}&type=notes`)
			.then((r) => r.json())
			.then((data) => {
				if (data?.[0]?.id) {
					fetch(`/api/artifacts/${data[0].id}`)
						.then((r) => r.json())
						.then((a) => {
							if (a.content) setNotes(a.content);
						});
				}
			})
			.catch(() => {});
	}, [flowId, stepName]);

	const handleSave = useCallback(() => {
		if (timeoutRef.current) clearTimeout(timeoutRef.current);
		timeoutRef.current = setTimeout(async () => {
			if (!notes.trim()) return;
			setSaving(true);
			try {
				await fetch("/api/artifacts", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						flowId,
						stepName,
						type: "notes",
						filename: `${stepName}-notes.md`,
						content: notes.trim(),
					}),
				});
				setSaved(true);
				setTimeout(() => setSaved(false), 2000);
			} catch {}
			setSaving(false);
		}, 800);
	}, [notes, flowId, stepName]);

	async function handleMarkDone() {
		await api.flows.completeManual(flowId, notes.trim() || undefined);
	}

	return (
		<div className="flex flex-col gap-3 h-full">
			<div className="relative flex-1">
				<textarea
					value={notes}
					onChange={(e) => {
						setNotes(e.target.value);
						handleSave();
					}}
					placeholder="Add notes for this step..."
					className="w-full h-full min-h-[120px] rounded-xl border p-3.5 text-xs leading-relaxed resize-none focus:outline-none transition-all duration-200 focus:border-[rgba(91,155,213,0.4)] focus:shadow-[0_0_0_2px_rgba(91,155,213,0.08)]"
					style={{
						background: "var(--bg-inset)",
						borderColor: "var(--border-subtle)",
						color: "var(--text-primary)",
					}}
				/>
				<div
					className="absolute bottom-2.5 right-3 flex items-center gap-1.5 transition-opacity duration-300"
					style={{ opacity: saving || saved ? 1 : 0 }}
				>
					{saving && (
						<Loader2
							size={10}
							className="animate-spin"
							style={{ color: "var(--text-muted)" }}
						/>
					)}
					<span
						className="text-[11px] font-medium"
						style={{
							color: saving ? "var(--text-muted)" : "var(--emerald-400)",
						}}
					>
						{saving ? "Saving" : "Saved"}
					</span>
				</div>
			</div>
			{isCurrentStep && (
				<button
					onClick={handleMarkDone}
					className="flex items-center justify-center gap-2 w-full rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
					style={{
						background:
							"linear-gradient(135deg, rgba(107, 207, 127, 0.12), rgba(107, 207, 127, 0.06))",
						border: "1px solid rgba(107, 207, 127, 0.3)",
						color: "var(--emerald-400)",
						boxShadow: "0 2px 8px rgba(107, 207, 127, 0.08)",
					}}
				>
					<CheckCircle size={13} />
					Mark as done
				</button>
			)}
		</div>
	);
}

function SuggestionTab({
	flowId,
	stepName,
	artifacts,
	actionRuns,
	onSwitchToNotes,
}: {
	flowId: string;
	stepName: string;
	artifacts: { id: string; filename: string; type: string }[];
	actionRuns: { id: string; status: string }[];
	onSwitchToNotes: () => void;
}) {
	const [content, setContent] = useState("");
	const [loading, setLoading] = useState(false);
	const [revising, setRevising] = useState(false);
	const [feedback, setFeedback] = useState("");

	const suggestionArtifact = artifacts.find((a) => a.type === "suggestion");
	const lastCompletedRun = actionRuns
		.filter((r) => r.status === "completed")
		.at(-1);

	useEffect(() => {
		if (!suggestionArtifact) {
			setContent("");
			return;
		}
		setLoading(true);
		fetch(`/api/artifacts/${suggestionArtifact.id}`)
			.then((r) => r.json())
			.then((data) => {
				if (data.content) setContent(data.content);
			})
			.catch(() => {})
			.finally(() => setLoading(false));
	}, [suggestionArtifact?.id]);

	async function handleAccept() {
		await api.flows.advance(flowId);
	}

	async function handleRevise() {
		if (!feedback.trim() || !lastCompletedRun) return;
		setRevising(false);
		await api.actionRuns.retry(lastCompletedRun.id, feedback.trim());
		setFeedback("");
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2
					size={16}
					className="animate-spin"
					style={{ color: "var(--text-muted)" }}
				/>
			</div>
		);
	}

	if (!content) {
		return (
			<div className="flex flex-col items-center justify-center py-16 gap-4">
				<div
					className="flex h-12 w-12 items-center justify-center rounded-2xl"
					style={{
						background:
							"linear-gradient(135deg, rgba(167, 139, 250, 0.1), rgba(91, 155, 213, 0.08))",
						border: "1px solid rgba(167, 139, 250, 0.15)",
					}}
				>
					<Sparkles size={20} style={{ color: "#a78bfa" }} />
				</div>
				<div className="text-center space-y-1">
					<p
						className="text-xs font-medium"
						style={{ color: "var(--text-secondary)" }}
					>
						No suggestion yet
					</p>
					<p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
						Click "Generate" on the node to create one
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			<div
				className="rounded-xl border p-3 max-h-[300px] overflow-y-auto scrollbar-thin"
				style={{
					background: "var(--bg-inset)",
					borderColor: "var(--border-subtle)",
				}}
			>
				<MarkdownContent content={content} />
			</div>

			{revising ? (
				<div className="flex flex-col gap-2">
					<textarea
						value={feedback}
						onChange={(e) => setFeedback(e.target.value)}
						placeholder="What should be different?"
						className="min-h-[60px] rounded-lg border p-2.5 text-xs resize-none focus:outline-none"
						style={{
							background: "var(--bg-inset)",
							borderColor: "var(--border-subtle)",
							color: "var(--text-primary)",
						}}
						autoFocus
					/>
					<div className="flex gap-1.5">
						<button
							onClick={handleRevise}
							disabled={!feedback.trim()}
							className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
							style={{
								background: "var(--cyan-glow)",
								border: "1px solid rgba(91, 155, 213, 0.2)",
								color: "var(--accent-primary)",
							}}
						>
							Submit revision
						</button>
						<button
							onClick={() => setRevising(false)}
							className="rounded-lg px-3 py-1.5 text-xs font-medium"
							style={{ color: "var(--text-muted)" }}
						>
							Cancel
						</button>
					</div>
				</div>
			) : (
				<div className="flex flex-col gap-2">
					<button
						onClick={handleAccept}
						className="flex items-center justify-center gap-2 w-full rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
						style={{
							background:
								"linear-gradient(135deg, rgba(107, 207, 127, 0.14), rgba(107, 207, 127, 0.06))",
							border: "1px solid rgba(107, 207, 127, 0.3)",
							color: "var(--emerald-400)",
							boxShadow: "0 2px 8px rgba(107, 207, 127, 0.08)",
						}}
					>
						<CheckCircle size={13} />
						Accept suggestion
					</button>
					<div className="flex gap-1.5">
						<button
							onClick={() => setRevising(true)}
							className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
							style={{
								background: "var(--cyan-glow)",
								border: "1px solid rgba(91, 155, 213, 0.2)",
								color: "var(--accent-primary)",
							}}
						>
							<PenLine size={11} />
							Revise
						</button>
						<button
							onClick={onSwitchToNotes}
							className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium transition-all duration-200 active:scale-[0.98]"
							style={{
								background: "rgba(255,255,255,0.03)",
								border: "1px solid var(--border-subtle)",
								color: "var(--text-tertiary)",
							}}
						>
							Do manually
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
