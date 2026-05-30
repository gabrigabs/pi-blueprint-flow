import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { Memory } from "../../store";
import { MarkdownContent } from "../MarkdownContent";

const CATEGORY_COLORS: Record<string, string> = {
	decision: "#a78bfa",
	pattern: "#5b9bd5",
	constraint: "#e67e22",
	learning: "#6bcf7f",
	convention: "#22d3ee",
	architecture: "#f472b6",
	domain: "#fcd34d",
};

interface Props {
	memory: Memory;
	onClose: () => void;
}

export function KnowledgeReadingModal({ memory, onClose }: Props) {
	const color = CATEGORY_COLORS[memory.category] ?? "var(--text-muted)";

	useEffect(() => {
		function handleKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		document.addEventListener("keydown", handleKey);
		return () => document.removeEventListener("keydown", handleKey);
	}, [onClose]);

	return createPortal(
		<div
			className="fixed inset-0 z-50 flex items-center justify-center"
			onClick={onClose}
		>
			<div className="absolute inset-0" style={{ background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" }} />
			<div
				className="relative w-[600px] max-h-[80vh] rounded-2xl border overflow-hidden flex flex-col animate-fade-up"
				style={{
					background: "var(--bg-elevated)",
					borderColor: "var(--border-default)",
					boxShadow: "0 24px 80px rgba(0, 0, 0, 0.5)",
				}}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: "var(--border-subtle)" }}>
					<div className="flex items-center gap-3">
						<div className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
						<span
							className="text-[11px] font-mono uppercase font-medium tracking-wider"
							style={{ color }}
						>
							{memory.category}
						</span>
					</div>
					<button
						onClick={onClose}
						className="rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
						style={{ color: "var(--text-muted)" }}
					>
						<X size={16} />
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">
					<MarkdownContent content={memory.content} />
				</div>
			</div>
		</div>,
		document.body,
	);
}