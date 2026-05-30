import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import type { StepNodeData } from "./layout";

const statusStyles: Record<string, { bg: string; border: string; text: string; dot: string }> = {
	done: {
		bg: "bg-emerald-950/40",
		border: "border-emerald-500/30",
		text: "text-emerald-300",
		dot: "bg-emerald-400",
	},
	running: {
		bg: "bg-cyan-950/40",
		border: "border-cyan-500/50",
		text: "text-cyan-300",
		dot: "bg-cyan-400",
	},
	needs_user: {
		bg: "bg-amber-950/40",
		border: "border-amber-500/40",
		text: "text-amber-300",
		dot: "bg-amber-400",
	},
	blocked: {
		bg: "bg-rose-950/40",
		border: "border-rose-500/30",
		text: "text-rose-300",
		dot: "bg-rose-400",
	},
	pending: {
		bg: "bg-zinc-900/60",
		border: "border-zinc-700/30",
		text: "text-zinc-500",
		dot: "bg-zinc-600",
	},
	rejected: {
		bg: "bg-rose-950/30",
		border: "border-rose-500/20",
		text: "text-rose-400",
		dot: "bg-rose-400",
	},
};

function WorkflowStepNodeComponent({ data }: NodeProps & { data: StepNodeData }) {
	const { label, status, artifactCount, isCurrentStep } = data;
	const style = statusStyles[status] || statusStyles.pending;

	return (
		<div
			className={`rounded-xl border px-4 py-3 min-w-[200px] max-w-[240px] transition-all duration-200 ${style.bg} ${style.border} ${
				isCurrentStep ? "ring-1 ring-amber-400/30 shadow-lg shadow-amber-900/10" : ""
			}`}
		>
			<Handle type="target" position={Position.Top} className="!bg-zinc-600 !w-2 !h-2 !border-0" />

			<div className="flex items-center gap-2.5">
				<div className={`w-2 h-2 rounded-full shrink-0 ${style.dot} ${status === "running" ? "animate-pulse" : ""}`} />
				<span className={`text-sm font-medium leading-tight ${style.text}`}>
					{label}
				</span>
			</div>

			<div className="flex items-center gap-2 mt-2">
				<span className="rounded px-1.5 py-0.5 text-[10px] font-mono bg-black/20 text-zinc-400">
					{status}
				</span>
				{artifactCount > 0 && (
					<span className="text-[10px] text-zinc-500 font-mono">
						{artifactCount} artifact{artifactCount > 1 ? "s" : ""}
					</span>
				)}
			</div>

			<Handle type="source" position={Position.Bottom} className="!bg-zinc-600 !w-2 !h-2 !border-0" />
		</div>
	);
}

export const WorkflowStepNode = memo(WorkflowStepNodeComponent);
