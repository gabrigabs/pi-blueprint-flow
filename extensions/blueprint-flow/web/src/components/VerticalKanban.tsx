import {
	Boxes,
	Brain,
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
	Search,
	ShieldCheck,
	Workflow,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { ActionRun } from "../store";
import { useStore } from "../store";
import { StepActions } from "./StepActions";

const STEP_ICONS: Record<string, React.ReactNode> = {
	intake: <Inbox size={14} />,
	research: <Search size={14} />,
	interview: <MessageSquare size={14} />,
	spec: <FileText size={14} />,
	ddd: <Boxes size={14} />,
	behavior: <Workflow size={14} />,
	implementation_plan: <ClipboardList size={14} />,
	implementation: <Code size={14} />,
	review: <ShieldCheck size={14} />,
	memory_update: <Brain size={14} />,
};

const FALLBACK_LABELS: Record<string, string> = {
	intake: "Intake",
	research: "Research",
	interview: "Interview",
	spec: "Specification",
	ddd: "Domain Modeling",
	behavior: "Behavior Scenarios",
	implementation_plan: "Implementation Plan",
	implementation: "Implementation",
	review: "Review Gate",
	memory_update: "Memory Update",
};

const STATUS_STYLES: Record<
	string,
	{ bg: string; text: string; border: string; glow?: string }
> = {
	pending: {
		bg: "bg-[var(--bg-surface)]",
		text: "text-[var(--text-tertiary)]",
		border: "border-[var(--border-subtle)]",
	},
	running: {
		bg: "bg-[rgba(34,211,238,0.04)]",
		text: "text-cyan-300",
		border: "border-cyan-500/20",
		glow: "instrument-glow-cyan",
	},
	needs_user: {
		bg: "bg-[rgba(245,158,11,0.04)]",
		text: "text-amber-300",
		border: "border-amber-500/20",
		glow: "instrument-glow-amber",
	},
	blocked: {
		bg: "bg-[rgba(244,63,94,0.04)]",
		text: "text-rose-300",
		border: "border-rose-500/20",
	},
	done: {
		bg: "bg-[rgba(52,211,153,0.03)]",
		text: "text-emerald-400",
		border: "border-emerald-500/15",
	},
	rejected: {
		bg: "bg-[rgba(244,63,94,0.03)]",
		text: "text-rose-400",
		border: "border-rose-500/15",
	},
};

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

	// Keyboard navigation handler
	const handleStepNav = useCallback(
		(e: Event) => {
			const detail = (e as CustomEvent).detail;
			if (steps.length === 0) return;

			if (detail === "next") {
				setFocusedIndex((prev) => {
					const next = Math.min(prev + 1, steps.length - 1);
					return next;
				});
			} else if (detail === "prev") {
				setFocusedIndex((prev) => {
					const next = Math.max(prev - 1, 0);
					return next;
				});
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

	if (steps.length === 0) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<p
					className="font-mono text-xs uppercase tracking-widest"
					style={{ color: "var(--text-muted)" }}
				>
					No flow steps loaded
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col gap-1.5 overflow-y-auto scrollbar-thin p-4">
			<div className="mb-3 flex items-center justify-between">
				<h2 className="section-label">Development Flow</h2>
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
			</div>
			{steps.map((step, index) => {
				const style = STATUS_STYLES[step.status] || STATUS_STYLES.pending;
				const stepArtifacts = artifacts.filter(
					(a) => a.step_name === step.name,
				);
				const stepRuns = actionRuns.filter(
					(r) =>
						r.step_name === step.name && r.feature_id === selectedFeatureId,
				);
				const isActive =
					step.status === "running" || step.status === "needs_user";
				const isCurrentStep = currentFeature?.current_step === step.name;
				const isExpanded = expandedStep === step.name;
				const isFocused = focusedIndex === index;
				const label =
					labelMap[step.name] || FALLBACK_LABELS[step.name] || step.name;
				const icon = STEP_ICONS[step.name] || <CircleDot size={14} />;
				const latestRun = stepRuns[0];

				return (
					<div
						key={step.id}
						className={`rounded-lg border px-3.5 py-2.5 transition-all ${style.bg} ${style.border} ${
							isActive ? (style.glow ?? "") : ""
						} ${isFocused ? "ring-1 ring-amber-400/50" : ""}`}
					>
						{/* Step header */}
						<div
							className="flex items-center justify-between cursor-pointer"
							onClick={() => setExpandedStep(isExpanded ? null : step.name)}
						>
							<div className="flex items-center gap-2">
								<span className={style.text}>{icon}</span>
								<span className={`text-sm font-medium ${style.text}`}>
									{label}
								</span>
								{step.status === "running" && <RunningSpinner />}
							</div>
							<div className="flex items-center gap-2">
								{stepArtifacts.length > 0 && (
									<span className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-400">
										{stepArtifacts.length} artifact
										{stepArtifacts.length > 1 ? "s" : ""}
									</span>
								)}
								{step.status === "running" && step.started_at && (
									<ElapsedBadge startedAt={step.started_at} />
								)}
								<StepStatusBadge status={step.status} />
								<span
									className={`text-gray-600 transition-transform ${isExpanded ? "rotate-90" : ""}`}
								>
									{isExpanded ? (
										<ChevronDown size={12} />
									) : (
										<ChevronRight size={12} />
									)}
								</span>
							</div>
						</div>

						{/* Running step summary (always visible when running) */}
						{step.status === "running" && latestRun && !isExpanded && (
							<div className="mt-1.5 flex items-center gap-2 text-xs text-blue-400/70">
								<Loader2 size={10} className="animate-spin" />
								<span className="truncate">
									{latestRun.action_type.replace(/_/g, " ")} —{" "}
									{latestRun.status}
								</span>
							</div>
						)}

						{/* Expanded content */}
						{isExpanded && (
							<div className="mt-2 space-y-2">
								{/* Action timeline for this step */}
								{stepRuns.length > 0 && <StepRunTimeline runs={stepRuns} />}

								{/* Step artifacts summary */}
								{stepArtifacts.length > 0 && (
									<div className="flex flex-wrap gap-1">
										{stepArtifacts.map((a) => (
											<button
												key={a.id}
												onClick={(e) => {
													e.stopPropagation();
													useStore.getState().selectArtifact(a.id);
												}}
												className="rounded bg-gray-800/80 px-1.5 py-0.5 text-[10px] text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors"
											>
												{a.filename}
											</button>
										))}
									</div>
								)}

								{/* Step actions (run/advance/back) */}
								{selectedFeatureId && (isActive || isCurrentStep) && (
									<StepActions
										featureId={selectedFeatureId}
										stepId={step.id}
										stepName={step.name}
										stepStatus={step.status}
										isCurrentStep={isCurrentStep}
									/>
								)}

								{/* Started/completed timestamps */}
								{step.started_at && (
									<p className="text-[10px] text-gray-600">
										Started: {new Date(step.started_at).toLocaleString()}
										{step.completed_at && (
											<>
												{" "}
												— Completed:{" "}
												{new Date(step.completed_at).toLocaleString()}
											</>
										)}
									</p>
								)}
							</div>
						)}

						{/* Collapsed: show actions only for active/current step */}
						{!isExpanded && selectedFeatureId && isActive && (
							<StepActions
								featureId={selectedFeatureId}
								stepId={step.id}
								stepName={step.name}
								stepStatus={step.status}
								isCurrentStep={isCurrentStep}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
}

// --- Sub-components ---

function RunningSpinner() {
	return (
		<span className="relative flex h-2 w-2">
			<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-50" />
			<span className="relative inline-flex h-2 w-2 rounded-full bg-blue-400" />
		</span>
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
		<span className="flex items-center gap-0.5 rounded bg-blue-900/30 px-1.5 py-0.5 text-[10px] text-blue-400 font-mono">
			<Clock size={9} />
			{elapsed}
		</span>
	);
}

function StepRunTimeline({ runs }: { runs: ActionRun[] }) {
	return (
		<div className="space-y-1 rounded border border-gray-800 bg-gray-900/50 p-2">
			<p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-1">
				Run History
			</p>
			{runs.slice(0, 5).map((run) => (
				<div key={run.id} className="flex items-center gap-2 text-[11px]">
					<RunStatusDot status={run.status} />
					<span className="text-gray-400 truncate flex-1">
						{run.action_type.replace(/_/g, " ")}
					</span>
					<span className="text-gray-600 shrink-0">
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
		running: "bg-blue-400 animate-pulse",
		agent_running: "bg-fuchsia-400 animate-pulse",
		tool_running: "bg-cyan-400 animate-pulse",
		queued: "bg-sky-400",
		cancelled: "bg-gray-500",
	};
	const color = colors[status] ?? "bg-gray-500";
	return <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${color}`} />;
}

function StepStatusBadge({ status }: { status: string }) {
	const labels: Record<string, string> = {
		pending: "pending",
		running: "running",
		needs_user: "needs input",
		blocked: "blocked",
		done: "done",
		rejected: "rejected",
	};

	const style = STATUS_STYLES[status] || STATUS_STYLES.pending;

	return (
		<span
			className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-medium ${style.text} ${style.bg}`}
		>
			{labels[status] || status}
		</span>
	);
}
