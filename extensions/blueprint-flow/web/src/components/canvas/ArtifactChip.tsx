import { FileCode, FileText } from "lucide-react";

interface Props {
	id: string;
	filename: string;
	type: string;
	onClick: (id: string) => void;
}

const CODE_TYPES = ["code", "implementation_plan", "json"];

export function ArtifactChip({ id, filename, type, onClick }: Props) {
	const isCode = CODE_TYPES.includes(type);

	return (
		<button
			onClick={(e) => { e.stopPropagation(); onClick(id); }}
			className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-mono transition-all hover:brightness-125 max-w-[140px]"
			style={{
				background: isCode ? "rgba(91, 155, 213, 0.08)" : "rgba(230, 126, 34, 0.08)",
				border: `1px solid ${isCode ? "rgba(91, 155, 213, 0.15)" : "rgba(230, 126, 34, 0.15)"}`,
				color: isCode ? "var(--cyan-300)" : "var(--amber-300)",
			}}
		>
			{isCode
				? <FileCode size={10} className="shrink-0" />
				: <FileText size={10} className="shrink-0" />
			}
			<span className="truncate">{filename}</span>
		</button>
	);
}
