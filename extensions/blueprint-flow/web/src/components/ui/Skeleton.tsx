interface SkeletonProps {
	className?: string;
	width?: string | number;
	height?: string | number;
}

export function Skeleton({ className = "", width, height }: SkeletonProps) {
	return (
		<div
			className={`animate-pulse rounded-md ${className}`}
			style={{
				background: "var(--bg-surface)",
				width,
				height,
			}}
		/>
	);
}

export function SkeletonLine({ width = "100%" }: { width?: string }) {
	return <Skeleton height={12} width={width} className="rounded-sm" />;
}

export function SkeletonCard() {
	return (
		<div
			className="rounded-xl border p-4 space-y-3"
			style={{
				borderColor: "var(--border-subtle)",
				background: "var(--bg-elevated)",
			}}
		>
			<Skeleton height={16} width="60%" />
			<SkeletonLine width="80%" />
			<SkeletonLine width="40%" />
		</div>
	);
}
