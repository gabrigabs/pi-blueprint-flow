import { Brain, ChevronDown, ChevronUp, X } from "lucide-react";
import { useState } from "react";
import type { Memory } from "../../store";
import { useStore } from "../../store";
import { KnowledgeReadingModal } from "./KnowledgeReadingModal";

interface Props {
	visible: boolean;
	onClose: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
	decision: "#a78bfa",
	pattern: "#5b9bd5",
	constraint: "#e67e22",
	learning: "#6bcf7f",
	convention: "#22d3ee",
	architecture: "#f472b6",
	domain: "#fcd34d",
};

export function FeatureKnowledgePanel({ visible, onClose }: Props) {
	const { memories, selectedFlowId } = useStore();
	const [collapsed, setCollapsed] = useState(false);
	const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);

	if (!visible) return null;

	const featureMemories = memories.filter(
		(m) => m.source_flow_id === selectedFlowId,
	);
	const projectMemories = memories.filter(
		(m) => !m.source_flow_id || m.source_flow_id !== selectedFlowId,
	);

	const allMemories = [...featureMemories, ...projectMemories];

	if (allMemories.length === 0) {
		return (
			<div
				className="absolute bottom-4 left-4 z-20 w-[280px] rounded-xl border overflow-hidden animate-fade-in"
				style={{
					background: "var(--bg-elevated)",
					borderColor: "var(--border-default)",
					boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
				}}
			>
				<div className="flex items-center justify-between px-4 py-3">
					<div className="flex items-center gap-2">
						<Brain size={13} style={{ color: "var(--text-muted)" }} />
						<span className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>Knowledge</span>
					</div>
					<button onClick={onClose} className="rounded p-1 hover:bg-[var(--bg-surface-hover)]">
						<X size={12} style={{ color: "var(--text-muted)" }} />
					</button>
				</div>
				<div className="px-4 pb-4">
					<p className="text-[11px]" style={{ color: "var(--text-muted)" }}>No knowledge entries yet</p>
				</div>
			</div>
		);
	}

	return (
		<>
			<div
				className="absolute bottom-4 left-4 z-20 rounded-xl border overflow-hidden animate-fade-in"
				style={{
					width: collapsed ? "auto" : "340px",
					maxHeight: collapsed ? "auto" : "400px",
					background: "var(--bg-elevated)",
					borderColor: "var(--border-default)",
					boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
				}}
			>
				{/* Header */}
				<div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "var(--border-subtle)" }}>
					<div className="flex items-center gap-2">
						<Brain size={13} style={{ color: "var(--accent-primary)" }} />
						<span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Knowledge</span>
						<span
							className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
							style={{ background: "rgba(91, 155, 213, 0.12)", color: "var(--cyan-400)" }}
						>
							{allMemories.length}
						</span>
					</div>
					<div className="flex items-center gap-1">
						<button
							onClick={() => setCollapsed(!collapsed)}
							className="rounded p-1 hover:bg-[var(--bg-surface-hover)]"
						>
							{collapsed ? <ChevronUp size={12} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={12} style={{ color: "var(--text-muted)" }} />}
						</button>
						<button onClick={onClose} className="rounded p-1 hover:bg-[var(--bg-surface-hover)]">
							<X size={12} style={{ color: "var(--text-muted)" }} />
						</button>
					</div>
				</div>

				{/* Card grid */}
				{!collapsed && (
					<div className="overflow-y-auto scrollbar-thin p-3 space-y-1.5" style={{ maxHeight: "340px" }}>
						{featureMemories.length > 0 && (
							<span className="text-[9px] font-mono uppercase tracking-wider block pb-1 px-1" style={{ color: "var(--text-muted)" }}>
								Feature-specific
							</span>
						)}
						{featureMemories.map((m) => (
							<KnowledgeCard key={m.id} memory={m} onClick={() => setSelectedMemory(m)} />
						))}

						{projectMemories.length > 0 && (
							<span className="text-[9px] font-mono uppercase tracking-wider block pt-2 pb-1 px-1" style={{ color: "var(--text-muted)" }}>
								Project
							</span>
						)}
						{projectMemories.slice(0, 8).map((m) => (
							<KnowledgeCard key={m.id} memory={m} onClick={() => setSelectedMemory(m)} />
						))}
					</div>
				)}
			</div>

			{selectedMemory && (
				<KnowledgeReadingModal memory={selectedMemory} onClose={() => setSelectedMemory(null)} />
			)}
		</>
	);
}

function KnowledgeCard({ memory, onClick }: { memory: Memory; onClick: () => void }) {
	const color = CATEGORY_COLORS[memory.category] ?? "var(--text-muted)";
	const preview = memory.content.slice(0, 100).replace(/\n/g, " ");

	return (
		<button
			onClick={onClick}
			className="w-full text-left rounded-lg px-3 py-2.5 transition-all duration-150 hover:border-opacity-100"
			style={{
				background: "var(--bg-surface)",
				border: `1px solid ${color}15`,
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.borderColor = `${color}40`;
				e.currentTarget.style.boxShadow = `0 2px 12px ${color}10`;
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.borderColor = `${color}15`;
				e.currentTarget.style.boxShadow = "none";
			}}
		>
			<div className="flex items-center gap-2 mb-1">
				<div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
				<span className="text-[9px] font-mono uppercase tracking-wide" style={{ color }}>{memory.category}</span>
			</div>
			<p
				className="text-[11px] leading-relaxed line-clamp-2"
				style={{ color: "var(--text-secondary)" }}
			>
				{preview}{memory.content.length > 100 ? "..." : ""}
			</p>
		</button>
	);
}
