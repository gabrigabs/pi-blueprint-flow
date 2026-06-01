import {
	BaseEdge,
	type EdgeProps,
	getSmoothStepPath,
	useReactFlow,
} from "@xyflow/react";
import { Plus } from "lucide-react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
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
	const [portalPos, setPortalPos] = useState<{ x: number; y: number } | null>(
		null,
	);
	const index = (data as { index?: number })?.index ?? 0;
	const buttonRef = useRef<HTMLButtonElement>(null);
	const { flowToScreenPosition } = useReactFlow();

	const [edgePath, labelX, labelY] = getSmoothStepPath({
		sourceX,
		sourceY,
		targetX,
		targetY,
		sourcePosition,
		targetPosition,
	});

	function handleToggle() {
		if (open) {
			setOpen(false);
			return;
		}
		const screenPos = flowToScreenPosition({ x: labelX, y: labelY });
		setPortalPos({ x: screenPos.x, y: screenPos.y + 20 });
		setOpen(true);
	}

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
						ref={buttonRef}
						type="button"
						onClick={handleToggle}
						onMouseEnter={() => setHovered(true)}
						onMouseLeave={() => setHovered(false)}
						style={{
							width: 24,
							height: 24,
							borderRadius: "50%",
							background: "var(--bg-elevated)",
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
			{open &&
				portalPos &&
				createPortal(
					<>
						<div
							className="fixed inset-0 z-[9998]"
							onClick={() => setOpen(false)}
						/>
						<div
							className="fixed z-[9999]"
							style={{
								left: portalPos.x - 140,
								top: portalPos.y,
							}}
						>
							<AddStepPopover index={index} onClose={() => setOpen(false)} />
						</div>
					</>,
					document.body,
				)}
		</>
	);
}
