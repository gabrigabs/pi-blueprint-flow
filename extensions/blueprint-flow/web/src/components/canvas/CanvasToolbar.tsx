import { useReactFlow } from "@xyflow/react";
import {
	ArrowDownUp,
	ArrowRightLeft,
	Bell,
	Brain,
	Loader2,
	Maximize2,
	Pencil,
	Play,
	RotateCcw,
	Square,
	Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useStore } from "../../store";
import type { LayoutDirection } from "./layout";
import { NotificationPanel } from "./NotificationPanel";

interface Props {
	direction: LayoutDirection;
	onDirectionChange: (d: LayoutDirection) => void;
	onFitView: () => void;
	onResetLayout?: () => void;
	showKnowledge: boolean;
	onToggleKnowledge: () => void;
}

export function CanvasToolbar({
	direction,
	onDirectionChange,
	onFitView,
	onResetLayout,
	showKnowledge,
	onToggleKnowledge,
}: Props) {
	const selectedFlowId = useStore((s) => s.selectedFlowId);
	const steps = useStore((s) => s.steps);
	const memories = useStore((s) => s.memories);
	const executionMode = useStore((s) => s.executionMode);
	const setExecutionMode = useStore((s) => s.setExecutionMode);
	const actionRuns = useStore((s) => s.actionRuns);
	const liveToolName = useStore((s) => s.liveToolName);
	const unreadNotificationCount = useStore((s) => s.unreadNotificationCount);
	const canvasEditMode = useStore((s) => s.canvasEditMode);
	const setCanvasEditMode = useStore((s) => s.setCanvasEditMode);
	const setEditModeSteps = useStore((s) => s.setEditModeSteps);
	const activeWorkflow = useStore((s) => s.activeWorkflow);
	const { getViewport } = useReactFlow();
	const [zoom, setZoom] = useState(100);
	const [showNotifications, setShowNotifications] = useState(false);

	useEffect(() => {
		const interval = setInterval(() => {
			const vp = getViewport();
			setZoom(Math.round(vp.zoom * 100));
		}, 300);
		return () => clearInterval(interval);
	}, [getViewport]);

	const doneSteps = steps.filter((s) => s.status === "done").length;
	const runningStep = steps.find((s) => s.status === "running");
	const currentStep = steps.find(
		(s) =>
			s.status === "running" ||
			s.status === "needs_user" ||
			s.status === "pending",
	);

	const activeRun = actionRuns.find(
		(r) =>
			r.flow_id === selectedFlowId &&
			!["completed", "failed", "cancelled", "not_connected"].includes(r.status),
	);
	const isRunning = Boolean(runningStep) || Boolean(activeRun);

	async function handleRunCurrent() {
		if (!selectedFlowId) return;
		try {
			await api.flows.runStep(selectedFlowId);
		} catch {}
	}

	async function handleStop() {
		if (activeRun) {
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
		}
		useStore.getState().clearLiveActivity();
		if (selectedFlowId) {
			const freshSteps = await fetch(`/api/flows/${selectedFlowId}/steps`)
				.then((r) => r.json())
				.catch(() => null);
			if (freshSteps) useStore.getState().setSteps(freshSteps);
		}
	}

	function handleToggleEditMode() {
		if (canvasEditMode) {
			setEditModeSteps(null);
			setCanvasEditMode(false);
		} else {
			const steps = activeWorkflow?.steps ?? [];
			setEditModeSteps(steps);
			setCanvasEditMode(true);
		}
	}

	return (
		<div
			className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-xl border px-3 py-2"
			style={{
				background: "var(--bg-elevated)",
				borderColor: canvasEditMode
					? "var(--cyan-400)"
					: "var(--border-default)",
				boxShadow: canvasEditMode
					? "0 4px 24px rgba(91, 155, 213, 0.15), 0 0 0 1px rgba(91, 155, 213, 0.2)"
					: "0 4px 24px rgba(0, 0, 0, 0.3)",
			}}
		>
			{/* Edit mode toggle */}
			<button
				type="button"
				onClick={handleToggleEditMode}
				disabled={isRunning}
				title={canvasEditMode ? "Exit edit mode" : "Edit workflow"}
				className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-40"
				style={{
					color: canvasEditMode ? "var(--cyan-400)" : "var(--text-tertiary)",
					background: canvasEditMode ? "var(--cyan-glow)" : "transparent",
				}}
			>
				<Pencil size={12} />
				{canvasEditMode && <span>Editing</span>}
			</button>

			{/* Progress dots */}
			{!canvasEditMode && (
				<>
					<div
						className="flex items-center gap-2 pr-3 border-r"
						style={{ borderColor: "var(--border-subtle)" }}
					>
						<div className="flex items-center gap-1">
							{steps.map((s) => (
								<div
									key={s.id}
									className="h-2 w-2 rounded-full transition-all duration-300"
									style={{
										background:
											s.status === "done"
												? "var(--accent-success)"
												: s.status === "running"
													? "var(--accent-primary)"
													: s.status === "needs_user"
														? "var(--amber-400)"
														: "var(--border-default)",
										boxShadow:
											s.status === "running"
												? "0 0 6px var(--accent-primary)"
												: "none",
									}}
								/>
							))}
						</div>
						<span
							className="font-mono text-[10px]"
							style={{ color: "var(--text-muted)" }}
						>
							{doneSteps}/{steps.length}
						</span>
					</div>

					{/* Run / Progress state */}
					{isRunning ? (
						<div className="flex items-center gap-1.5 px-2.5 py-1.5">
							<Loader2
								size={11}
								className="animate-spin"
								style={{ color: "var(--accent-primary)" }}
							/>
							{liveToolName && (
								<span
									className="text-[10px] font-mono truncate max-w-[80px]"
									style={{ color: "var(--cyan-400)" }}
								>
									{liveToolName}
								</span>
							)}
							{activeRun?.started_at && (
								<ElapsedTime startedAt={activeRun.started_at} />
							)}
							<button
								type="button"
								onClick={handleStop}
								className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors hover:bg-[var(--bg-surface-hover)]"
								style={{ color: "var(--rose-400)" }}
							>
								<Square size={9} /> Stop
							</button>
						</div>
					) : (
						currentStep &&
						currentStep.status !== "running" && (
							<button
								type="button"
								onClick={handleRunCurrent}
								className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--bg-surface-hover)]"
								style={{ color: "var(--accent-primary)" }}
							>
								<Play size={11} /> Run
							</button>
						)
					)}

					{/* Execution mode selector */}
					<div
						className="flex items-center rounded-lg border"
						style={{ borderColor: "var(--border-subtle)" }}
					>
						{(["supervised", "autonomous", "draft"] as const).map((mode) => (
							<button
								type="button"
								key={mode}
								onClick={() => setExecutionMode(mode)}
								title={
									mode === "supervised"
										? "Pause between steps"
										: mode === "autonomous"
											? "Auto-advance + skip optional"
											: "Generate artifacts only"
								}
								className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
									executionMode === mode
										? "bg-[var(--cyan-glow)] text-[var(--accent-primary)]"
										: "text-[var(--text-tertiary)] hover:bg-[var(--bg-surface-hover)]"
								}`}
							>
								{mode === "autonomous" && <Zap size={10} />}
								{mode.charAt(0).toUpperCase() + mode.slice(1)}
							</button>
						))}
					</div>
				</>
			)}

			{/* Knowledge toggle */}
			<button
				type="button"
				onClick={onToggleKnowledge}
				title="Toggle knowledge panel"
				className="relative rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
				style={{
					color: showKnowledge
						? "var(--accent-primary)"
						: "var(--text-tertiary)",
				}}
			>
				<Brain size={14} />
				{memories.length > 0 && (
					<div
						className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full"
						style={{ background: "var(--accent-primary)" }}
					/>
				)}
			</button>

			{/* Notifications */}
			<div className="relative">
				<button
					type="button"
					onClick={() => setShowNotifications((v) => !v)}
					title="Notifications"
					className="relative rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
					style={{
						color: showNotifications
							? "var(--accent-primary)"
							: "var(--text-tertiary)",
					}}
				>
					<Bell size={14} />
					{unreadNotificationCount > 0 && (
						<div
							className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white"
							style={{ background: "var(--rose-400)" }}
						>
							{unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
						</div>
					)}
				</button>
				{showNotifications && (
					<NotificationPanel onClose={() => setShowNotifications(false)} />
				)}
			</div>

			{/* Layout toggle */}
			<button
				type="button"
				onClick={() =>
					onDirectionChange(
						direction === "vertical" ? "horizontal" : "vertical",
					)
				}
				title={`Switch to ${direction === "vertical" ? "horizontal" : "vertical"} layout`}
				className="rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
				style={{ color: "var(--text-tertiary)" }}
			>
				{direction === "vertical" ? (
					<ArrowRightLeft size={14} />
				) : (
					<ArrowDownUp size={14} />
				)}
			</button>

			{/* Fit view */}
			<button
				type="button"
				onClick={onFitView}
				title="Fit view"
				className="rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
				style={{ color: "var(--text-tertiary)" }}
			>
				<Maximize2 size={14} />
			</button>

			{/* Reset layout */}
			{onResetLayout && (
				<button
					type="button"
					onClick={onResetLayout}
					title="Reset layout"
					className="rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
					style={{ color: "var(--text-tertiary)" }}
				>
					<RotateCcw size={14} />
				</button>
			)}

			{/* Zoom indicator */}
			<span
				className="font-mono text-[10px] pl-1 tabular-nums"
				style={{ color: "var(--text-muted)" }}
			>
				{zoom}%
			</span>

			{/* Running step breadcrumb */}
			{runningStep && !canvasEditMode && (
				<div
					className="flex items-center gap-1.5 pl-2 border-l"
					style={{ borderColor: "var(--border-subtle)" }}
				>
					<div
						className="h-1.5 w-1.5 rounded-full animate-pulse-glow"
						style={{ background: "var(--accent-primary)" }}
					/>
					<span
						className="text-[10px] font-mono truncate max-w-[100px]"
						style={{ color: "var(--accent-primary)" }}
					>
						{runningStep.name}
					</span>
				</div>
			)}
		</div>
	);
}

function ElapsedTime({ startedAt }: { startedAt: string }) {
	const [elapsed, setElapsed] = useState("");

	useEffect(() => {
		function update() {
			const diff = Math.floor(
				(Date.now() - new Date(startedAt).getTime()) / 1000,
			);
			const m = Math.floor(diff / 60);
			const s = diff % 60;
			setElapsed(m > 0 ? `${m}m${s.toString().padStart(2, "0")}s` : `${s}s`);
		}
		update();
		const interval = setInterval(update, 1000);
		return () => clearInterval(interval);
	}, [startedAt]);

	return (
		<span
			className="text-[10px] font-mono tabular-nums"
			style={{ color: "var(--text-muted)" }}
		>
			{elapsed}
		</span>
	);
}
