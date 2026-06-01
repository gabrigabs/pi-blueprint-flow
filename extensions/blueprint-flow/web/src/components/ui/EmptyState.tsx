import type { LucideIcon } from "lucide-react";

interface Props {
	icon?: LucideIcon;
	title: string;
	description?: string;
	action?: {
		label: string;
		onClick: () => void;
	};
	compact?: boolean;
}

export function EmptyState({
	icon: Icon,
	title,
	description,
	action,
	compact,
}: Props) {
	return (
		<div
			className={`relative flex flex-col items-center justify-center text-center animate-scale-in ${compact ? "px-4 py-6" : "px-6 py-12"}`}
		>
			{/* Ambient radial glow */}
			<div
				className="pointer-events-none absolute inset-0 rounded-xl"
				style={{
					background:
						"radial-gradient(ellipse 60% 50% at 50% 60%, rgba(91,155,213,0.04) 0%, transparent 70%)",
				}}
			/>

			{Icon && (
				<div
					className="relative mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
					style={{
						background:
							"linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-hover) 100%)",
						border: "1px solid var(--border-default)",
						boxShadow:
							"0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.03)",
					}}
				>
					<Icon size={18} style={{ color: "var(--text-tertiary)" }} />
				</div>
			)}

			<p
				className="relative text-[13px] font-medium"
				style={{ color: "var(--text-secondary)" }}
			>
				{title}
			</p>
			{description && (
				<p
					className="relative mt-1.5 text-xs max-w-[220px] leading-relaxed"
					style={{ color: "var(--text-muted)" }}
				>
					{description}
				</p>
			)}
			{action && (
				<button
					type="button"
					onClick={action.onClick}
					className="relative mt-5 rounded-lg px-4 py-2 text-xs font-medium transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
					style={{
						background: "rgba(91,155,213,0.08)",
						border: "1px solid rgba(91,155,213,0.2)",
						color: "var(--accent-primary)",
					}}
				>
					{action.label}
				</button>
			)}
		</div>
	);
}
