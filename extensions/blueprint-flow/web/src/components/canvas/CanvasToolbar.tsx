import { ArrowDownUp, ArrowRightLeft, Maximize2, Play } from "lucide-react";
import { api } from "../../lib/api";
import { useStore } from "../../store";
import type { LayoutDirection } from "./layout";

interface Props {
	direction: LayoutDirection;
	onDirectionChange: (d: LayoutDirection) => void;
	onFitView: () => void;
}

export function CanvasToolbar({ direction, onDirectionChange, onFitView }: Props) {
	const selectedFeatureId = useStore((s) => s.selectedFeatureId);
	const steps = useStore((s) => s.steps);

	const doneSteps = steps.filter((s) => s.status === "done").length;
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
			{/* Progress */}
			<div className="flex items-center gap-2 pr-3 border-r" style={{ borderColor: "var(--border-subtle)" }}>
				<span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
					{doneSteps}/{steps.length}
				</span>
				<div
					className="h-1.5 w-16 rounded-full overflow-hidden"
					style={{ background: "var(--bg-surface)" }}
				>
					<div
						className="h-full rounded-full transition-all duration-500"
						style={{
							width: steps.length > 0 ? `${(doneSteps / steps.length) * 100}%` : "0%",
							background: "linear-gradient(90deg, var(--accent-success), var(--accent-primary))",
						}}
					/>
				</div>
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
		</div>
	);
}
