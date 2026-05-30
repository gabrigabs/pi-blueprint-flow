import { useState } from "react";
import { X, Download, FileSearch, AlertTriangle } from "lucide-react";
import { useStore } from "../store";
import { api } from "../lib/api";
import { AgentRunSettingsPanel } from "./AgentRunSettingsPanel";
import type { AgentRunSettingsPayload, ImportResult } from "../lib/api";

export function ImportProjectModal() {
  const { closeModal, setProjects, selectProject } = useStore();
  const [repoPath, setRepoPath] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"analyze_only" | "migrate_with_review">("analyze_only");
  const [settings, setSettings] = useState<AgentRunSettingsPayload>({
    effortLevel: "deep",
    executionMode: "review",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!repoPath.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const importResult = await api.projects.import({
        repoPath: repoPath.trim(),
        name: name.trim() || undefined,
        mode,
        agentRunSettings: settings,
      });

      setResult(importResult);

      if (importResult.projectId) {
        const projects = await api.projects.list();
        setProjects(projects);
        selectProject(importResult.projectId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-100">
              <FileSearch size={16} className="text-amber-400" />
              Import Report
            </h2>
            <button
              onClick={closeModal}
              className="rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-300"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4 p-4">
            <div className="rounded border border-emerald-800/50 bg-emerald-950/30 p-3">
              <p className="text-sm font-medium text-emerald-300">
                {result.mode === "analyze_only" ? "Analysis complete" : "Project imported"}
              </p>
              <p className="mt-1 text-xs text-gray-400">{result.repoPath}</p>
            </div>

            {/* Stack */}
            <div>
              <h3 className="mb-1 text-xs font-medium text-gray-400">Detected Stack</h3>
              <div className="flex flex-wrap gap-1">
                {[...result.stack.languages, ...result.stack.frameworks, ...result.stack.buildTools].map((item) => (
                  <span key={item} className="rounded bg-blue-900/30 px-2 py-0.5 text-xs text-blue-300">
                    {item}
                  </span>
                ))}
                {result.stack.languages.length === 0 && (
                  <span className="text-xs text-gray-500">None detected</span>
                )}
              </div>
            </div>

            {/* Structure */}
            <div>
              <h3 className="mb-1 text-xs font-medium text-gray-400">Structure</h3>
              <p className="text-xs text-gray-300">
                {result.structure.totalFiles} files, {result.structure.directories} directories
                {result.structure.truncated && " (truncated)"}
              </p>
            </div>

            {/* Agentic Files */}
            {result.agenticFiles.length > 0 && (
              <div>
                <h3 className="mb-1 flex items-center gap-1 text-xs font-medium text-amber-400">
                  <AlertTriangle size={10} />
                  Agentic Files Detected
                </h3>
                <ul className="space-y-1">
                  {result.agenticFiles.map((f) => (
                    <li key={f.relativePath} className="rounded border border-gray-800 bg-gray-950 p-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-gray-300">{f.relativePath}</span>
                        <span className="text-xs text-gray-500">{f.type}</span>
                      </div>
                      {f.rulesCount > 0 && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {f.rulesCount} rules extracted
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={closeModal}
                className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-100">
            <Download size={16} className="text-amber-400" />
            Import Project
          </h2>
          <button
            onClick={closeModal}
            className="rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-300"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">
              Repository Path <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              placeholder="/path/to/existing/project"
              autoFocus
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-mono text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">
              Project Name <span className="text-gray-600">(auto-detected if empty)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="auto-detect from folder name"
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Mode */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Import Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("analyze_only")}
                className={`rounded border p-2 text-left text-xs transition-colors ${
                  mode === "analyze_only"
                    ? "border-blue-500/50 bg-blue-950/30 text-blue-300"
                    : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                }`}
              >
                <span className="block font-medium">Analyze Only</span>
                <span className="mt-0.5 block text-gray-500">Scan without creating project</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("migrate_with_review")}
                className={`rounded border p-2 text-left text-xs transition-colors ${
                  mode === "migrate_with_review"
                    ? "border-emerald-500/50 bg-emerald-950/30 text-emerald-300"
                    : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                }`}
              >
                <span className="block font-medium">Import & Create</span>
                <span className="mt-0.5 block text-gray-500">Create project from scan</span>
              </button>
            </div>
          </div>

          {/* Agent Settings */}
          <div className="rounded border border-gray-800 bg-gray-950/50 p-3">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
              Agent Settings
            </h3>
            <AgentRunSettingsPanel value={settings} onChange={setSettings} compact />
          </div>

          {error && (
            <p className="rounded bg-red-900/30 px-3 py-2 text-xs text-red-400">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={closeModal}
              className="rounded px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!repoPath.trim() || loading}
              className="rounded bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Scanning..." : mode === "analyze_only" ? "Analyze" : "Import"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
