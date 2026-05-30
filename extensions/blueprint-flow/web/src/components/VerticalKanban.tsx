import {
	Boxes,
	Brain,
	Check,
	ChevronDown,
	ChevronRight,
	CircleDot,
	ClipboardList,
	Clock,
	Code,
	FileText,
	Inbox,
	Loader2,
	MessageSquare,
	Palette,
	Search,
	ShieldCheck,
	Sparkles,
	Workflow,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { STEP_LABELS } from "../constants/steps";
import { api } from "../lib/api";
import type { ActionRun } from "../store";
import { useStore } from "../store";
import { InlineActionRuns } from "./InlineActionRuns";
import { InlineArtifactViewer } from "./InlineArtifactViewer";
import { InlineInterviewSection } from "./InlineInterviewSection";
import { InlineStepTabs, type StepTab } from "./InlineStepTabs";
import { StepActions } from "./StepActions";
import { DesignCanvas } from "./design/DesignCanvas";

const STEP_ICONS: Record<string, React.ReactNode> = {
	intake: <Inbox size={13} />,
	research: <Search size={13} />,
	interview: <MessageSquare size={13} />,
	spec: <FileText size={13} />,
	ddd: <Boxes size={13} />,
	design: <Palette size={13} />,
	behavior: <Workflow size={13} />,
	implementation_plan: <ClipboardList size={13} />,
	implementation: <Code size={13} />,
	review: <ShieldCheck size={13} />,
	memory_update: <Brain size={13} />,
};

const FALLBACK_LABELS = STEP_LABELS;

export function VerticalKanban() {
	const {
		steps,
		artifacts,
		actionRuns,
		selectedFeatureId,
		selectedProjectId,
		activeWorkflow,
		setActiveWorkflow,
	} = useStore();
	const currentFeature = useStore((s) =>
		s.features.find((f) => f.id === s.selectedFeatureId),
	);
	const [expandedStep, setExpandedStep] = useState<string | null>(null);
	const [focusedIndex, setFocusedIndex] = useState<number>(-1);
	const [celebratingStep, setCelebratingStep] = useState<string | null>(null);
	const [hoveredStep, setHoveredStep] = useState<string | null>(null);
	const prevStepsRef = useRef<typeof steps>([]);

	// Detect step completion for celebration
	useEffect(() => {
		if (prevStepsRef.current.length > 0 && steps.length > 0) {
			for (const step of steps) {
				const prev = prevStepsRef.current.find((s) => s.id === step.id);
				if (prev && prev.status !== "done" && step.status === "done") {
					setCelebratingStep(step.name);
					setTimeout(() => setCelebratingStep(null), 1200);
				}
			}
		}
		prevStepsRef.current = steps;
	}, [steps]);

	// Keyboard navigation handler
	const handleStepNav = useCallback(
		(e: Event) => {
			const detail = (e as CustomEvent).detail;
			if (steps.length === 0) return;

			if (detail === "next") {
				setFocusedIndex((prev) => Math.min(prev + 1, steps.length - 1));
			} else if (detail === "prev") {
				setFocusedIndex((prev) => Math.max(prev - 1, 0));
			} else if (detail === "toggle") {
				if (focusedIndex >= 0 && focusedIndex < steps.length) {
					const stepName = steps[focusedIndex].name;
					setExpandedStep((prev) => (prev === stepName ? null : stepName));
				}
			}
		},
		[steps, focusedIndex],
	);

	useEffect(() => {
		window.addEventListener("blueprint:step-nav", handleStepNav);
		return () =>
			window.removeEventListener("blueprint:step-nav", handleStepNav);
	}, [handleStepNav]);

	// Load active workflow for label resolution
	useEffect(() => {
		if (selectedProjectId) {
			api.workflows
				.getProjectWorkflow(selectedProjectId)
				.then(setActiveWorkflow)
				.catch(() => {});
		}
	}, [selectedProjectId, setActiveWorkflow]);

	// Auto-expand running step
	useEffect(() => {
		const runningStep = steps.find((s) => s.status === "running");
		if (runningStep) {
			setExpandedStep(runningStep.name);
		}
	}, [steps]);

	// Build label map from active workflow
	const labelMap: Record<string, string> = {};
	if (activeWorkflow?.steps) {
		for (const s of activeWorkflow.steps) {
			labelMap[s.name] = s.label;
		}
	}

	// Calculate progress
	const doneCount = steps.filter((s) => s.status === "done").length;
	const progressPercent = steps.length > 0 ? (doneCount / steps.length) * 100 : 0;

	// Determine ambient glow based on current state
	const currentStepStatus = steps.find(
		(s) => s.name === currentFeature?.current_step,
	)?.status;
	const ambientClass =
		currentStepStatus === "running"
			? "ambient-glow-running"
			: currentStepStatus === "needs_user"
				? "ambient-glow-needs_user"
				: doneCount === steps.length && steps.length > 0
					? "ambient-glow-done"
					: "";

	if (steps.length === 0) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<StepsSkeleton />
			</div>
		);
	}

	return (
		<div className={`flex flex-1 flex-col overflow-y-auto scrollbar-thin p-5 ${ambientClass}`}>
			{/* Header with progress */}
			<div className="mb-4">
				<div className="flex items-center justify-between mb-2">
					<h2 className="section-label">Development Flow</h2>
					<div className="flex items-center gap-3">
						{activeWorkflow && !activeWorkflow.is_default && (
							<span
								className="rounded-md px-2 py-0.5 font-mono text-[10px]"
								style={{
									background: "rgba(245, 158, 11, 0.08)",
									border: "1px solid rgba(245, 158, 11, 0.15)",
									color: "var(--amber-300)",
								}}
							>
								{activeWorkflow.name}
							</span>
						)}
						<span className="font-mono text-[10px] text-[var(--text-tertiary)]">
							{doneCount}/{steps.length}
						</span>
					</div>
				</div>
				{/* Progress bar */}
				<div className="flow-progress-bar">
					<div
						className="flow-progress-fill"
						style={{ width: `${progressPercent}%` }}
					/>
				</div>
			</div>

			{/* Timeline */}
			<div className="relative flex-1">
				{steps.map((step, index) => {
					const isLast = index === steps.length - 1;
					const label =
						labelMap[step.name] || FALLBACK_LABELS[step.name] || step.name;
					const icon = STEP_ICONS[step.name] || <CircleDot size={13} />;
					const isActive =
						step.status === "running" || step.status === "needs_user";
					const isCurrentStep = currentFeature?.current_step === step.name;
					const isExpanded = expandedStep === step.name;
					const isFocused = focusedIndex === index;
					const isCelebrating = celebratingStep === step.name;
					const isHovered = hoveredStep === step.name;
					const stepArtifacts = artifacts.filter(
						(a) => a.step_name === step.name,
					);
					const stepRuns = actionRuns.filter(
						(r) =>
							r.step_name === step.name &&
							r.feature_id === selectedFeatureId,
					);
					const latestRun = stepRuns[0];

					// Detect "queued" state: pending step with an action run enqueued
					const isQueued =
						step.status === "pending" &&
						stepRuns.some((r) =>
							["created", "queued", "waiting_for_pi", "injected"].includes(r.status),
						);

					// Connector class
					const connectorClass =
						step.status === "done"
							? "timeline-connector-done"
							: isActive
								? "timeline-connector-active"
								: isQueued
									? "timeline-connector-queued"
									: "";

					// Node class
					const nodeClass =
						step.status === "done"
							? "timeline-node-done"
							: step.status === "running"
								? "timeline-node-running"
								: step.status === "needs_user"
									? "timeline-node-needs_user"
									: isQueued
										? "timeline-node-queued"
										: "";

					return (
						<div
							key={step.id}
							className="relative flex gap-4 animate-step-slide-in"
							style={{ animationDelay: `${index * 30}ms` }}
							onMouseEnter={() => setHoveredStep(step.name)}
							onMouseLeave={() => setHoveredStep(null)}
						>
							{/* Timeline track */}
							<div className="relative flex flex-col items-center">
								{/* Connector line */}
								{!isLast && (
									<div
										className={`absolute top-[28px] left-1/2 -translate-x-1/2 w-[2px] h-[calc(100%-28px)] ${connectorClass}`}
										style={{
											background: connectorClass
												? undefined
												: "var(--border-subtle)",
										}}
									/>
								)}

								{/* Node */}
								<div
									className={`timeline-node ${nodeClass} ${isFocused ? "timeline-node-focused" : ""} ${isCelebrating ? "animate-celebrate-pop" : ""}`}
								>
									{step.status === "done" ? (
										<Check size={12} className="text-emerald-400" />
									) : step.status === "running" ? (
										<Loader2
											size={12}
											className="text-cyan-400 animate-spin"
										/>
									) : isQueued ? (
										<Loader2
											size={12}
											className="text-sky-400 animate-spin"
											style={{ animationDuration: "2s" }}
										/>
									) : (
										<span
											className={
												isActive
													? "text-amber-400"
													: "text-[var(--text-muted)]"
											}
										>
											{icon}
										</span>
									)}
								</div>

								{/* Celebration ripple */}
								{isCelebrating && (
									<div className="absolute top-0 left-1/2 -translate-x-1/2">
										<div className="w-7 h-7 rounded-full bg-emerald-400/30 animate-celebrate-ripple" />
									</div>
								)}
							</div>

							{/* Step content */}
							<div
								className={`flex-1 pb-5 min-w-0 ${isLast ? "pb-0" : ""}`}
							>
								{/* Step header row */}
								<div
									className={`group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-all duration-200 ${
										isExpanded || isActive
											? "bg-[var(--bg-surface)]"
											: "hover:bg-[var(--bg-surface-hover)]"
									} ${isFocused ? "ring-1 ring-amber-400/40" : ""} ${
										isExpanded
											? step.status === "done"
												? "step-accent-done"
												: step.status === "running"
													? "step-accent-running"
													: isQueued
														? "step-accent-queued"
														: step.status === "needs_user"
															? "step-accent-needs_user"
															: ""
											: ""
									}`}
									onClick={() =>
										setExpandedStep(
											isExpanded ? null : step.name,
										)
									}
								>
									<span
										className={`text-sm font-medium transition-colors ${
											step.status === "done"
												? "text-emerald-400/80"
												: isActive
													? "text-cyan-300"
													: "text-[var(--text-secondary)]"
										}`}
									>
										{label}
									</span>

									{/* Inline badges */}
									<div className="flex items-center gap-1.5 ml-auto">
										{stepArtifacts.length > 0 && (
											<span className="rounded bg-[var(--bg-surface)] px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)] font-mono">
												{stepArtifacts.length}
											</span>
										)}
										{step.status === "running" &&
											step.started_at && (
												<ElapsedBadge
													startedAt={step.started_at}
												/>
											)}
										<StepStatusPill status={step.status} isQueued={isQueued} />
										<span className="text-[var(--text-muted)] transition-transform group-hover:text-[var(--text-tertiary)]">
											{isExpanded ? (
												<ChevronDown size={12} />
											) : (
												<ChevronRight size={12} />
											)}
										</span>
									</div>
								</div>

								{/* Hover preview (when not expanded) */}
								{isHovered &&
									!isExpanded &&
									(stepArtifacts.length > 0 ||
										(latestRun && isActive)) && (
										<HoverPreview
											artifacts={stepArtifacts}
											latestRun={latestRun}
											isActive={isActive}
										/>
									)}

								{/* Running indicator (always visible) */}
								{step.status === "running" &&
									latestRun &&
									!isExpanded && (
										<div className="mt-1 ml-3 flex items-center gap-2 text-xs text-cyan-400/70">
											<Loader2
												size={10}
												className="animate-spin"
											/>
											<span className="truncate">
												{latestRun.action_type.replace(
													/_/g,
													" ",
												)}{" "}
												— {latestRun.status}
											</span>
										</div>
									)}

								{/* Expanded content */}
								{isExpanded && (
									<ExpandedStepContent
										step={step}
										stepArtifacts={stepArtifacts}
										stepRuns={stepRuns}
										isActive={isActive}
										isCurrentStep={isCurrentStep}
										selectedFeatureId={selectedFeatureId}
									/>
								)}

								{/* Collapsed: show actions for active/current */}
								{!isExpanded &&
									selectedFeatureId &&
									isActive && (
										<div className="ml-3 mt-1">
											<StepActions
												featureId={selectedFeatureId}
												stepId={step.id}
												stepName={step.name}
												stepStatus={step.status}
												isCurrentStep={isCurrentStep}
											/>
										</div>
									)}
							</div>
						</div>
					);
				})}
			</div>

			{/* Completion celebration overlay */}
			{doneCount === steps.length && steps.length > 0 && (
				<FlowCompleteBanner />
			)}
		</div>
	);
}

