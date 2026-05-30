import { FileText, Loader2, Play, SkipForward, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { STEP_LABELS } from "../../constants/steps";
import { api } from "../../lib/api";
import { useStore } from "../../store";
import { InlineActionRuns } from "../InlineActionRuns";
import { InlineInterviewSection } from "../InlineInterviewSection";
import { MarkdownContent } from "../MarkdownContent";

type Tab = "artifacts" | "activity" | "interview";

export function StepDetailDrawer() {
	const { selectedNodeId, selectedFeatureId, selectNode, steps, artifacts, actionRuns, interviews } = useStore();
	const step = steps.find((s) => s.id === selectedNodeId);
	const [activeTab, setActiveTab] = useState<Tab>("artifacts");
	const [artifactContent, setArtifactContent] = useState<string>("");
	const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
	const [loadingContent, setLoadingContent] = useState(false);
	const artifactContentVersion = useStore((s) => s.artifactContentVersion);

	useEffect(() => { setActiveTab("artifacts"); setSelectedArtifactId(null); }, [selectedNodeId]);

	useEffect(() => {
		if (!selectedArtifactId) { setArtifactContent(""); return; }
		setLoadingContent(true);
		fetch(`/api/artifacts/${selectedArtifactId}`)
			.then((r) => r.json())
			.then((data) => { if (data.content) setArtifactContent(data.content); })
			.catch(() => {})
			.finally(() => setLoadingContent(false));
	}, [selectedArtifactId, artifactContentVersion]);

	if (!step || !selectedFeatureId) return null;

	const stepArtifacts = artifacts.filter((a) => a.step_name === step.name);
	const showInterview = step.name === "interview";
	const pendingInterviews = interviews.filter((i) => !i.answer);
	const isActive = step.status === "running" || step.status === "needs_user" || step.status === "pending";

	const tabs: { id: Tab; label: string; count?: number }[] = [
		{ id: "artifacts", label: "Artifacts", count: stepArtifacts.length },
		{ id: "activity", label: "Activity" },
	];
	if (showInterview) tabs.push({ id: "interview", label: "Interview", count: pendingInterviews.length });

	async function handleRun() {
		if (!selectedFeatureId) return;
		try { await api.features.runStep(selectedFeatureId); } catch {}
	}

	async function handleAdvance() {
		if (!selectedFeatureId) return;
		try { await api.features.advance(selectedFeatureId); } catch {}
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
			<div className="flex items-center justify-between px-5 py-3.5 border-b shrink-0" style={{ borderColor: "var(--border-subtle)" }}>
				<div className="flex items-center gap-2.5 min-w-0">
					<h3 className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
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
							color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-tertiary)",
							background: activeTab === tab.id ? "var(--bg-surface)" : "transparent",
						}}
					>
						{tab.label}
						{tab.count != null && tab.count > 0 && (
							<span
								className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold"
								style={{
									background: activeTab === tab.id ? "rgba(91, 155, 213, 0.15)" : "rgba(255,255,255,0.04)",
									color: activeTab === tab.id ? "var(--cyan-400)" : "var(--text-muted)",
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
					<InlineActionRuns stepName={step.name} featureId={selectedFeatureId} />
				)}
				{activeTab === "interview" && showInterview && (
					<InlineInterviewSection featureId={selectedFeatureId} />
				)}
			</div>

			{/* Step actions */}
			{isActive && step.status !== "done" && (
				<div className="border-t px-5 py-3 shrink-0 flex items-center gap-2" style={{ borderColor: "var(--border-subtle)" }}>
					{(step.status === "pending" || step.status === "needs_user") && (
						<button
							onClick={handleRun}
							className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-all hover:brightness-110"
							style={{
								color: "var(--accent-primary)",
								background: "var(--cyan-glow)",
								border: "1px solid rgba(91, 155, 213, 0.2)",
							}}
						>
							<Play size={11} /> Run Step
						</button>
					)}
					<button
						onClick={handleAdvance}
						className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors hover:bg-[var(--bg-surface-hover)]"
						style={{ color: "var(--text-tertiary)" }}
					>
						<SkipForward size={11} /> Skip
					</button>
				</div>
			)}
		</div>
	);
}

function StatusPill({ status }: { status: string }) {
	const config: Record<string, { bg: string; color: string }> = {
		done: { bg: "var(--emerald-glow)", color: "var(--accent-success)" },
		running: { bg: "var(--cyan-glow)", color: "var(--accent-primary)" },
		needs_user: { bg: "var(--amber-glow)", color: "var(--amber-400)" },
		blocked: { bg: "var(--rose-glow)", color: "var(--rose-400)" },
		pending: { bg: "rgba(255,255,255,0.03)", color: "var(--text-muted)" },
	};
	const c = config[status] ?? config.pending;
	return (
		<span className="rounded-md px-2 py-0.5 text-[10px] font-mono font-medium" style={{ background: c.bg, color: c.color }}>
			{status}
		</span>
	);
}

function ArtifactsTab({ artifacts, selectedId, onSelect, content, loading }: {
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
				<p className="text-xs" style={{ color: "var(--text-muted)" }}>No artifacts generated yet</p>
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
							background: selectedId === a.id ? "var(--bg-surface)" : "rgba(255,255,255,0.02)",
							border: `1px solid ${selectedId === a.id ? "var(--border-strong)" : "var(--border-subtle)"}`,
							color: selectedId === a.id ? "var(--text-primary)" : "var(--text-secondary)",
						}}
					>
						<FileText size={11} className="shrink-0" style={{ color: "var(--text-muted)" }} />
						<span className="truncate max-w-[120px]">{a.filename}</span>
					</button>
				))}
			</div>

			{/* Content viewer */}
			{selectedId && (
				<div
					className="mt-3 rounded-xl border overflow-hidden"
					style={{ background: "var(--bg-inset)", borderColor: "var(--border-subtle)" }}
				>
					{loading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 size={16} className="animate-spin" style={{ color: "var(--text-muted)" }} />
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
