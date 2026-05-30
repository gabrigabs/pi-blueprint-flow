import { Handle, Position, type NodeProps } from "@xyflow/react";
import { CheckCircle, CircleDot, Loader2, MessageCircle, Play, SkipForward, FileText } from "lucide-react";
import { memo, useState } from "react";
import { api } from "../../lib/api";
import { useStore } from "../../store";
import type { StepNodeData } from "./layout";

const statusConfig: Record<string, { bg: string; border: string; text: string; icon: typeof CheckCircle }> = {
	done: { bg: "rgba(107, 207, 127, 0.06)", border: "rgba(107, 207, 127, 0.3)", text: "var(--emerald-400)", icon: CheckCircle },
	running: { bg: "rgba(91, 155, 213, 0.06)", border: "rgba(91, 155, 213, 0.5)", text: "var(--accent-primary)", icon: Loader2 },
	needs_user: { bg: "rgba(230, 126, 34, 0.06)", border: "rgba(230, 126, 34, 0.4)", text: "var(--amber-400)", icon: MessageCircle },
	blocked: { bg: "rgba(231, 76, 60, 0.06)", border: "rgba(231, 76, 60, 0.3)", text: "var(--rose-400)", icon: CircleDot },
	pending: { bg: "var(--bg-surface)", border: "var(--border-default)", text: "var(--text-tertiary)", icon: CircleDot },
};

function WorkflowStepNodeComponent({ data }: NodeProps & { data: StepNodeData }) {
	const { label, status, stepName, artifactCount, isCurrentStep, isSelected, interviewCount } = data;
	const config = statusConfig[status] ?? statusConfig.pending;
	const StatusIcon = config.icon;
	const [hovered, setHovered] = useState(false);

	const selectedFeatureId = useStore((s) => s.selectedFeatureId);

	async function handleRun(e: React.MouseEvent) {
		e.stopPropagation();
		if (!selectedFeatureId) return;
		try {
			await api.features.runStep(selectedFeatureId);
		} catch {}
	}

	async function handleAdvance(e: React.MouseEvent) {
		e.stopPropagation();
		if (!selectedFeatureId) return;
		try {
			await api.features.advance(selectedFeatureId);
		} catch {}
	}

	return (
		<div
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			className="rounded-xl border px-5 py-4 transition-all duration-200 cursor-pointer"
			style={{
				width: 300,
				background: config.bg,
				borderColor: isSelected ? "var(--accent-primary)" : config.border,
				boxShadow: isSelected
					? "0 0 0 2px rgba(91, 155, 213, 0.2)"
					: isCurrentStep
						? `0 0 16px -4px ${config.border}`
						: undefined,
				transform: hovered ? "scale(1.02)" : undefined,
			}}
		>
			<Handle type="target" position={Position.Top} className="!bg-transparent !w-3 !h-3 !border-2 !border-[var(--border-default)] !-top-1.5" />

			<div className="flex items-start justify-between gap-3">
				<div className="flex items-center gap-2.5 min-w-0">
					<div
						className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
						style={{ background: `color-mix(in srgb, ${config.text} 12%, transparent)` }}
					>
						<StatusIcon
							size={14}
							style={{ color: config.text }}
							className={status === "running" ? "animate-spin" : ""}
						/>
					</div>
					<div className="min-w-0">
						<p className="text-sm font-medium truncate" style={{ color: status === "pending" ? "var(--text-secondary)" : config.text }}>
							{label}
						</p>
						<p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
							{stepName}
						</p>
					</div>
				</div>

				{/* Badges */}
				<div className="flex items-center gap-1.5 shrink-0">
					{artifactCount > 0 && (
						<div
							className="flex items-center gap-1 rounded-md px-1.5 py-0.5"
							style={{ background: "var(--bg-elevated)" }}
						>
							<FileText size={9} style={{ color: "var(--text-muted)" }} />
							<span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
								{artifactCount}
							</span>
						</div>
					)}
					{(interviewCount ?? 0) > 0 && (
						<div
							className="flex items-center gap-1 rounded-md px-1.5 py-0.5 animate-pulse"
							style={{ background: "var(--amber-glow)" }}
						>
							<MessageCircle size={9} style={{ color: "var(--amber-400)" }} />
							<span className="text-[10px] font-mono" style={{ color: "var(--amber-400)" }}>
								{interviewCount}
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Action buttons — visible on hover when step is current */}
			{(hovered || isCurrentStep) && status !== "done" && (
				<div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t" style={{ borderColor: "var(--border-subtle)" }}>
					{(status === "pending" || status === "needs_user") && (
						<button
							onClick={handleRun}
							className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors hover:bg-[var(--bg-surface-hover)]"
							style={{ color: "var(--accent-primary)" }}
						>
							<Play size={10} /> Run
						</button>
					)}
					<button
						onClick={handleAdvance}
						className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors hover:bg-[var(--bg-surface-hover)]"
						style={{ color: "var(--text-tertiary)" }}
					>
						<SkipForward size={10} /> Skip
					</button>
				</div>
			)}

			<Handle type="source" position={Position.Bottom} className="!bg-transparent !w-3 !h-3 !border-2 !border-[var(--border-default)] !-bottom-1.5" />
		</div>
	);
}

export const WorkflowStepNode = memo(WorkflowStepNodeComponent);