// --- Sub-components ---

function ExpandedStepContent({
	step,
	stepArtifacts,
	stepRuns,
	isActive,
	isCurrentStep,
	selectedFeatureId,
}: {
	step: { id: string; name: string; status: string; started_at: string | null; completed_at: string | null };
	stepArtifacts: Array<{ id: string; filename: string; type: string }>;
	stepRuns: ActionRun[];
	isActive: boolean;
	isCurrentStep: boolean;
	selectedFeatureId: string | null;
}) {
	const [activeTab, setActiveTab] = useState<StepTab>("actions");
	const { interviews } = useStore();
	const showInterview = step.name === "interview";
	const showDesign = step.name === "design";
	const interviewCount = showInterview ? interviews.filter((i) => i.answer === null).length : 0;

	return (
		<div className="mt-2 ml-3 space-y-3 animate-fade-up">
			{/* Tabs */}
			<InlineStepTabs
				activeTab={activeTab}
				onTabChange={setActiveTab}
				actionCount={stepRuns.length}
				artifactCount={stepArtifacts.length}
				interviewCount={interviewCount}
				showInterview={showInterview}
			/>

			{/* Tab content */}
			<div className="min-h-[60px]">
				{activeTab === "actions" && selectedFeatureId && (
					<InlineActionRuns stepName={step.name} featureId={selectedFeatureId} />
				)}
				{activeTab === "artifacts" && selectedFeatureId && (
					<InlineArtifactViewer stepName={step.name} featureId={selectedFeatureId} />
				)}
				{activeTab === "interview" && selectedFeatureId && showInterview && (
					<InlineInterviewSection featureId={selectedFeatureId} />
				)}
			</div>

			{/* Design canvas for design step */}
			{showDesign && selectedFeatureId && (
				<div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden h-[400px]">
					<DesignCanvas featureId={selectedFeatureId} />
				</div>
			)}

			{/* Step actions */}
			{selectedFeatureId && (isActive || isCurrentStep) && (
				<StepActions
					featureId={selectedFeatureId}
					stepId={step.id}
					stepName={step.name}
					stepStatus={step.status}
					isCurrentStep={isCurrentStep}
				/>
			)}

			{/* Timestamps */}
			{step.started_at && (
				<p className="text-[10px] text-[var(--text-muted)] font-mono">
					Started: {new Date(step.started_at).toLocaleString()}
					{step.completed_at && (
						<>
							{" "}— Done: {new Date(step.completed_at).toLocaleString()}
						</>
					)}
				</p>
			)}
		</div>
	);
}

