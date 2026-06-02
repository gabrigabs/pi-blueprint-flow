import { Handle, type NodeProps, Position } from "@xyflow/react";
import {
	ArrowLeft,
	BookOpen,
	Bot,
	Brain,
	CheckCircle,
	CircleDot,
	Code2,
	FileSearch,
	FileText,
	GitBranch,
	Hand,
	Layers,
	Loader2,
	type LucideIcon,
	MessageCircle,
	Microscope,
	PenTool,
	Play,
	RefreshCw,
	Shield,
	SkipForward,
	Sparkles,
	Square,
	X,
	Zap,
} from "lucide-react";
import { type MouseEvent, memo, useEffect, useRef, useState } from "react";
import { api, mapExecutionMode } from "../../lib/api";
import { useStore } from "../../store";
import { ArtifactChip } from "./ArtifactChip";
import type { EditStepNodeData, StepNodeData } from "./layout";
import { NODE_HEIGHT, NODE_HEIGHT_EXPANDED, NODE_WIDTH } from "./layout";

const STEP_ICONS: Record<string, LucideIcon> = {
	intake: Zap,
	research: Microscope,
	interview: MessageCircle,
	spec: FileSearch,
	ddd: Brain,
	design: PenTool,
	behavior: Layers,
	implementation_plan: BookOpen,
	implementation: Code2,
	review: Shield,
	memory_update: Sparkles,
};

const STEP_COLORS: Record<string, string> = {
	intake: "#a78bfa",
	research: "#7ec8e3",
	interview: "#fcd34d",
	spec: "#5b9bd5",
	ddd: "#c084fc",
	design: "#f472b6",
	behavior: "#6bcf7f",
	implementation_plan: "#e67e22",
	implementation: "#22d3ee",
	review: "#6bcf7f",
	memory_update: "#a78bfa",
};

const statusConfig: Record<
	string,
	{ bg: string; border: string; text: string; glow: string }
> = {
	done: {
		bg: "rgba(107, 207, 127, 0.04)",
		border: "rgba(107, 207, 127, 0.3)",
		text: "var(--emerald-400)",
		glow: "0 0 20px -6px rgba(107, 207, 127, 0.15)",
	},
	current: {
		bg: "rgba(91, 155, 213, 0.06)",
		border: "rgba(91, 155, 213, 0.35)",
		text: "var(--accent-primary)",
		glow: "0 0 20px -6px rgba(91, 155, 213, 0.15)",
	},
	running: {
		bg: "rgba(91, 155, 213, 0.05)",
		border: "rgba(91, 155, 213, 0.45)",
		text: "var(--accent-primary)",
		glow: "0 0 24px -6px rgba(91, 155, 213, 0.2)",
	},
	needs_user: {
		bg: "rgba(230, 126, 34, 0.04)",
		border: "rgba(230, 126, 34, 0.4)",
		text: "var(--amber-400)",
		glow: "0 0 24px -6px rgba(230, 126, 34, 0.15)",
	},
	blocked: {
		bg: "rgba(231, 76, 60, 0.03)",
		border: "rgba(231, 76, 60, 0.25)",
		text: "var(--rose-400)",
		glow: "none",
	},
	pending: {
		bg: "var(--bg-surface)",
		border: "var(--border-default)",
		text: "var(--text-tertiary)",
		glow: "none",
	},
};

