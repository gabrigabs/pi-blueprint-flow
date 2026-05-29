import { useStore } from "../store";
import { FolderOpen, GitBranch, Plus } from "lucide-react";

export function ProjectSidebar() {
  const { projects, features, selectedProjectId, selectedFeatureId, selectProject, selectFeature } =
    useStore();

  return (
    <div className="flex h-full flex-col">
      {/* Projects */}
      <div className="border-b border-gray-800 p-3">
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-400">
          <FolderOpen size={12} /> Projects
        </h2>
        {projects.length === 0 ? (
          <p className="text-xs text-gray-500">No projects yet</p>
        ) : (
          <ul className="space-y-1">
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => selectProject(p.id)}
                  className={`w-full rounded px-2 py-1.5 text-left text-sm transition-colors ${
                    selectedProjectId === p.id
                      ? "bg-blue-600/20 text-blue-300"
                      : "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  <span className="block truncate font-medium">{p.name}</span>
                  {p.description && (
                    <span className="block truncate text-xs text-gray-500">
                      {p.description}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Features */}
      {selectedProjectId && (
        <div className="flex-1 overflow-y-auto p-3">
          <h2 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-400">
            <GitBranch size={12} /> Features
          </h2>
          {features.length === 0 ? (
            <p className="text-xs text-gray-500">No features yet</p>
          ) : (
            <ul className="space-y-1">
              {features.map((f) => (
                <li key={f.id}>
                  <button
                    onClick={() => selectFeature(f.id)}
                    className={`w-full rounded px-2 py-1.5 text-left text-sm transition-colors ${
                      selectedFeatureId === f.id
                        ? "bg-emerald-600/20 text-emerald-300"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    <span className="block truncate font-medium">{f.title}</span>
                    <span className="flex items-center gap-2 text-xs text-gray-500">
                      <StatusBadge status={f.status} />
                      <span>{f.current_step}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-gray-600",
    in_progress: "bg-blue-500",
    done: "bg-emerald-500",
    archived: "bg-gray-500",
  };

  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${colors[status] || "bg-gray-600"}`}
    />
  );
}
