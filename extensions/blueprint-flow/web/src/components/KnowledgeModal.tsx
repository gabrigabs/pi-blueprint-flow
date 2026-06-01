import { BookOpen, Brain, ChevronRight, Filter, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "../store";
import { MarkdownContent } from "./MarkdownContent";

const CATEGORIES = [
	"all",
	"decision",
	"pattern",
	"constraint",
	"learning",
	"convention",
	"architecture",
	"domain",
];

interface WikiPageSummary {
	id: string;
	slug: string;
	title: string;
	category: string;
	summary: string | null;
	updated_at: string;
}

export function KnowledgeModal() {
	const { memories, selectedWorkspaceId, closeModal } = useStore();
	const [filter, setFilter] = useState("all");
	const [tab, setTab] = useState<"memories" | "wiki">("memories");
	const [wikiPages, setWikiPages] = useState<WikiPageSummary[]>([]);
	const [selectedItem, setSelectedItem] = useState<{
		type: "memory" | "wiki";
		id: string;
	} | null>(null);
	const [itemContent, setItemContent] = useState<string>("");
	const [loadingContent, setLoadingContent] = useState(false);

	useEffect(() => {
		if (selectedWorkspaceId) {
			fetch(`/api/workspaces/${selectedWorkspaceId}/wiki`)
				.then((r) => r.json())
				.then(setWikiPages)
				.catch(() => setWikiPages([]));
		}
	}, [selectedWorkspaceId, memories]);

	useEffect(() => {
		if (!selectedItem) {
			setItemContent("");
			return;
		}

		if (selectedItem.type === "memory") {
			const mem = memories.find((m) => m.id === selectedItem.id);
			if (mem) setItemContent(mem.content);
		} else if (selectedItem.type === "wiki" && selectedWorkspaceId) {
			setLoadingContent(true);
			fetch(`/api/workspaces/${selectedWorkspaceId}/wiki/${selectedItem.id}`)
				.then((r) => r.json())
				.then((data) => {
					if (data.content) setItemContent(data.content);
				})
				.catch(() => setItemContent(""))
				.finally(() => setLoadingContent(false));
		}
	}, [selectedItem, selectedWorkspaceId, memories]);

	const filtered =
		filter === "all" ? memories : memories.filter((m) => m.category === filter);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<div
				className="absolute inset-0 animate-fade-in"
				style={{
					background: "rgba(0, 0, 0, 0.6)",
					backdropFilter: "blur(4px)",
				}}
				onClick={closeModal}
			/>

			{/* Modal */}
			<div
				className="relative w-full max-w-4xl max-h-[80vh] rounded-2xl border overflow-hidden flex flex-col animate-fade-up"
				style={{
					background: "var(--bg-elevated)",
					borderColor: "var(--border-default)",
					boxShadow: "0 24px 80px rgba(0, 0, 0, 0.5)",
				}}
			>
				{/* Header */}
				<div
					className="flex items-center justify-between px-6 py-4 border-b shrink-0"
					style={{ borderColor: "var(--border-subtle)" }}
				>
					<div className="flex items-center gap-3">
						<div
							className="flex h-8 w-8 items-center justify-center rounded-lg"
							style={{
								background:
									"linear-gradient(135deg, rgba(167, 139, 250, 0.15), rgba(91, 155, 213, 0.1))",
								border: "1px solid rgba(167, 139, 250, 0.2)",
							}}
						>
							<Brain size={14} style={{ color: "#a78bfa" }} />
						</div>
						<div>
							<h2
								className="text-sm font-semibold"
								style={{ color: "var(--text-primary)" }}
							>
								Knowledge Base
							</h2>
							<p
								className="text-[10px] font-mono mt-0.5"
								style={{ color: "var(--text-muted)" }}
							>
								{memories.length} facts · {wikiPages.length} wiki pages
							</p>
						</div>
					</div>

					<button
						onClick={closeModal}
						className="rounded-lg p-2 transition-colors hover:bg-[var(--bg-surface-hover)]"
						style={{ color: "var(--text-muted)" }}
					>
						<X size={16} />
					</button>
				</div>

				{/* Tabs + Filter */}
				<div
					className="flex items-center justify-between px-6 py-3 border-b shrink-0"
					style={{ borderColor: "var(--border-subtle)" }}
				>
					<div
						className="flex items-center gap-1 rounded-lg p-0.5"
						style={{ background: "var(--bg-inset)" }}
					>
						<button
							onClick={() => {
								setTab("memories");
								setSelectedItem(null);
							}}
							className="rounded-md px-3 py-1.5 text-[11px] font-medium transition-all"
							style={{
								background:
									tab === "memories" ? "var(--bg-surface)" : "transparent",
								color:
									tab === "memories"
										? "var(--text-primary)"
										: "var(--text-muted)",
								boxShadow:
									tab === "memories" ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
							}}
						>
							Facts ({memories.length})
						</button>
						<button
							onClick={() => {
								setTab("wiki");
								setSelectedItem(null);
							}}
							className="rounded-md px-3 py-1.5 text-[11px] font-medium transition-all"
							style={{
								background:
									tab === "wiki" ? "var(--bg-surface)" : "transparent",
								color:
									tab === "wiki" ? "var(--text-primary)" : "var(--text-muted)",
								boxShadow:
									tab === "wiki" ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
							}}
						>
							Wiki ({wikiPages.length})
						</button>
					</div>

					{tab === "memories" && (
						<div className="flex items-center gap-2">
							<Filter size={10} style={{ color: "var(--text-muted)" }} />
							<select
								value={filter}
								onChange={(e) => setFilter(e.target.value)}
								className="rounded-lg border px-2 py-1 text-[11px] focus:outline-none"
								style={{
									background: "var(--bg-surface)",
									borderColor: "var(--border-default)",
									color: "var(--text-secondary)",
								}}
							>
								{CATEGORIES.map((cat) => (
									<option key={cat} value={cat}>
										{cat}
									</option>
								))}
							</select>
						</div>
					)}
				</div>

				{/* Content area — split view */}
				<div className="flex flex-1 overflow-hidden min-h-0">
					{/* List */}
					<div
						className="w-72 shrink-0 overflow-y-auto scrollbar-thin border-r p-3 space-y-1"
						style={{ borderColor: "var(--border-subtle)" }}
					>
						{tab === "memories" ? (
							filtered.length === 0 ? (
								<p
									className="text-xs px-2 py-4 text-center"
									style={{ color: "var(--text-muted)" }}
								>
									No memories recorded yet
								</p>
							) : (
								filtered.map((m) => (
									<button
										key={m.id}
										onClick={() =>
											setSelectedItem({ type: "memory", id: m.id })
										}
										className="w-full rounded-lg px-3 py-2.5 text-left transition-all"
										style={{
											background:
												selectedItem?.id === m.id
													? "var(--bg-surface)"
													: "transparent",
											borderLeft:
												selectedItem?.id === m.id
													? "2px solid var(--accent-primary)"
													: "2px solid transparent",
										}}
									>
										<div className="flex items-center gap-2 mb-1">
											<CategoryBadge category={m.category} />
											<span
												className="text-[10px]"
												style={{ color: "var(--text-muted)" }}
											>
												{new Date(m.created_at).toLocaleDateString()}
											</span>
										</div>
										<p
											className="text-xs truncate"
											style={{ color: "var(--text-secondary)" }}
										>
											{m.content.split("\n")[0].slice(0, 80)}
										</p>
									</button>
								))
							)
						) : wikiPages.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-8">
								<BookOpen size={20} style={{ color: "var(--text-muted)" }} />
								<p
									className="text-xs mt-2"
									style={{ color: "var(--text-muted)" }}
								>
									No wiki pages yet
								</p>
							</div>
						) : (
							wikiPages.map((page) => (
								<button
									key={page.id}
									onClick={() => setSelectedItem({ type: "wiki", id: page.id })}
									className="w-full rounded-lg px-3 py-2.5 text-left transition-all"
									style={{
										background:
											selectedItem?.id === page.id
												? "var(--bg-surface)"
												: "transparent",
										borderLeft:
											selectedItem?.id === page.id
												? "2px solid #a78bfa"
												: "2px solid transparent",
									}}
								>
									<div className="flex items-center gap-2">
										<BookOpen
											size={11}
											style={{ color: "var(--text-muted)" }}
										/>
										<span
											className="text-xs font-medium truncate"
											style={{ color: "var(--text-primary)" }}
										>
											{page.title}
										</span>
									</div>
									{page.summary && (
										<p
											className="text-[10px] mt-1 truncate"
											style={{ color: "var(--text-muted)" }}
										>
											{page.summary}
										</p>
									)}
								</button>
							))
						)}
					</div>

					{/* Content viewer */}
					<div className="flex-1 overflow-y-auto scrollbar-thin p-6">
						{!selectedItem ? (
							<div className="flex flex-col items-center justify-center h-full">
								<ChevronRight
									size={24}
									style={{ color: "var(--text-muted)", opacity: 0.3 }}
								/>
								<p
									className="text-xs mt-2"
									style={{ color: "var(--text-muted)" }}
								>
									Select an item to view its content
								</p>
							</div>
						) : loadingContent ? (
							<div
								className="flex items-center gap-2 text-xs"
								style={{ color: "var(--text-muted)" }}
							>
								<div
									className="h-3 w-3 rounded-full border-2 animate-spin"
									style={{
										borderColor: "var(--border-default)",
										borderTopColor: "var(--accent-primary)",
									}}
								/>
								Loading...
							</div>
						) : (
							<div className="animate-fade-in">
								<MarkdownContent content={itemContent} />
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

function CategoryBadge({ category }: { category: string }) {
	const colors: Record<string, { text: string; bg: string }> = {
		decision: { text: "var(--accent-primary)", bg: "var(--cyan-glow)" },
		pattern: { text: "#a78bfa", bg: "rgba(167, 139, 250, 0.1)" },
		constraint: { text: "var(--amber-400)", bg: "var(--amber-glow)" },
		learning: { text: "var(--accent-success)", bg: "var(--emerald-glow)" },
		convention: { text: "var(--cyan-400)", bg: "var(--cyan-glow)" },
		architecture: { text: "var(--amber-400)", bg: "var(--amber-glow)" },
		domain: { text: "#f472b6", bg: "rgba(244, 114, 182, 0.1)" },
	};

	const style = colors[category] ?? {
		text: "var(--text-muted)",
		bg: "var(--bg-surface)",
	};

	return (
		<span
			className="rounded px-1.5 py-0.5 text-[10px] font-medium"
			style={{ color: style.text, background: style.bg }}
		>
			{category}
		</span>
	);
}
