import { BaseEdge, type EdgeProps, getSmoothStepPath } from "@xyflow/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { AddStepPopover } from "./AddStepPopover";

export function DropZoneEdge({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
	data,
}: EdgeProps) {
	const [open, setOpen] = useState(false);
	const [hovered, setHovered] = useState(false);
	const index = (data as { index?: number })?.index ?? 0;

	const [edgePath, labelX, labelY] = getSmoothStepPath({
		sourceX,
		sourceY,
		targetX,
		targetY,
		sourcePosition,
		targetPosition,
	});

	return (
		<>
			<BaseEdge
				id={id}
				path={edgePath}
				style={{
					stroke: "rgba(91, 155, 213, 0.25)",
					strokeWidth: 2,
					strokeDasharray: "6 4",
				}}
			/>
			<foreignObject
				x={labelX - 12}
				y={labelY - 12}
				width={24}
				height={24}
				className="overflow-visible"
			>
				<div className="flex items-center justify-center w-full h-full">
					<button
						type="button"
						onClick={() => setOpen((v) => !v)}
						onMouseEnter={() => setHovered(true)}
						onMouseLeave={() => setHovered(false)}
						style={{
							width: 24,
							height: 24,
							borderRadius: "50%",
							background: hovered ? "var(--bg-elevated)" : "var(--bg-elevated)",
							border: hovered
								? "1px solid var(--accent-primary)"
								: "1px solid var(--border-default)",
							boxShadow: hovered ? "0 0 6px rgba(91, 155, 213, 0.3)" : "none",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							padding: 0,
							transition: "border-color 0.15s, box-shadow 0.15s",
						}}
					>
						<Plus
							size={12}
							style={{
								color: hovered
									? "var(--accent-primary)"
									: "var(--text-tertiary)",
								transition: "color 0.15s",
							}}
						/>
					</button>
				</div>
			</foreignObject>
			{open && (
				<foreignObject
					x={labelX - 130}
					y={labelY + 16}
					width={280}
					height={350}
					className="overflow-visible"
				>
					<AddStepPopover index={index} onClose={() => setOpen(false)} />
				</foreignObject>
			)}
		</>
	);
}
