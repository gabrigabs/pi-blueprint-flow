import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
	BookOpen,
	Brain,
	CheckCircle,
	CircleDot,
	Code2,
	FileSearch,
	FileText,
	Layers,
	Loader2,
	MessageCircle,
	Microscope,
	PenTool,
	Shield,
	Sparkles,
	Zap,
} from "lucide-react";
import { memo } from "react";
import { useStore } from "../../store";
import { ArtifactChip } from "./ArtifactChip";
import type { StepNodeData } from "./layout";
import { NODE_HEIGHT, NODE_HEIGHT_EXPANDED, NODE_WIDTH } from "./layout";

const STEP_ICONS: Record<string, typeof Zap> = {
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

const statusConfig: Record<string, { bg: string; border: string; text: string; glow: string }> = {
	done: { bg: "rgba(107, 207, 127, 0.04)", border: "rgba(107, 207, 127, 0.3)", text: "var(--emerald-400)", glow: "0 0 20px -6px rgba(107, 207, 127, 0.15)" },
	running: { bg: "rgba(91, 155, 213, 0.05)", border: "rgba(91, 155, 213, 0.45)", text: "var(--accent-primary)", glow: "0 0 24px -6px rgba(91, 155, 213, 0.2)" },
	needs_user: { bg: "rgba(230, 126, 34, 0.04)", border: "rgba(230, 126, 34, 0.4)", text: "var(--amber-400)", glow: "0 0 24px -6px rgba(230, 126, 34, 0.15)" },
	blocked: { bg: "rgba(231, 76, 60, 0.03)", border: "rgba(231, 76, 60, 0.25)", text: "var(--rose-400)", glow: "none" },
	pending: { bg: "var(--bg-surface)", border: "var(--border-default)", text: "var(--text-tertiary)", glow: "none" },
};

function WorkflowStepNodeComponent({ data }: NodeProps & { data: StepNodeData }) {
	const { label, status, stepName, artifactCount, artifacts, isSelected, interviewCount, activityCount } = data;
	const config = statusConfig[status] ?? statusConfig.pending;
	const StepIcon = STEP_ICONS[stepName] ?? CircleDot;
	const stepColor = STEP_COLORS[stepName] ?? "var(--accent-primary)";

	const selectArtifact = useStore((s) => s.selectArtifact);

	function handleArtifactClick(id: string) {
		selectArtifact(id);
	}

	return (
		<div
			className="rounded-2xl border transition-all duration-200"
			style={{
				width: NODE_WIDTH,
				height: isSelected ? NODE_HEIGHT_EXPANDED : NODE_HEIGHT,
				background: config.bg,
				borderColor: isSelected ? "var(--accent-primary)" : config.border,
				boxShadow: isSelected
					? "0 0 0 2px rgba(91, 155, 213, 0.15), 0 12px 40px -8px rgba(0, 0, 0, 0.4)"
					: config.glow,
				overflow: "hidden",
			}}
		>
			<Handle type="target" position={Position.Top} className="!bg-transparent !w-3 !h-3 !border-2 !border-[var(--border-default)] !-top-1.5" />

			{/* Main content row */}
			<div className="px-5 py-4">
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-3 min-w-0">
						<div
							className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200"
							style={{
								background: status === "done"
									? "rgba(107, 207, 127, 0.1)"
									: `${stepColor}12`,
								border: `1.5px solid ${status === "done" ? "rgba(107, 207, 127, 0.25)" : `${stepColor}30`}`,
							}}
						>
							{status === "done" ? (
								<CheckCircle size={16} style={{ color: "var(--emerald-400)" }} />
							) : status === "running" ? (
								<Loader2 size={16} className="animate-spin" style={{ color: config.text }} />
							) : (
								<StepIcon size={16} style={{ color: status === "pending" ? stepColor : config.text, opacity: status === "pending" ? 0.6 : 1 }} />
							)}
						</div>

						<div className="min-w-0">
							<p
								className="text-[13px] font-medium truncate leading-tight"
								style={{ color: status === "pending" ? "var(--text-secondary)" : status === "done" ? "var(--text-primary)" : config.text }}
							>
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
								style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)" }}
							>
								<FileText size={9} style={{ color: "var(--text-muted)" }} />
								<span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
									{artifactCount}
								</span>
							</div>
						)}
						{(activityCount ?? 0) > 0 && (
							<div
								className="flex items-center gap-1 rounded-md px-1.5 py-0.5"
								style={{ background: "var(--cyan-glow)", border: "1px solid rgba(91, 155, 213, 0.15)" }}
							>
								<Zap size={9} style={{ color: "var(--cyan-400)" }} />
								<span className="text-[10px] font-mono" style={{ color: "var(--cyan-400)" }}>
									{activityCount}
								</span>
							</div>
						)}
						{(interviewCount ?? 0) > 0 && (
							<div
								className="flex items-center gap-1 rounded-md px-1.5 py-0.5"
								style={{ background: "var(--amber-glow)", border: "1px solid rgba(230, 126, 34, 0.15)" }}
							>
								<MessageCircle size={9} style={{ color: "var(--amber-400)" }} />
								<span className="text-[10px] font-mono" style={{ color: "var(--amber-400)" }}>
									{interviewCount}
								</span>
							</div>
						)}
					</div>
				</div>
			</div>

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
							<span className="text-[10px] font-mono px-2" style={{ color: "var(--text-muted)" }}>
								+{artifacts.length - 5}
							</span>
						)}
					</div>
				</div>
			)}

			{/* Empty expanded state */}
			{isSelected && artifacts.length === 0 && (
				<div className="px-5 pb-3 border-t pt-2.5" style={{ borderColor: "var(--border-subtle)" }}>
					<p className="text-[10px]" style={{ color: "var(--text-muted)" }}>No artifacts yet</p>
				</div>
			)}

			<Handle type="source" position={Position.Bottom} className="!bg-transparent !w-3 !h-3 !border-2 !border-[var(--border-default)] !-bottom-1.5" />
		</div>
	);
}

export const WorkflowStepNode = memo(WorkflowStepNodeComponent);
