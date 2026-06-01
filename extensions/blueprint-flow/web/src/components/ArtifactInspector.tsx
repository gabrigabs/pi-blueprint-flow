import {
	ChevronDown,
	ChevronRight,
	ClipboardCopy,
	Code,
	Download,
	Eye,
	FileCode,
	FileText,
	Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "../store";
import { addToast } from "./Toasts";

export function ArtifactInspector() {
	const {
		artifacts,
		selectedArtifactId,
		selectArtifact,
		artifactContentVersion,
	} = useStore();
	const [artifactContent, setArtifactContent] = useState<string>("");
	const [viewMode, setViewMode] = useState<"preview" | "raw">("preview");
	const [searchQuery, setSearchQuery] = useState("");
	const [showSearch, setShowSearch] = useState(false);

	useEffect(() => {
		if (selectedArtifactId) {
			fetch(`/api/artifacts/${selectedArtifactId}`)
				.then((r) => r.json())
				.then((data) => {
					if (data.content) setArtifactContent(data.content);
				})
				.catch(() => {});
		}
	}, [selectedArtifactId, artifactContentVersion]);

	if (artifacts.length === 0) {
		return (
			<div className="border-b border-gray-800 p-3">
				<h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
					Artifacts
				</h3>
				<p className="text-xs text-gray-500">No artifacts yet</p>
			</div>
		);
	}

	const selectedArtifact = artifacts.find((a) => a.id === selectedArtifactId);

	function handleCopy() {
		navigator.clipboard.writeText(artifactContent);
		addToast({ type: "success", message: "Copied to clipboard" });
	}

	function handleDownload() {
		if (!selectedArtifact) return;
		const blob = new Blob([artifactContent], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = selectedArtifact.filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	return (
		<div className="border-b border-gray-800">
			{/* Header */}
			<div className="flex items-center justify-between px-3 pt-3 pb-2">
				<h3 className="text-xs font-medium uppercase tracking-wider text-gray-400">
					Artifacts ({artifacts.length})
				</h3>
				{selectedArtifactId && (
					<div className="flex items-center gap-1">
						<button
							onClick={() => setShowSearch(!showSearch)}
							className="rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-300"
							title="Search"
						>
							<Search size={12} />
						</button>
						<button
							onClick={() =>
								setViewMode(viewMode === "preview" ? "raw" : "preview")
							}
							className="rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-300"
							title={viewMode === "preview" ? "View raw" : "View preview"}
						>
							{viewMode === "preview" ? <Code size={12} /> : <Eye size={12} />}
						</button>
						<button
							onClick={handleCopy}
							className="rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-300"
							title="Copy"
						>
							<ClipboardCopy size={12} />
						</button>
						<button
							onClick={handleDownload}
							className="rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-300"
							title="Download"
						>
							<Download size={12} />
						</button>
					</div>
				)}
			</div>

			{/* Search bar */}
			{showSearch && (
				<div className="px-3 pb-2">
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search in artifact..."
						className="w-full rounded bg-gray-900 border border-gray-700 px-2 py-1 text-xs text-gray-300 placeholder-gray-600 focus:border-blue-600 focus:outline-none"
					/>
				</div>
			)}

			{/* Artifact list */}
			<ul className="space-y-0.5 px-3">
				{artifacts.map((a) => {
					const isSelected = selectedArtifactId === a.id;
					return (
						<li key={a.id}>
							<button
								onClick={() => {
									selectArtifact(isSelected ? null : a.id);
									setViewMode("preview");
									setSearchQuery("");
								}}
								className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
									isSelected
										? "bg-purple-600/20 text-purple-300"
										: "text-gray-300 hover:bg-gray-800"
								}`}
							>
								{isSelected ? (
									<ChevronDown size={12} />
								) : (
									<ChevronRight size={12} />
								)}
								<ArtifactIcon type={a.type} />
								<span className="flex-1 truncate">{a.filename}</span>
								<span className="text-[11px] text-gray-500">{a.type}</span>
							</button>
						</li>
					);
				})}
			</ul>

			{/* Content viewer */}
			{selectedArtifactId && artifactContent && selectedArtifact && (
				<div className="mx-3 my-2 max-h-[400px] overflow-y-auto rounded border border-gray-800 bg-gray-900/70">
					{viewMode === "raw" ? (
						<RawView content={artifactContent} searchQuery={searchQuery} />
					) : (
						<ArtifactPreview
							content={artifactContent}
							type={selectedArtifact.type}
							filename={selectedArtifact.filename}
							searchQuery={searchQuery}
						/>
					)}
				</div>
			)}

			{/* Spacer */}
			<div className="h-2" />
		</div>
	);
}

// --- Preview Router ---

function ArtifactPreview({
	content,
	type,
	filename,
	searchQuery,
}: {
	content: string;
	type: string;
	filename: string;
	searchQuery: string;
}) {
	// Try to detect JSON
	if (type === "json" || filename.endsWith(".json")) {
		return <JsonRenderer content={content} searchQuery={searchQuery} />;
	}

	if (type === "behavior-scenarios" || type === "behavior_scenarios") {
		return <BehaviorScenariosRenderer content={content} />;
	}

	if (type === "review" || filename.includes("review")) {
		return <ReviewRenderer content={content} />;
	}

	if (type === "domain" || type === "ddd" || filename.includes("domain")) {
		return <DomainRenderer content={content} />;
	}

	// Default: markdown-like rendering
	return <MarkdownRenderer content={content} searchQuery={searchQuery} />;
}

// --- Renderers ---

function MarkdownRenderer({
	content,
	searchQuery,
}: {
	content: string;
	searchQuery: string;
}) {
	const lines = content.split("\n");

	return (
		<div className="p-3 space-y-1 text-sm text-gray-300">
			{lines.map((line, i) => {
				const highlighted = highlightSearch(line, searchQuery);

				// Headings
				if (line.startsWith("### ")) {
					return (
						<h4
							key={i}
							className="text-sm font-semibold text-gray-200 mt-3 mb-1"
						>
							{highlighted || line.slice(4)}
						</h4>
					);
				}
				if (line.startsWith("## ")) {
					return (
						<h3
							key={i}
							className="text-sm font-bold text-gray-100 mt-4 mb-1 border-b border-gray-800 pb-1"
						>
							{highlighted || line.slice(3)}
						</h3>
					);
				}
				if (line.startsWith("# ")) {
					return (
						<h2 key={i} className="text-base font-bold text-white mt-4 mb-2">
							{highlighted || line.slice(2)}
						</h2>
					);
				}

				// Code blocks (simplified — just monospace)
				if (line.startsWith("```")) {
					return <div key={i} className="border-t border-gray-800 my-1" />;
				}

				// Checklist
				if (line.startsWith("- [x] ")) {
					return (
						<div key={i} className="flex items-center gap-2 text-emerald-400">
							<span className="text-xs">&#9745;</span>
							<span>{highlighted || line.slice(6)}</span>
						</div>
					);
				}
				if (line.startsWith("- [ ] ")) {
					return (
						<div key={i} className="flex items-center gap-2 text-gray-400">
							<span className="text-xs">&#9744;</span>
							<span>{highlighted || line.slice(6)}</span>
						</div>
					);
				}

				// Bullet points
				if (line.startsWith("- ") || line.startsWith("* ")) {
					return (
						<div key={i} className="flex items-start gap-2 pl-2">
							<span className="text-gray-600 mt-1.5 text-[6px]">&#9679;</span>
							<span>{highlighted || line.slice(2)}</span>
						</div>
					);
				}

				// Numbered list
				if (/^\d+\.\s/.test(line)) {
					const match = line.match(/^(\d+)\.\s(.*)$/);
					if (match) {
						return (
							<div key={i} className="flex items-start gap-2 pl-2">
								<span className="text-gray-500 text-xs font-mono w-4 shrink-0">
									{match[1]}.
								</span>
								<span>{highlighted || match[2]}</span>
							</div>
						);
					}
				}

				// Blockquote
				if (line.startsWith("> ")) {
					return (
						<div
							key={i}
							className="border-l-2 border-gray-600 pl-3 text-gray-400 italic"
						>
							{highlighted || line.slice(2)}
						</div>
					);
				}

				// Empty line
				if (line.trim() === "") {
					return <div key={i} className="h-2" />;
				}

				// Regular text (or code inside block)
				if (line.startsWith("  ") || line.startsWith("\t")) {
					return (
						<div
							key={i}
							className="font-mono text-xs text-blue-300/80 bg-gray-900 px-2 py-0.5 rounded"
						>
							{highlighted || line}
						</div>
					);
				}

				return (
					<p key={i} className="leading-relaxed">
						{highlighted || line}
					</p>
				);
			})}
		</div>
	);
}

function JsonRenderer({
	content,
	searchQuery,
}: {
	content: string;
	searchQuery: string;
}) {
	const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch {
		// Not valid JSON, fall back to raw
		return <RawView content={content} searchQuery={searchQuery} />;
	}

	function toggleCollapse(path: string) {
		setCollapsed((prev) => {
			const next = new Set(prev);
			if (next.has(path)) next.delete(path);
			else next.add(path);
			return next;
		});
	}

	function renderValue(
		value: unknown,
		path: string,
		depth: number,
	): React.ReactNode {
		if (value === null) return <span className="text-gray-500">null</span>;
		if (typeof value === "boolean")
			return <span className="text-amber-400">{String(value)}</span>;
		if (typeof value === "number")
			return <span className="text-cyan-400">{value}</span>;
		if (typeof value === "string") {
			const truncated =
				value.length > 100 ? value.slice(0, 100) + "..." : value;
			return <span className="text-emerald-400">"{truncated}"</span>;
		}

		if (Array.isArray(value)) {
			if (value.length === 0) return <span className="text-gray-500">[]</span>;
			const isCollapsed = collapsed.has(path);
			return (
				<span>
					<button
						onClick={() => toggleCollapse(path)}
						className="text-gray-500 hover:text-gray-300"
					>
						{isCollapsed ? "▶" : "▼"} [{value.length}]
					</button>
					{!isCollapsed && (
						<div className="ml-4 border-l border-gray-800 pl-2">
							{value.map((item, i) => (
								<div key={i} className="py-0.5">
									{renderValue(item, `${path}[${i}]`, depth + 1)}
								</div>
							))}
						</div>
					)}
				</span>
			);
		}

		if (typeof value === "object") {
			const entries = Object.entries(value as Record<string, unknown>);
			if (entries.length === 0)
				return <span className="text-gray-500">{"{}"}</span>;
			const isCollapsed = collapsed.has(path);
			return (
				<span>
					<button
						onClick={() => toggleCollapse(path)}
						className="text-gray-500 hover:text-gray-300"
					>
						{isCollapsed ? "▶" : "▼"} {"{"}
						{entries.length}
						{"}"}
					</button>
					{!isCollapsed && (
						<div className="ml-4 border-l border-gray-800 pl-2">
							{entries.map(([key, val]) => (
								<div key={key} className="py-0.5">
									<span className="text-purple-400">{key}</span>
									<span className="text-gray-600">: </span>
									{renderValue(val, `${path}.${key}`, depth + 1)}
								</div>
							))}
						</div>
					)}
				</span>
			);
		}

		return <span className="text-gray-400">{String(value)}</span>;
	}

	return (
		<div className="p-3 font-mono text-xs overflow-x-auto">
			{renderValue(parsed, "$", 0)}
		</div>
	);
}

function BehaviorScenariosRenderer({ content }: { content: string }) {
	let scenarios: Array<{
		title?: string;
		given?: string;
		when?: string;
		then?: string;
		notes?: string;
		[key: string]: unknown;
	}> = [];

	try {
		const parsed = JSON.parse(content);
		scenarios = Array.isArray(parsed) ? parsed : (parsed.scenarios ?? [parsed]);
	} catch {
		// Try to parse as markdown BDD
		return <MarkdownRenderer content={content} searchQuery="" />;
	}

	if (scenarios.length === 0) {
		return <MarkdownRenderer content={content} searchQuery="" />;
	}

	return (
		<div className="p-3 space-y-2">
			{scenarios.map((scenario, i) => (
				<div
					key={i}
					className="rounded border border-gray-800 bg-gray-900/50 p-3"
				>
					{scenario.title && (
						<h4 className="text-sm font-semibold text-gray-200 mb-2">
							{scenario.title}
						</h4>
					)}
					{scenario.given && (
						<div className="flex gap-2 text-xs mb-1">
							<span className="font-bold text-blue-400 w-12 shrink-0">
								Given
							</span>
							<span className="text-gray-300">{scenario.given}</span>
						</div>
					)}
					{scenario.when && (
						<div className="flex gap-2 text-xs mb-1">
							<span className="font-bold text-amber-400 w-12 shrink-0">
								When
							</span>
							<span className="text-gray-300">{scenario.when}</span>
						</div>
					)}
					{scenario.then && (
						<div className="flex gap-2 text-xs mb-1">
							<span className="font-bold text-emerald-400 w-12 shrink-0">
								Then
							</span>
							<span className="text-gray-300">{scenario.then}</span>
						</div>
					)}
					{scenario.notes && (
						<p className="mt-2 text-[11px] text-gray-500 italic">
							{scenario.notes}
						</p>
					)}
				</div>
			))}
		</div>
	);
}

function ReviewRenderer({ content }: { content: string }) {
	const lines = content.split("\n");
	const findings: Array<{ severity: string; text: string }> = [];
	let currentSeverity = "info";

	for (const line of lines) {
		if (
			line.toLowerCase().includes("critical") ||
			line.toLowerCase().includes("error")
		) {
			currentSeverity = "critical";
		} else if (
			line.toLowerCase().includes("warning") ||
			line.toLowerCase().includes("warn")
		) {
			currentSeverity = "warning";
		} else if (
			line.toLowerCase().includes("suggestion") ||
			line.toLowerCase().includes("info")
		) {
			currentSeverity = "info";
		}

		if (line.startsWith("- ") || line.startsWith("* ")) {
			findings.push({ severity: currentSeverity, text: line.slice(2) });
		}
	}

	if (findings.length === 0) {
		return <MarkdownRenderer content={content} searchQuery="" />;
	}

	const severityStyles: Record<
		string,
		{ border: string; bg: string; badge: string }
	> = {
		critical: {
			border: "border-red-800",
			bg: "bg-red-950/30",
			badge: "bg-red-900/50 text-red-300",
		},
		warning: {
			border: "border-amber-800",
			bg: "bg-amber-950/20",
			badge: "bg-amber-900/50 text-amber-300",
		},
		info: {
			border: "border-blue-800",
			bg: "bg-blue-950/20",
			badge: "bg-blue-900/50 text-blue-300",
		},
	};

	return (
		<div className="p-3 space-y-1.5">
			{findings.map((f, i) => {
				const style = severityStyles[f.severity] || severityStyles.info;
				return (
					<div
						key={i}
						className={`rounded border ${style.border} ${style.bg} px-3 py-2 flex items-start gap-2`}
					>
						<span
							className={`rounded px-1.5 py-0.5 text-[11px] font-medium shrink-0 ${style.badge}`}
						>
							{f.severity}
						</span>
						<span className="text-xs text-gray-300">{f.text}</span>
					</div>
				);
			})}
		</div>
	);
}

function DomainRenderer({ content }: { content: string }) {
	// Try JSON first
	try {
		const parsed = JSON.parse(content);
		const entities = parsed.entities ?? parsed.aggregates ?? [];
		const events = parsed.events ?? parsed.domainEvents ?? [];
		const invariants = parsed.invariants ?? parsed.rules ?? [];

		if (entities.length || events.length || invariants.length) {
			return (
				<div className="p-3 space-y-3">
					{entities.length > 0 && (
						<div>
							<h4 className="text-xs font-bold text-purple-400 uppercase mb-1">
								Entities / Aggregates
							</h4>
							<div className="space-y-1">
								{entities.map((e: any, i: number) => (
									<div
										key={i}
										className="rounded bg-purple-950/20 border border-purple-800/30 px-2 py-1.5 text-xs text-gray-300"
									>
										<span className="font-semibold text-purple-300">
											{e.name ?? e}
										</span>
										{e.description && (
											<span className="text-gray-500 ml-2">
												— {e.description}
											</span>
										)}
									</div>
								))}
							</div>
						</div>
					)}
					{events.length > 0 && (
						<div>
							<h4 className="text-xs font-bold text-cyan-400 uppercase mb-1">
								Domain Events
							</h4>
							<div className="flex flex-wrap gap-1">
								{events.map((e: any, i: number) => (
									<span
										key={i}
										className="rounded bg-cyan-950/30 border border-cyan-800/30 px-2 py-0.5 text-[11px] text-cyan-300"
									>
										{e.name ?? e}
									</span>
								))}
							</div>
						</div>
					)}
					{invariants.length > 0 && (
						<div>
							<h4 className="text-xs font-bold text-amber-400 uppercase mb-1">
								Invariants / Rules
							</h4>
							<ul className="space-y-0.5">
								{invariants.map((inv: any, i: number) => (
									<li
										key={i}
										className="text-xs text-gray-300 flex items-start gap-1.5"
									>
										<span className="text-amber-500 mt-0.5">&#9679;</span>
										{inv.description ?? inv.rule ?? inv}
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			);
		}
	} catch {
		// Not JSON — render as markdown
	}

	return <MarkdownRenderer content={content} searchQuery="" />;
}

function RawView({
	content,
	searchQuery,
}: {
	content: string;
	searchQuery: string;
}) {
	return (
		<pre className="p-3 whitespace-pre-wrap text-xs text-gray-300 font-mono">
			{searchQuery ? highlightSearchRaw(content, searchQuery) : content}
		</pre>
	);
}

// --- Helpers ---

function ArtifactIcon({ type }: { type: string }) {
	const codeTypes = ["code", "implementation_plan", "json"];
	if (codeTypes.includes(type)) {
		return <FileCode size={14} className="shrink-0 text-blue-400" />;
	}
	return <FileText size={14} className="shrink-0 text-amber-400" />;
}

function highlightSearch(text: string, query: string): React.ReactNode | null {
	if (!query || !text.toLowerCase().includes(query.toLowerCase())) return null;

	const idx = text.toLowerCase().indexOf(query.toLowerCase());
	return (
		<>
			{text.slice(0, idx)}
			<mark className="bg-yellow-500/30 text-yellow-200 rounded px-0.5">
				{text.slice(idx, idx + query.length)}
			</mark>
			{text.slice(idx + query.length)}
		</>
	);
}

function highlightSearchRaw(text: string, query: string): React.ReactNode {
	if (!query) return text;
	const parts = text.split(new RegExp(`(${escapeRegex(query)})`, "gi"));
	return (
		<>
			{parts.map((part, i) =>
				part.toLowerCase() === query.toLowerCase() ? (
					<mark
						key={i}
						className="bg-yellow-500/30 text-yellow-200 rounded px-0.5"
					>
						{part}
					</mark>
				) : (
					part
				),
			)}
		</>
	);
}

function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
