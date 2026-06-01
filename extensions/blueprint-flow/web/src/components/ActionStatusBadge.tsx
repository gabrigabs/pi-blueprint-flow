const STATUS_CONFIG: Record<
	string,
	{ label: string; bg: string; text: string; glow?: string; pulse?: boolean }
> = {
	created: { label: "Created", bg: "bg-zinc-800/60", text: "text-zinc-400" },
	queued: {
		label: "Queued",
		bg: "bg-sky-950/60",
		text: "text-sky-400",
		glow: "shadow-[0_0_6px_rgba(56,189,248,0.15)]",
	},
	waiting_for_pi: {
		label: "Waiting",
		bg: "bg-amber-950/50",
		text: "text-amber-400",
		pulse: true,
	},
	injected: {
		label: "Injected",
		bg: "bg-violet-950/50",
		text: "text-violet-400",
		glow: "shadow-[0_0_6px_rgba(167,139,250,0.2)]",
	},
	agent_running: {
		label: "Running",
		bg: "bg-fuchsia-950/40",
		text: "text-fuchsia-300",
		glow: "shadow-[0_0_8px_rgba(232,121,249,0.25)]",
		pulse: true,
	},
	tool_running: {
		label: "Tool",
		bg: "bg-cyan-950/50",
		text: "text-cyan-300",
		glow: "shadow-[0_0_6px_rgba(103,232,249,0.2)]",
		pulse: true,
	},
	needs_user: {
		label: "Needs Input",
		bg: "bg-orange-950/50",
		text: "text-orange-300",
		glow: "shadow-[0_0_8px_rgba(251,146,60,0.3)]",
	},
	saving_artifacts: {
		label: "Saving",
		bg: "bg-teal-950/50",
		text: "text-teal-300",
		pulse: true,
	},
	completed: {
		label: "Done",
		bg: "bg-emerald-950/40",
		text: "text-emerald-400",
		glow: "shadow-[0_0_4px_rgba(52,211,153,0.15)]",
	},
	failed: {
		label: "Failed",
		bg: "bg-red-950/50",
		text: "text-red-400",
		glow: "shadow-[0_0_6px_rgba(248,113,113,0.2)]",
	},
	cancelled: {
		label: "Cancelled",
		bg: "bg-zinc-800/40",
		text: "text-zinc-500",
	},
	not_connected: { label: "No Pi", bg: "bg-red-950/30", text: "text-red-500" },
};

interface ActionStatusBadgeProps {
	status: string;
	className?: string;
	size?: "sm" | "md";
}

export function ActionStatusBadge({
	status,
	className = "",
	size = "sm",
}: ActionStatusBadgeProps) {
	const config = STATUS_CONFIG[status] ?? {
		label: status,
		bg: "bg-zinc-800/60",
		text: "text-zinc-400",
	};
	const sizeClasses =
		size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]";

	return (
		<span
			className={`
        inline-flex items-center gap-1.5 rounded-md font-medium tracking-wide uppercase
        border border-white/[0.04] backdrop-blur-sm
        ${config.bg} ${config.text} ${config.glow ?? ""} ${sizeClasses} ${className}
      `}
		>
			{config.pulse && (
				<span className="relative flex h-1.5 w-1.5">
					<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-40" />
					<span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
				</span>
			)}
			{config.label}
		</span>
	);
}
