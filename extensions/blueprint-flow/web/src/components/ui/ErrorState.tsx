import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
	message?: string;
	onRetry?: () => void;
	compact?: boolean;
}

export function ErrorState({
	message = "Something went wrong",
	onRetry,
	compact,
}: Props) {
	return (
		<div
			className={`relative flex flex-col items-center justify-center text-center animate-scale-in ${compact ? "px-4 py-6" : "px-6 py-12"}`}
		>
			{/* Rose ambient glow */}
			<div
				className="pointer-events-none absolute inset-0 rounded-xl"
				style={{
					background:
						"radial-gradient(ellipse 60% 50% at 50% 60%, rgba(231,76,60,0.04) 0%, transparent 70%)",
				}}
			/>

			<div
				className="relative mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
				style={{
					background:
						"linear-gradient(135deg, rgba(231,76,60,0.06) 0%, rgba(231,76,60,0.02) 100%)",
					border: "1px solid rgba(231,76,60,0.15)",
					boxShadow:
						"0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.02)",
				}}
			>
				<AlertTriangle size={18} style={{ color: "var(--rose-400)" }} />
			</div>

			<p
				className="relative text-[13px] font-medium"
				style={{ color: "var(--text-secondary)" }}
			>
				{message}
			</p>

			{onRetry && (
				<button
					type="button"
					onClick={onRetry}
					className="relative mt-5 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
					style={{
						background: "rgba(231,76,60,0.08)",
						border: "1px solid rgba(231,76,60,0.2)",
						color: "var(--rose-400)",
					}}
				>
					<RefreshCw size={12} />
					Retry
				</button>
			)}
		</div>
	);
}
