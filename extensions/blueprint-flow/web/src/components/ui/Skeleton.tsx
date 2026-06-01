interface SkeletonProps {
	className?: string;
	width?: string | number;
	height?: string | number;
	rounded?: "sm" | "md" | "lg" | "xl" | "full";
}

export function Skeleton({
	className = "",
	width,
	height,
	rounded = "md",
}: SkeletonProps) {
	const radiusMap = {
		sm: "var(--radius-sm)",
		md: "var(--radius-md)",
		lg: "var(--radius-lg)",
		xl: "var(--radius-xl)",
		full: "9999px",
	};
	return (
		<div
			className={`skeleton ${className}`}
			style={{ width, height, borderRadius: radiusMap[rounded] }}
		/>
	);
}

export function SkeletonLine({ width = "100%" }: { width?: string }) {
	return <Skeleton height={10} width={width} rounded="full" />;
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
			<Skeleton height={14} width="55%" rounded="sm" />
			<SkeletonLine width="80%" />
			<SkeletonLine width="45%" />
		</div>
	);
}

export function SkeletonNode() {
	return (
		<div
			className="rounded-xl border p-4 space-y-2.5"
			style={{
				borderColor: "var(--border-subtle)",
				background: "var(--bg-elevated)",
				width: 340,
				height: 90,
			}}
		>
			<div className="flex items-center gap-2.5">
				<Skeleton width={20} height={20} rounded="lg" />
				<Skeleton height={12} width="50%" rounded="sm" />
			</div>
			<div className="flex items-center gap-2 pl-8">
				<Skeleton height={8} width="30%" rounded="full" />
				<Skeleton height={8} width="20%" rounded="full" />
			</div>
		</div>
	);
}

export function SkeletonSidebar() {
	return (
		<div className="space-y-1 px-3 py-2">
			{[0.9, 0.7, 0.85, 0.6, 0.75].map((w, i) => (
				<div
					key={`sk-side-${i}`}
					className="flex items-center gap-2.5 rounded-lg px-3 py-2.5"
				>
					<Skeleton width={6} height={6} rounded="full" />
					<div className="flex-1 space-y-1.5">
						<Skeleton height={11} width={`${w * 100}%`} rounded="sm" />
						<Skeleton height={8} width="35%" rounded="full" />
					</div>
				</div>
			))}
		</div>
	);
}

export function SkeletonTimeline() {
	return (
		<div className="space-y-0 px-3 py-2">
			{[1, 2, 3, 4, 5].map((i) => (
				<div key={`sk-tl-${i}`} className="flex items-start gap-3 pb-3">
					<Skeleton width={24} height={24} rounded="full" />
					<div className="flex-1 pt-1 space-y-1.5">
						<Skeleton
							height={11}
							width={`${50 + Math.random() * 30}%`}
							rounded="sm"
						/>
					</div>
				</div>
			))}
		</div>
	);
}
