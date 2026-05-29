import { useState } from "react";
import { useStore } from "../store";
import { Brain, Filter } from "lucide-react";

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

export function MemoryPanel() {
  const { memories } = useStore();
  const [filter, setFilter] = useState("all");

  const filtered =
    filter === "all" ? memories : memories.filter((m) => m.category === filter);

  return (
    <div className="flex h-full flex-col p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-400">
          <Brain size={12} /> Project Memory ({memories.length})
        </h3>
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
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-gray-500">No memories recorded yet</p>
      ) : (
        <div className="flex flex-1 gap-2 overflow-x-auto">
          {filtered.map((m) => (
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
      )}
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