function HoverPreview({
	artifacts,
	latestRun,
	isActive,
}: {
	artifacts: Array<{ id: string; filename: string; type: string }>;
	latestRun?: ActionRun;
	isActive: boolean;
}) {
	return (
		<div className="step-hover-preview mt-1 ml-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-[11px]">
			{artifacts.length > 0 && (
				<div className="flex items-center gap-1 text-[var(--text-tertiary)]">
					<FileText size={10} />
					<span>
						{artifacts.length} artifact{artifacts.length > 1 ? "s" : ""}:{" "}
						{artifacts
							.slice(0, 3)
							.map((a) => a.filename)
							.join(", ")}
						{artifacts.length > 3 && ` +${artifacts.length - 3}`}
					</span>
				</div>
			)}
			{isActive && latestRun && (
				<div className="flex items-center gap-1 text-cyan-400/70 mt-0.5">
					<Loader2 size={9} className="animate-spin" />
					<span>{latestRun.action_type.replace(/_/g, " ")}</span>
				</div>
			)}
		</div>
	);
}

function ElapsedBadge({ startedAt }: { startedAt: string }) {
	const [elapsed, setElapsed] = useState("");

	useEffect(() => {
		const start = new Date(startedAt).getTime();
		const update = () => {
			const diff = Math.floor((Date.now() - start) / 1000);
			const m = Math.floor(diff / 60);
			const s = diff % 60;
			setElapsed(m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`);
		};
		update();
		const interval = setInterval(update, 1000);
		return () => clearInterval(interval);
	}, [startedAt]);

	return (
		<span className="flex items-center gap-0.5 rounded-md bg-cyan-950/30 border border-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-400 font-mono">
			<Clock size={9} />
			{elapsed}
		</span>
	);
}

function StepStatusPill({ status, isQueued }: { status: string; isQueued?: boolean }) {
	const config: Record<string, { text: string; className: string }> = {
		queued: {
			text: "queued",
			className: "text-sky-300 bg-sky-950/30 border-sky-500/15",
		},
		pending: {
			text: "pending",
			className: "text-[var(--text-muted)] bg-[var(--bg-surface)]",
		},
		running: {
			text: "running",
			className: "text-cyan-300 bg-cyan-950/30 border-cyan-500/15",
		},
		needs_user: {
			text: "needs input",
			className: "text-amber-300 bg-amber-950/30 border-amber-500/15",
		},
		blocked: {
			text: "blocked",
			className: "text-rose-300 bg-rose-950/30 border-rose-500/15",
		},
		done: {
			text: "done",
			className: "text-emerald-400 bg-emerald-950/30 border-emerald-500/15",
		},
		rejected: {
			text: "rejected",
			className: "text-rose-400 bg-rose-950/30 border-rose-500/15",
		},
	};

	const effectiveStatus = isQueued ? "queued" : status;
	const { text, className } = config[effectiveStatus] || config.pending;

	return (
		<span
			className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-medium ${className}`}
		>
			{text}
		</span>
	);
}

function StepRunTimeline({ runs }: { runs: ActionRun[] }) {
	return (
		<div className="space-y-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-inset)] p-2.5">
			<p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">
				Run History
			</p>
			{runs.slice(0, 5).map((run) => (
				<div key={run.id} className="flex items-center gap-2 text-[11px]">
					<RunStatusDot status={run.status} />
					<span className="text-[var(--text-tertiary)] truncate flex-1">
						{run.action_type.replace(/_/g, " ")}
					</span>
					<span className="text-[var(--text-muted)] shrink-0 font-mono">
						{run.status === "completed"
							? "done"
							: run.status === "failed"
								? "failed"
								: run.status}
					</span>
				</div>
			))}
		</div>
	);
}

function RunStatusDot({ status }: { status: string }) {
	const colors: Record<string, string> = {
		completed: "bg-emerald-400",
		failed: "bg-red-400",
		running: "bg-cyan-400 animate-pulse",
		agent_running: "bg-fuchsia-400 animate-pulse",
		tool_running: "bg-cyan-400 animate-pulse",
		queued: "bg-sky-400",
		cancelled: "bg-[var(--text-muted)]",
	};
	const color = colors[status] ?? "bg-[var(--text-muted)]";
	return <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${color}`} />;
}

function StepsSkeleton() {
	return (
		<div className="w-full max-w-md space-y-3 p-6">
			{Array.from({ length: 5 }).map((_, i) => (
				<div key={i} className="flex items-center gap-3">
					<div className="skeleton h-7 w-7 rounded-full" />
					<div className="flex-1 space-y-1.5">
						<div className="skeleton h-3 w-3/4 rounded" />
						<div className="skeleton h-2 w-1/2 rounded" />
					</div>
				</div>
			))}
			<p className="text-center font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mt-4">
				Loading flow steps...
			</p>
		</div>
	);
}

function FlowCompleteBanner() {
	return (
		<div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-950/10 px-5 py-4 text-center animate-fade-up">
			<div className="flex items-center justify-center gap-2 mb-1">
				<Sparkles size={16} className="text-emerald-400" />
				<span className="font-display text-lg text-emerald-300">
					Flow Complete
				</span>
				<Sparkles size={16} className="text-emerald-400" />
			</div>
			<p className="text-xs text-emerald-400/60 font-mono">
				All steps done — feature ready for deployment
			</p>
		</div>
	);
}
