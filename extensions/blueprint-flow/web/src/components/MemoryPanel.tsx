import { BookOpen, Brain, Filter } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "../store";

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
	const { memories, selectedProjectId } = useStore();
	const [filter, setFilter] = useState("all");
	const [tab, setTab] = useState<"memories" | "wiki">("memories");
	const [wikiPages, setWikiPages] = useState<WikiPageSummary[]>([]);

	useEffect(() => {
		if (selectedProjectId) {
			fetch(`/api/projects/${selectedProjectId}/wiki`)
				.then((r) => r.json())
				.then(setWikiPages)
				.catch(() => setWikiPages([]));
		}
	}, [selectedProjectId, memories]); // refresh when memories change (wiki might update)

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
							className={`px-2 py-0.5 text-[10px] font-medium rounded-l transition-colors ${
								tab === "memories"
									? "bg-gray-800 text-gray-200"
									: "text-gray-500 hover:text-gray-300"
							}`}
						>
							Facts ({memories.length})
						</button>
						<button
							onClick={() => setTab("wiki")}
							className={`px-2 py-0.5 text-[10px] font-medium rounded-r transition-colors ${
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
				<WikiView pages={wikiPages} />
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
	if (memories.length === 0) {
		return <p className="text-xs text-gray-500">No memories recorded yet</p>;
	}

	return (
		<div className="flex flex-1 gap-2 overflow-x-auto">
			{memories.map((m) => (
				<div
					key={m.id}
					className="shrink-0 w-72 rounded border border-gray-800 bg-gray-900/50 p-2"
				>
					<div className="mb-1 flex items-center justify-between">
						<CategoryBadge category={m.category} />
						<span className="text-xs text-gray-600">
							{new Date(m.created_at).toLocaleDateString()}
						</span>
					</div>
					<p className="text-sm text-gray-300 line-clamp-3">{m.content}</p>
				</div>
			))}
		</div>
	);
}

function WikiView({ pages }: { pages: WikiPageSummary[] }) {
	if (pages.length === 0) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<div className="text-center">
					<BookOpen size={20} className="mx-auto mb-1 text-gray-600" />
					<p className="text-xs text-gray-500">No wiki pages yet</p>
					<p className="text-[10px] text-gray-600 mt-0.5">
						Wiki pages are created by the agent during research and review
					</p>
				</div>
			</div>
		);
	}

	// Group by category
	const grouped = pages.reduce<Record<string, WikiPageSummary[]>>(
		(acc, page) => {
			if (!acc[page.category]) acc[page.category] = [];
			acc[page.category].push(page);
			return acc;
		},
		{},
	);

	return (
		<div className="flex flex-1 gap-2 overflow-x-auto">
			{Object.entries(grouped).map(([category, categoryPages]) => (
				<div
					key={category}
					className="shrink-0 w-64 rounded border border-gray-800 bg-gray-900/50 p-2"
				>
					<WikiCategoryBadge category={category} />
					<div className="mt-1.5 space-y-1">
						{categoryPages.map((page) => (
							<div key={page.id} className="rounded bg-gray-800/50 px-2 py-1.5">
								<p className="text-xs font-medium text-gray-200">
									{page.title}
								</p>
								{page.summary && (
									<p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">
										{page.summary}
									</p>
								)}
							</div>
						))}
					</div>
				</div>
			))}
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
		<span className={`rounded px-1.5 py-0.5 text-xs font-medium ${style}`}>
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
		<span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">
			<BookOpen size={10} />
			{labels[category] || category}
		</span>
	);
}
