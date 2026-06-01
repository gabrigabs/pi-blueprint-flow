import {
	BookOpen,
	Brain,
	ChevronDown,
	ChevronRight,
	Filter,
} from "lucide-react";
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

export function MemoryPanel() {
	const { memories, selectedWorkspaceId } = useStore();
	const [filter, setFilter] = useState("all");
	const [tab, setTab] = useState<"memories" | "wiki">("memories");
	const [wikiPages, setWikiPages] = useState<WikiPageSummary[]>([]);

	useEffect(() => {
		if (selectedWorkspaceId) {
			fetch(`/api/workspaces/${selectedWorkspaceId}/wiki`)
				.then((r) => r.json())
				.then(setWikiPages)
				.catch(() => setWikiPages([]));
		}
	}, [selectedWorkspaceId, memories]);

	const filtered =
		filter === "all" ? memories : memories.filter((m) => m.category === filter);

	return (
		<div className="flex h-full flex-col p-3">
			<div className="mb-2 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-400">
						<Brain size={12} /> Knowledge
					</h3>
					{/* Tab switcher */}
					<div className="flex rounded bg-gray-900 border border-gray-800">
						<button
							onClick={() => setTab("memories")}
							className={`px-2 py-0.5 text-[11px] font-medium rounded-l transition-colors ${
								tab === "memories"
									? "bg-gray-800 text-gray-200"
									: "text-gray-500 hover:text-gray-300"
							}`}
						>
							Facts ({memories.length})
						</button>
						<button
							onClick={() => setTab("wiki")}
							className={`px-2 py-0.5 text-[11px] font-medium rounded-r transition-colors ${
								tab === "wiki"
									? "bg-gray-800 text-gray-200"
									: "text-gray-500 hover:text-gray-300"
							}`}
						>
							Wiki ({wikiPages.length})
						</button>
					</div>
				</div>
				{tab === "memories" && (
					<div className="flex items-center gap-1">
						<Filter size={10} className="text-gray-500" />
						<select
							value={filter}
							onChange={(e) => setFilter(e.target.value)}
							className="rounded border border-gray-700 bg-gray-900 px-1.5 py-0.5 text-xs text-gray-300"
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

			{tab === "memories" ? (
				<MemoriesView memories={filtered} />
			) : (
				<WikiView pages={wikiPages} workspaceId={selectedWorkspaceId} />
			)}
		</div>
	);
}

function MemoriesView({
	memories,
}: {
	memories: Array<{
		id: string;
		category: string;
		content: string;
		created_at: string;
	}>;
}) {
	const [expandedId, setExpandedId] = useState<string | null>(null);

	if (memories.length === 0) {
		return <p className="text-xs text-gray-500">No memories recorded yet</p>;
	}

	return (
		<div className="flex-1 overflow-y-auto scrollbar-thin space-y-1.5">
			{memories.map((m) => {
				const isExpanded = expandedId === m.id;
				const firstLine = m.content.split("\n")[0].slice(0, 120);

				return (
					<div
						key={m.id}
						className={`rounded-lg border transition-all duration-200 ${
							isExpanded
								? "border-[var(--border-default)] bg-[var(--bg-surface)]"
								: "border-[var(--border-subtle)] hover:border-[var(--border-default)]"
						}`}
					>
						{/* Card header */}
						<button
							onClick={() => setExpandedId(isExpanded ? null : m.id)}
							className="flex w-full items-center gap-2 px-3 py-2 text-left"
						>
							{isExpanded ? (
								<ChevronDown
									size={11}
									className="text-[var(--text-muted)] shrink-0"
								/>
							) : (
								<ChevronRight
									size={11}
									className="text-[var(--text-muted)] shrink-0"
								/>
							)}
							<CategoryBadge category={m.category} />
							<span className="flex-1 truncate text-xs text-gray-300">
								{firstLine}
							</span>
							<span className="text-[11px] text-gray-600 shrink-0">
								{new Date(m.created_at).toLocaleDateString()}
							</span>
						</button>

						{/* Expanded content */}
						{isExpanded && (
							<div className="border-t border-[var(--border-subtle)] px-4 py-3 max-h-[300px] overflow-y-auto scrollbar-thin animate-fade-up">
								<MarkdownContent content={m.content} />
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

function WikiView({
	pages,
	workspaceId,
}: {
	pages: WikiPageSummary[];
	workspaceId: string | null;
}) {
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [wikiContent, setWikiContent] = useState<string>("");

	useEffect(() => {
		if (expandedId && workspaceId) {
			fetch(`/api/workspaces/${workspaceId}/wiki/${expandedId}`)
				.then((r) => r.json())
				.then((data) => {
					if (data.content) setWikiContent(data.content);
				})
				.catch(() => setWikiContent(""));
		}
	}, [expandedId, workspaceId]);

	if (pages.length === 0) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<div className="text-center">
					<BookOpen size={20} className="mx-auto mb-1 text-gray-600" />
					<p className="text-xs text-gray-500">No wiki pages yet</p>
					<p className="text-[11px] text-gray-600 mt-0.5">
						Wiki pages are created by the agent during research and review
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 overflow-y-auto scrollbar-thin space-y-1.5">
			{pages.map((page) => {
				const isExpanded = expandedId === page.id;

				return (
					<div
						key={page.id}
						className={`rounded-lg border transition-all duration-200 ${
							isExpanded
								? "border-[var(--border-default)] bg-[var(--bg-surface)]"
								: "border-[var(--border-subtle)] hover:border-[var(--border-default)]"
						}`}
					>
						<button
							onClick={() => {
								setExpandedId(isExpanded ? null : page.id);
								if (!isExpanded) setWikiContent("");
							}}
							className="flex w-full items-center gap-2 px-3 py-2 text-left"
						>
							{isExpanded ? (
								<ChevronDown
									size={11}
									className="text-[var(--text-muted)] shrink-0"
								/>
							) : (
								<ChevronRight
									size={11}
									className="text-[var(--text-muted)] shrink-0"
								/>
							)}
							<BookOpen size={11} className="text-gray-500 shrink-0" />
							<span className="flex-1 truncate text-xs font-medium text-gray-200">
								{page.title}
							</span>
							<WikiCategoryBadge category={page.category} />
						</button>

						{isExpanded && (
							<div className="border-t border-[var(--border-subtle)] px-4 py-3 max-h-[300px] overflow-y-auto scrollbar-thin animate-fade-up">
								{wikiContent ? (
									<MarkdownContent content={wikiContent} />
								) : (
									<div className="flex items-center gap-2 text-xs text-gray-500">
										<div className="h-3 w-3 rounded-full border-2 border-gray-600 border-t-gray-400 animate-spin" />
										Loading...
									</div>
								)}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

function CategoryBadge({ category }: { category: string }) {
	const colors: Record<string, string> = {
		decision: "text-blue-400 bg-blue-900/30",
		pattern: "text-purple-400 bg-purple-900/30",
		constraint: "text-amber-400 bg-amber-900/30",
		learning: "text-emerald-400 bg-emerald-900/30",
		convention: "text-cyan-400 bg-cyan-900/30",
		architecture: "text-orange-400 bg-orange-900/30",
		domain: "text-pink-400 bg-pink-900/30",
	};

	const style = colors[category] || "text-gray-400 bg-gray-800";

	return (
		<span
			className={`rounded px-1.5 py-0.5 text-[11px] font-medium shrink-0 ${style}`}
		>
			{category}
		</span>
	);
}

function WikiCategoryBadge({ category }: { category: string }) {
	const labels: Record<string, string> = {
		project_overview: "Overview",
		architecture: "Architecture",
		domain_rules: "Domain",
		conventions: "Conventions",
		testing_strategy: "Testing",
		integrations: "Integrations",
		agent_instructions: "Agent",
		decisions: "Decisions",
		known_pitfalls: "Pitfalls",
		glossary: "Glossary",
	};

	return (
		<span className="rounded bg-gray-800 px-1.5 py-0.5 text-[11px] text-gray-500 shrink-0">
			{labels[category] || category}
		</span>
	);
}
