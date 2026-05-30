import { ArrowDownUp, ArrowRightLeft, Brain, Maximize2, Play } from "lucide-react";
import { api } from "../../lib/api";
import { useStore } from "../../store";
import type { LayoutDirection } from "./layout";
import { useReactFlow } from "@xyflow/react";
import { useEffect, useState } from "react";

interface Props {
	direction: LayoutDirection;
	onDirectionChange: (d: LayoutDirection) => void;
	onFitView: () => void;
	showKnowledge: boolean;
	onToggleKnowledge: () => void;
}

export function CanvasToolbar({ direction, onDirectionChange, onFitView, showKnowledge, onToggleKnowledge }: Props) {
	const selectedFeatureId = useStore((s) => s.selectedFeatureId);
	const steps = useStore((s) => s.steps);
	const memories = useStore((s) => s.memories);
	const { getViewport } = useReactFlow();
	const [zoom, setZoom] = useState(100);

	useEffect(() => {
		const interval = setInterval(() => {
			const vp = getViewport();
			setZoom(Math.round(vp.zoom * 100));
		}, 300);
		return () => clearInterval(interval);
	}, [getViewport]);

	const doneSteps = steps.filter((s) => s.status === "done").length;
	const runningStep = steps.find((s) => s.status === "running");
	const currentStep = steps.find((s) => s.status === "running" || s.status === "needs_user" || s.status === "pending");

	async function handleRunCurrent() {
		if (!selectedFeatureId) return;
		try {
			await api.features.runStep(selectedFeatureId);
		} catch {}
	}

	return (
		<div
			className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-xl border px-3 py-2"
			style={{
				background: "var(--bg-elevated)",
				borderColor: "var(--border-default)",
				boxShadow: "0 4px 24px rgba(0, 0, 0, 0.3)",
			}}
		>
			{/* Progress dots */}
			<div className="flex items-center gap-2 pr-3 border-r" style={{ borderColor: "var(--border-subtle)" }}>
				<div className="flex items-center gap-1">
					{steps.map((s) => (
						<div
							key={s.id}
							className="h-2 w-2 rounded-full transition-all duration-300"
							style={{
								background: s.status === "done"
									? "var(--accent-success)"
									: s.status === "running"
										? "var(--accent-primary)"
										: s.status === "needs_user"
											? "var(--amber-400)"
											: "var(--border-default)",
								boxShadow: s.status === "running" ? "0 0 6px var(--accent-primary)" : "none",
							}}
						/>
					))}
				</div>
				<span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
					{doneSteps}/{steps.length}
				</span>
			</div>

			{/* Run current step */}
			{currentStep && currentStep.status !== "running" && (
				<button
					onClick={handleRunCurrent}
					className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--bg-surface-hover)]"
					style={{ color: "var(--accent-primary)" }}
				>
					<Play size={11} /> Run
				</button>
			)}

			{/* Knowledge toggle */}
			<button
				onClick={onToggleKnowledge}
				title="Toggle knowledge panel"
				className="relative rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
				style={{ color: showKnowledge ? "var(--accent-primary)" : "var(--text-tertiary)" }}
			>
				<Brain size={14} />
				{memories.length > 0 && (
					<div
						className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full"
						style={{ background: "var(--accent-primary)" }}
					/>
				)}
			</button>

			{/* Layout toggle */}
			<button
				onClick={() => onDirectionChange(direction === "vertical" ? "horizontal" : "vertical")}
				title={`Switch to ${direction === "vertical" ? "horizontal" : "vertical"} layout`}
				className="rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
				style={{ color: "var(--text-tertiary)" }}
			>
				{direction === "vertical" ? <ArrowRightLeft size={14} /> : <ArrowDownUp size={14} />}
			</button>

			{/* Fit view */}
			<button
				onClick={onFitView}
				title="Fit view"
				className="rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
				style={{ color: "var(--text-tertiary)" }}
			>
				<Maximize2 size={14} />
			</button>

			{/* Zoom indicator */}
			<span className="font-mono text-[10px] pl-1 tabular-nums" style={{ color: "var(--text-muted)" }}>
				{zoom}%
			</span>

			{/* Running step breadcrumb */}
			{runningStep && (
				<div className="flex items-center gap-1.5 pl-2 border-l" style={{ borderColor: "var(--border-subtle)" }}>
					<div className="h-1.5 w-1.5 rounded-full animate-pulse-glow" style={{ background: "var(--accent-primary)" }} />
					<span className="text-[10px] font-mono truncate max-w-[100px]" style={{ color: "var(--accent-primary)" }}>
						{runningStep.name}
					</span>
				</div>
			)}
		</div>
	);
}
