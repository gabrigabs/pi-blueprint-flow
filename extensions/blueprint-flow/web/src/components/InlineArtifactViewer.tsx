import {
	ChevronDown,
	ChevronRight,
	ClipboardCopy,
	Code,
	Download,
	Eye,
	FileCode,
	FileText,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Artifact } from "../store";
import { useStore } from "../store";
import { MarkdownContent } from "./MarkdownContent";
import { addToast } from "./Toasts";

interface Props {
	stepName: string;
	flowId: string;
}

export function InlineArtifactViewer({ stepName, flowId }: Props) {
	const { artifacts, artifactContentVersion } = useStore();
	const stepArtifacts = artifacts.filter((a) => a.step_name === stepName);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [content, setContent] = useState<string>("");
	const [viewMode, setViewMode] = useState<"preview" | "raw">("preview");

	useEffect(() => {
		if (expandedId) {
			fetch(`/api/artifacts/${expandedId}`)
				.then((r) => r.json())
				.then((data) => {
					if (data.content) setContent(data.content);
				})
				.catch(() => {});
		}
	}, [expandedId, artifactContentVersion]);

	if (stepArtifacts.length === 0) {
		return (
			<div className="py-3 px-2">
				<span className="text-xs text-[var(--text-muted)]">No artifacts for this step yet</span>
			</div>
		);
	}

	const selectedArtifact = stepArtifacts.find((a) => a.id === expandedId);

	function handleCopy() {
		navigator.clipboard.writeText(content);
		addToast({ type: "success", message: "Copied to clipboard" });
	}

	function handleDownload() {
		if (!selectedArtifact) return;
		const blob = new Blob([content], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = selectedArtifact.filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	return (
		<div className="py-2 space-y-1.5">
			{stepArtifacts.map((artifact) => {
				const isExpanded = expandedId === artifact.id;
				return (
					<div key={artifact.id} className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
						{/* Card header */}
						<button
							onClick={() => {
								setExpandedId(isExpanded ? null : artifact.id);
								setViewMode("preview");
							}}
							className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
								isExpanded
									? "bg-[var(--bg-surface)]"
									: "hover:bg-[var(--bg-surface-hover)]"
							}`}
						>
							{isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
							<ArtifactIcon type={artifact.type} />
							<span className="flex-1 truncate text-xs text-[var(--text-secondary)]">
								{artifact.filename}
							</span>
							<span className="text-[10px] text-[var(--text-muted)] font-mono">
								{artifact.type}
							</span>
						</button>

						{/* Expanded content */}
						{isExpanded && content && (
							<div className="border-t border-[var(--border-subtle)]">
								{/* Toolbar */}
								<div className="flex items-center justify-end gap-1 px-3 py-1.5 border-b border-[var(--border-subtle)]">
									<button
										onClick={() => setViewMode(viewMode === "preview" ? "raw" : "preview")}
										className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-tertiary)]"
										title={viewMode === "preview" ? "View raw" : "View preview"}
									>
										{viewMode === "preview" ? <Code size={12} /> : <Eye size={12} />}
									</button>
									<button
										onClick={handleCopy}
										className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-tertiary)]"
										title="Copy"
									>
										<ClipboardCopy size={12} />
									</button>
									<button
										onClick={handleDownload}
										className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-tertiary)]"
										title="Download"
									>
										<Download size={12} />
									</button>
								</div>

								{/* Content */}
								<div className="max-h-[400px] overflow-y-auto scrollbar-thin p-3">
									{viewMode === "raw" ? (
										<pre className="whitespace-pre-wrap text-xs text-gray-300 font-mono">
											{content}
										</pre>
									) : (
										<MarkdownContent content={content} />
									)}
								</div>
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

function ArtifactIcon({ type }: { type: string }) {
	const codeTypes = ["code", "implementation_plan", "json"];
	if (codeTypes.includes(type)) {
		return <FileCode size={13} className="shrink-0 text-blue-400" />;
	}
	return <FileText size={13} className="shrink-0 text-amber-400" />;
}