function WorkflowStepNodeComponent({
	data,
}: NodeProps & { data: StepNodeData }) {
	const {
		label,
		status,
		stepName,
		stepType,
		optional,
		skipCondition,
		artifactCount,
		artifacts,
		isSelected,
		interviewCount,
		activityCount,
	} = data;
	const config = statusConfig[status] ?? statusConfig.pending;
	const StepIcon = STEP_ICONS[stepName] ?? CircleDot;
	const stepColor = STEP_COLORS[stepName] ?? "var(--accent-primary)";

	const selectArtifact = useStore((s) => s.selectArtifact);
	const selectedFlowId = useStore((s) => s.selectedFlowId);
	const actionRuns = useStore((s) => s.actionRuns);
	const liveToolName = useStore((s) => s.liveToolName);
	const liveActionRunId = useStore((s) => s.liveActionRunId);
	const liveMessagePreview = useStore((s) => s.liveMessagePreview);

	const isLive = status === "running" && liveActionRunId != null;
	const isCurrentStep = Boolean(data.isCurrentStep);
	const activeRun = actionRuns.find(
		(r) =>
			r.flow_id === selectedFlowId &&
			r.step_name === stepName &&
			!["completed", "failed", "cancelled", "not_connected"].includes(r.status),
	);
	const canRunCurrent =
		Boolean(selectedFlowId) &&
		isCurrentStep &&
		!activeRun &&
		(status === "current" ||
			status === "running" ||
			status === "needs_user" ||
			status === "pending");
	const canStop = Boolean(activeRun);
	const canNavigateCurrent = Boolean(selectedFlowId) && isCurrentStep;
	const canReturnToStep = Boolean(selectedFlowId) && status === "done";

	function handleArtifactClick(id: string) {
		selectArtifact(id);
	}

	function stopNodeClick(event: MouseEvent) {
		event.stopPropagation();
	}

	async function handleRun(event: MouseEvent) {
		stopNodeClick(event);
		if (!selectedFlowId) return;
		const { runModelId, runThinkingLevel, executionMode } = useStore.getState();
		try {
			await api.flows.runStep(selectedFlowId, {
				modelId: runModelId ?? undefined,
				thinkingLevel: runThinkingLevel || undefined,
				executionMode: mapExecutionMode(executionMode) || undefined,
			});
		} catch {}
	}

	async function handleStop(event: MouseEvent) {
		stopNodeClick(event);
		if (!activeRun) return;
		try {
			await api.actionRuns.cancel(activeRun.id);
		} catch {
			try {
				await api.actionRuns.forceCancel(activeRun.id);
			} catch {}
		}
		useStore.getState().updateActionRun(activeRun.id, {
			status: "cancelled",
			updated_at: new Date().toISOString(),
		});
		useStore.getState().clearLiveActivity();
	}

	async function handleSkip(event: MouseEvent) {
		stopNodeClick(event);
		if (!selectedFlowId) return;
		try {
			await api.flows.advance(selectedFlowId);
		} catch {}
	}

	async function handleMarkDone(event: MouseEvent) {
		stopNodeClick(event);
		if (!selectedFlowId) return;
		try {
			await api.flows.completeManual(selectedFlowId);
		} catch {}
	}

	async function handleBack(event: MouseEvent) {
		stopNodeClick(event);
		if (!selectedFlowId) return;
		try {
			await api.flows.back(selectedFlowId);
		} catch {}
	}

	async function handleReturn(event: MouseEvent) {
		stopNodeClick(event);
		if (!selectedFlowId) return;
		try {
			await api.flows.focusStep(selectedFlowId, stepName);
		} catch {}
	}

	return (
		<div
			className={`relative rounded-2xl border transition-all duration-200 node-hover ${isLive ? "ring-2 ring-[var(--cyan-400)]/20 animate-pulse" : ""}`}
			style={{
				width: NODE_WIDTH,
				height: isSelected ? NODE_HEIGHT_EXPANDED : NODE_HEIGHT,
				background: config.bg,
				borderColor: isSelected ? "var(--accent-primary)" : config.border,
				boxShadow: isSelected
					? "0 0 0 2px rgba(91, 155, 213, 0.15), 0 12px 40px -8px rgba(0, 0, 0, 0.4)"
					: isLive
						? "0 0 24px -4px rgba(91, 155, 213, 0.3)"
						: config.glow,
				overflow: "hidden",
			}}
		>
			<Handle
				type="target"
				position={Position.Top}
				className="!bg-transparent !w-3 !h-3 !border-2 !border-[var(--border-default)] !-top-1.5"
			/>

			{/* Main content row */}
			<div className="px-5 py-4">
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-3 min-w-0">
						<div
							className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200"
							style={{
								background:
									status === "done"
										? "rgba(107, 207, 127, 0.1)"
										: `${stepColor}12`,
								border: `1.5px solid ${status === "done" ? "rgba(107, 207, 127, 0.25)" : `${stepColor}30`}`,
							}}
						>
							{status === "done" ? (
								<CheckCircle
									size={16}
									style={{ color: "var(--emerald-400)" }}
								/>
							) : status === "running" ? (
								<Loader2
									size={16}
									className="animate-spin"
									style={{ color: config.text }}
								/>
							) : status === "current" ? (
								<div className="relative">
									<StepIcon size={16} style={{ color: config.text }} />
									<span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
								</div>
							) : (
								<StepIcon
									size={16}
									style={{
										color: status === "pending" ? stepColor : config.text,
										opacity: status === "pending" ? 0.6 : 1,
									}}
								/>
							)}
						</div>

						<div className="min-w-0">
							<p
								className="text-[13px] font-medium truncate leading-tight"
								style={{
									color:
										status === "pending"
											? "var(--text-secondary)"
											: status === "done"
												? "var(--text-primary)"
												: config.text,
								}}
							>
								{label}
							</p>
							{isLive && liveToolName ? (
								<p
									className="text-[10px] font-mono mt-0.5 truncate animate-pulse"
									style={{ color: "var(--cyan-400)" }}
								>
									Tool: {liveToolName}
								</p>
							) : isLive && liveMessagePreview ? (
								<p
									className="text-[11px] mt-0.5 truncate max-w-[180px]"
									style={{ color: "var(--text-secondary)" }}
								>
									{liveMessagePreview.slice(-80)}
								</p>
							) : activeRun && !isLive ? (
								<p
									className="text-[10px] font-mono mt-0.5 truncate"
									style={{ color: "var(--amber-400)" }}
								>
									{activeRun.status === "queued"
										? "Queued..."
										: activeRun.status === "waiting_for_pi"
											? "Waiting for Pi..."
											: activeRun.status === "injected"
												? "Starting..."
												: activeRun.status}
								</p>
							) : (
								<p
									className="text-[10px] font-mono mt-0.5"
									style={{ color: "var(--text-muted)" }}
								>
									{stepName}
								</p>
							)}
						</div>
					</div>

					{/* Badges */}
					<div className="flex items-center gap-1.5 shrink-0">
						{status === "current" && data.hasCompletedRuns && !activeRun && (
							<div
								className="flex items-center gap-1 rounded-md px-1.5 py-0.5"
								style={{
									background: "rgba(107, 207, 127, 0.08)",
									border: "1px solid rgba(107, 207, 127, 0.2)",
								}}
							>
								<CheckCircle size={8} style={{ color: "var(--emerald-400)" }} />
								<span
									className="text-[11px] font-medium"
									style={{ color: "var(--emerald-400)" }}
								>
									Review
								</span>
							</div>
						)}
						{status === "current" && !data.hasCompletedRuns && !activeRun && (
							<div
								className="flex items-center gap-1 rounded-md px-1.5 py-0.5"
								style={{
									background: "rgba(91, 155, 213, 0.08)",
									border: "1px solid rgba(91, 155, 213, 0.2)",
								}}
							>
								<Play size={8} style={{ color: "var(--accent-primary)" }} />
								<span
									className="text-[11px] font-medium"
									style={{ color: "var(--accent-primary)" }}
								>
									Next
								</span>
							</div>
						)}
						{artifactCount > 0 && (
							<div
								className="flex items-center gap-1 rounded-md px-1.5 py-0.5"
								style={{
									background: "rgba(255,255,255,0.04)",
									border: "1px solid var(--border-subtle)",
								}}
							>
								<FileText size={9} style={{ color: "var(--text-muted)" }} />
								<span
									className="text-[10px] font-mono"
									style={{ color: "var(--text-muted)" }}
								>
									{artifactCount}
								</span>
							</div>
						)}
						{(activityCount ?? 0) > 0 && (
							<div
								className="flex items-center gap-1 rounded-md px-1.5 py-0.5"
								style={{
									background: "var(--cyan-glow)",
									border: "1px solid rgba(91, 155, 213, 0.15)",
								}}
							>
								<Zap size={9} style={{ color: "var(--cyan-400)" }} />
								<span
									className="text-[10px] font-mono"
									style={{ color: "var(--cyan-400)" }}
								>
									{activityCount}
								</span>
							</div>
						)}
						{(interviewCount ?? 0) > 0 && (
							<div
								className="flex items-center gap-1 rounded-md px-1.5 py-0.5"
								style={{
									background: "var(--amber-glow)",
									border: "1px solid rgba(230, 126, 34, 0.15)",
								}}
							>
								<MessageCircle size={9} style={{ color: "var(--amber-400)" }} />
								<span
									className="text-[10px] font-mono"
									style={{ color: "var(--amber-400)" }}
								>
									{interviewCount}
								</span>
							</div>
						)}
						{optional && (
							<div
								className="flex items-center gap-1 rounded-md px-1.5 py-0.5"
								style={{
									background: "rgba(167, 139, 250, 0.06)",
									border: "1px solid rgba(167, 139, 250, 0.2)",
								}}
							>
								<SkipForward
									size={8}
									style={{ color: "var(--purple-400, #a78bfa)" }}
								/>
								<span
									className="text-[11px] font-medium"
									style={{ color: "var(--purple-400, #a78bfa)" }}
								>
									Optional
								</span>
							</div>
						)}
						{skipCondition && (
							<div
								className="flex items-center gap-1 rounded-md px-1.5 py-0.5"
								title={skipCondition}
								style={{
									background: "rgba(251, 191, 36, 0.06)",
									border: "1px solid rgba(251, 191, 36, 0.2)",
								}}
							>
								<GitBranch
									size={8}
									style={{ color: "var(--amber-400, #fbbf24)" }}
								/>
								<span
									className="text-[11px] font-medium"
									style={{ color: "var(--amber-400, #fbbf24)" }}
								>
									Conditional
								</span>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Expanded action row */}
			{isSelected && (
				<div
					className="flex items-center gap-1.5 border-t px-4 py-2"
					style={{ borderColor: "var(--border-subtle)" }}
				>
					{/* Manual step: mark done */}
					{stepType === "manual" && isCurrentStep && !activeRun && (
						<NodeActionButton
							label="Mark done"
							icon={CheckCircle}
							tone="primary"
							onClick={handleMarkDone}
						/>
					)}
					{/* Hybrid step: generate suggestion */}
					{stepType === "hybrid" && canRunCurrent && (
						<NodeActionButton
							label="Generate"
							icon={Sparkles}
							tone="primary"
							onClick={handleRun}
						/>
					)}
					{/* Agent step: run */}
					{(stepType === "agent" || !stepType) && canRunCurrent && (
						<NodeActionButton
							label="Run"
							icon={Play}
							tone="primary"
							onClick={handleRun}
						/>
					)}
					{canStop && (
						<NodeActionButton
							label="Stop"
							icon={Square}
							tone="danger"
							onClick={handleStop}
						/>
					)}
					{canNavigateCurrent && !activeRun && stepType !== "manual" && (
						<>
							<NodeActionButton
								label="Skip"
								icon={SkipForward}
								onClick={handleSkip}
							/>
							<NodeActionButton
								label="Back"
								icon={ArrowLeft}
								onClick={handleBack}
							/>
						</>
					)}
					{canNavigateCurrent && !activeRun && stepType === "manual" && (
						<NodeActionButton
							label="Back"
							icon={ArrowLeft}
							onClick={handleBack}
						/>
					)}
					{canReturnToStep && (
						<NodeActionButton
							label="Return"
							icon={RefreshCw}
							onClick={handleReturn}
						/>
					)}
					{!canRunCurrent &&
						!canStop &&
						!canNavigateCurrent &&
						!canReturnToStep && (
							<span
								className="text-[11px]"
								style={{ color: "var(--text-muted)" }}
							>
								Open for details
							</span>
						)}
				</div>
			)}

			{/* Expanded artifact row */}
			{isSelected && artifacts.length > 0 && (
				<div
					className="px-4 pb-3 border-t pt-2.5 overflow-x-auto scrollbar-thin"
					style={{ borderColor: "var(--border-subtle)" }}
				>
					<div className="flex items-center gap-1.5 min-w-max">
						{artifacts.slice(0, 5).map((a) => (
							<ArtifactChip
								key={a.id}
								id={a.id}
								filename={a.filename}
								type={a.type}
								onClick={handleArtifactClick}
							/>
						))}
						{artifacts.length > 5 && (
							<span
								className="text-[10px] font-mono px-2"
								style={{ color: "var(--text-muted)" }}
							>
								+{artifacts.length - 5}
							</span>
						)}
					</div>
				</div>
			)}

			{/* Empty expanded state */}
			{isSelected && artifacts.length === 0 && (
				<div
					className="px-5 pb-3 border-t pt-2.5"
					style={{ borderColor: "var(--border-subtle)" }}
				>
					<p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
						No artifacts yet
					</p>
				</div>
			)}

			{/* Progress bar when running */}
			{isLive && (
				<div className="absolute bottom-0 left-0 right-0 h-[3px] overflow-hidden rounded-b-2xl">
					<div
						className="h-full animate-indeterminate-progress"
						style={{
							background:
								"linear-gradient(90deg, transparent, var(--cyan-400), transparent)",
							width: "40%",
						}}
					/>
				</div>
			)}

			{/* Elapsed time badge */}
			{isLive && activeRun?.started_at && (
				<div className="absolute top-2 right-3">
					<NodeElapsedTime startedAt={activeRun.started_at} />
				</div>
			)}

			<Handle
				type="source"
				position={Position.Bottom}
				className="!bg-transparent !w-3 !h-3 !border-2 !border-[var(--border-default)] !-bottom-1.5"
			/>
		</div>
	);
}

function NodeActionButton({
	label,
	icon: Icon,
	tone = "default",
	onClick,
}: {
	label: string;
	icon: LucideIcon;
	tone?: "default" | "primary" | "danger";
	onClick: (event: MouseEvent) => void;
}) {
	const color =
		tone === "primary"
			? "var(--accent-primary)"
			: tone === "danger"
				? "var(--rose-400)"
				: "var(--text-tertiary)";
	const background =
		tone === "primary"
			? "var(--cyan-glow)"
			: tone === "danger"
				? "var(--rose-glow, rgba(231, 76, 60, 0.08))"
				: "rgba(255,255,255,0.03)";
	const border =
		tone === "primary"
			? "rgba(91, 155, 213, 0.2)"
			: tone === "danger"
				? "rgba(231, 76, 60, 0.2)"
				: "var(--border-subtle)";

	return (
		<button
			type="button"
			onClick={onClick}
			className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-colors hover:brightness-110 btn-press"
			style={{ color, background, border: `1px solid ${border}` }}
			title={label}
		>
			<Icon size={10} />
			<span>{label}</span>
		</button>
	);
}

function NodeElapsedTime({ startedAt }: { startedAt: string }) {
	const [elapsed, setElapsed] = useState("");

	useEffect(() => {
		function update() {
			const diff = Math.floor(
				(Date.now() - new Date(startedAt).getTime()) / 1000,
			);
			const m = Math.floor(diff / 60);
			const s = diff % 60;
			setElapsed(m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`);
		}
		update();
		const interval = setInterval(update, 1000);
		return () => clearInterval(interval);
	}, [startedAt]);

	return (
		<span
			className="text-[9px] font-mono tabular-nums rounded px-1 py-0.5"
			style={{
				color: "var(--cyan-400)",
				background: "rgba(34, 211, 238, 0.08)",
			}}
		>
			{elapsed}
		</span>
	);
}

export const WorkflowStepNode = memo(WorkflowStepNodeComponent);

const EDIT_NODE_WIDTH = 340;
const EDIT_NODE_HEIGHT = 72;

const TYPE_CONFIG = {
	agent: { icon: Bot, color: "var(--cyan-400)", label: "Agent" },
	manual: { icon: Hand, color: "var(--emerald-400)", label: "Manual" },
	hybrid: { icon: Sparkles, color: "var(--amber-400)", label: "Hybrid" },
} as const;

function EditModeNodeComponent({
	data,
}: NodeProps & { data: EditStepNodeData }) {
	const {
		label,
		stepName,
		stepType,
		optional,
		skipCondition,
		index,
		isSelected,
	} = data;
	const removeEditStep = useStore((s) => s.removeEditStep);
	const updateEditStep = useStore((s) => s.updateEditStep);
	const config = TYPE_CONFIG[stepType] ?? TYPE_CONFIG.agent;
	const TypeIcon = config.icon;

	const [editing, setEditing] = useState(false);
	const [editValue, setEditValue] = useState(label);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (editing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [editing]);

	function handleDoubleClick(e: MouseEvent) {
		e.stopPropagation();
		setEditValue(label);
		setEditing(true);
	}

	function commitEdit() {
		const trimmed = editValue.trim();
		if (trimmed && trimmed !== label) {
			updateEditStep(index, { label: trimmed });
		}
		setEditing(false);
	}

	function handleDelete(e: MouseEvent) {
		e.stopPropagation();
		removeEditStep(index);
	}

	return (
		<div
			className="relative rounded-2xl border transition-all duration-200 group node-hover"
			style={{
				width: EDIT_NODE_WIDTH,
				height: EDIT_NODE_HEIGHT,
				background: isSelected
					? "var(--bg-surface-hover)"
					: "var(--bg-surface)",
				borderColor: isSelected
					? "var(--accent-primary)"
					: "var(--border-default)",
				boxShadow: isSelected ? "0 0 0 2px rgba(91, 155, 213, 0.15)" : "none",
			}}
		>
			<Handle
				type="target"
				position={Position.Top}
				className="!bg-transparent !w-3 !h-3 !border-2 !border-[var(--border-default)] !-top-1.5"
			/>

			<div className="px-5 py-3.5 flex items-center justify-between gap-3">
				<div className="flex items-center gap-3 min-w-0">
					<div
						className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
						style={{
							background: `color-mix(in srgb, ${config.color} 12%, transparent)`,
							border: `1.5px solid color-mix(in srgb, ${config.color} 30%, transparent)`,
						}}
					>
						<TypeIcon size={16} style={{ color: config.color }} />
					</div>
					<div
						className="min-w-0"
						role="button"
						tabIndex={0}
						onDoubleClick={handleDoubleClick}
						onKeyDown={(e) => {
							if (e.key === "Enter")
								handleDoubleClick(e as unknown as MouseEvent);
						}}
					>
						{editing ? (
							<input
								ref={inputRef}
								type="text"
								value={editValue}
								onChange={(e) => setEditValue(e.target.value)}
								onBlur={commitEdit}
								onKeyDown={(e) => {
									if (e.key === "Enter") commitEdit();
									if (e.key === "Escape") setEditing(false);
								}}
								className="text-[13px] font-medium leading-tight w-full bg-transparent border-b outline-none"
								style={{
									color: "var(--text-primary)",
									borderColor: "var(--accent-primary)",
								}}
							/>
						) : (
							<p
								className="text-[13px] font-medium truncate leading-tight cursor-text"
								style={{ color: "var(--text-primary)" }}
								title="Double-click to edit"
							>
								{label}
							</p>
						)}
						<p
							className="text-[10px] font-mono mt-0.5"
							style={{ color: "var(--text-muted)" }}
						>
							{stepName}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					<span
						className="rounded-md px-1.5 py-0.5 text-[11px] font-medium"
						style={{
							background: `color-mix(in srgb, ${config.color} 10%, transparent)`,
							color: config.color,
						}}
					>
						{config.label}
					</span>
					{optional && (
						<span
							className="rounded-md px-1.5 py-0.5 text-[11px] font-medium"
							style={{
								background: "rgba(167, 139, 250, 0.08)",
								color: "#a78bfa",
							}}
						>
							Optional
						</span>
					)}
					{skipCondition && (
						<span
							className="rounded-md px-1.5 py-0.5 text-[11px] font-medium"
							title={skipCondition}
							style={{
								background: "rgba(251, 191, 36, 0.08)",
								color: "#fbbf24",
							}}
						>
							Conditional
						</span>
					)}
					<button
						type="button"
						onClick={handleDelete}
						className="flex h-6 w-6 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--bg-surface-hover)]"
						style={{ color: "var(--rose-400)" }}
						title="Remove step"
					>
						<X size={12} />
					</button>
				</div>
			</div>

			<Handle
				type="source"
				position={Position.Bottom}
				className="!bg-transparent !w-3 !h-3 !border-2 !border-[var(--border-default)] !-bottom-1.5"
			/>
		</div>
	);
}

export const EditModeNode = memo(EditModeNodeComponent);
