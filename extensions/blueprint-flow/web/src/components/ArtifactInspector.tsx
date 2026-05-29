import { useEffect, useState } from "react";
import { useStore } from "../store";
import { FileCode, FileText, ChevronDown, ChevronRight } from "lucide-react";

export function ArtifactInspector() {
  const { artifacts, selectedArtifactId, selectArtifact } = useStore();
  const [expandedContent, setExpandedContent] = useState<string | null>(null);
  const [artifactContent, setArtifactContent] = useState<string>("");

  useEffect(() => {
    if (selectedArtifactId) {
      fetch(`/api/artifacts/${selectedArtifactId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.content) setArtifactContent(data.content);
        })
        .catch(() => {});
    }
  }, [selectedArtifactId]);

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

  return (
    <div className="border-b border-gray-800 p-3">
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
        Artifacts ({artifacts.length})
      </h3>
      <ul className="space-y-1">
        {artifacts.map((a) => {
          const isSelected = selectedArtifactId === a.id;
          return (
            <li key={a.id}>
              <button
                onClick={() => {
                  selectArtifact(isSelected ? null : a.id);
                  setExpandedContent(isSelected ? null : a.id);
                }}
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                  isSelected
                    ? "bg-purple-600/20 text-purple-300"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                {isSelected ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <ArtifactIcon type={a.type} />
                <span className="flex-1 truncate">{a.filename}</span>
                <span className="text-xs text-gray-500">{a.type}</span>
              </button>
              {isSelected && artifactContent && (
                <div className="mt-1 ml-6 max-h-64 overflow-y-auto rounded bg-gray-900 p-2">
                  <pre className="whitespace-pre-wrap text-xs text-gray-300">
                    {artifactContent}
                  </pre>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ArtifactIcon({ type }: { type: string }) {
  const codeTypes = ["code", "implementation_plan"];
  if (codeTypes.includes(type)) {
    return <FileCode size={14} className="shrink-0 text-blue-400" />;
  }
  return <FileText size={14} className="shrink-0 text-amber-400" />;
}
