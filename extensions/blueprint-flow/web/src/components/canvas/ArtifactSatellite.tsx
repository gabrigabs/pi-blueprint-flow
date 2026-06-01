import { Handle, type NodeProps, Position } from "@xyflow/react";
import { Code2, FileText, MessageCircle, Zap } from "lucide-react";
import { memo } from "react";
import { useStore } from "../../store";
import type { SatelliteNodeData } from "./layout";
import { SATELLITE_HEIGHT, SATELLITE_WIDTH } from "./layout";

const TYPE_ICONS: Record<string, typeof FileText> = {
	code: Code2,
	interview: MessageCircle,
	activity: Zap,
};

function ArtifactSatelliteComponent({
	data,
}: NodeProps & { data: SatelliteNodeData }) {
	const {
		artifactId,
		filename,
		type,
		stepColor,
		isInterview,
		interviewCount,
		isActivity,
		activityStatus,
	} = data;
	const selectArtifact = useStore((s) => s.selectArtifact);

	const Icon = TYPE_ICONS[type] ?? FileText;

	function handleClick(e: React.MouseEvent) {
		e.stopPropagation();
		if (isInterview || isActivity) return;
		selectArtifact(artifactId);
	}

	return (
		<div
			className="satellite-node rounded-xl border cursor-pointer transition-all duration-200 hover:brightness-110"
			style={{
				width: SATELLITE_WIDTH,
				height: SATELLITE_HEIGHT,
				background: `${stepColor}06`,
				borderColor: `${stepColor}20`,
				boxShadow: `0 2px 12px ${stepColor}08`,
			}}
			onClick={handleClick}
			onMouseEnter={(e) => {
				const el = e.currentTarget;
				el.style.borderColor = `${stepColor}45`;
				el.style.boxShadow = `0 4px 20px ${stepColor}15`;
			}}
			onMouseLeave={(e) => {
				const el = e.currentTarget;
				el.style.borderColor = `${stepColor}20`;
				el.style.boxShadow = `0 2px 12px ${stepColor}08`;
			}}
		>
			<Handle
				type="target"
				position={Position.Left}
				className="!bg-transparent !w-2 !h-2 !border-[1.5px] !-left-1"
				style={{ borderColor: `${stepColor}40` }}
			/>

			<div className="flex items-center gap-2 px-3 h-full">
				<Icon
					size={13}
					style={{ color: stepColor, opacity: 0.8 }}
					className="shrink-0"
				/>
				<div className="min-w-0 flex-1">
					<p
						className="text-[11px] font-mono truncate leading-tight"
						style={{ color: "var(--text-secondary)" }}
					>
						{filename}
					</p>
					{isInterview && interviewCount && (
						<p
							className="text-[9px] font-mono"
							style={{ color: "var(--amber-400)" }}
						>
							{interviewCount} pending
						</p>
					)}
					{isActivity && activityStatus && (
						<p
							className="text-[9px] font-mono"
							style={{
								color:
									activityStatus === "done"
										? "var(--emerald-400)"
										: "var(--cyan-400)",
							}}
						>
							{activityStatus}
						</p>
					)}
				</div>
			</div>
		</div>
	);
}

export const ArtifactSatelliteNode = memo(ArtifactSatelliteComponent);
