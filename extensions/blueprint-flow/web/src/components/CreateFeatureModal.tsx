import { useState } from "react";
import { X, GitBranch } from "lucide-react";
import { useStore } from "../store";
import { api } from "../lib/api";
import { AgentRunSettingsPanel } from "./AgentRunSettingsPanel";
import type { AgentRunSettingsPayload } from "../lib/api";

const FEATURE_TYPES = [
  { value: "feature", label: "Feature" },
  { value: "bugfix", label: "Bugfix" },
  { value: "refactor", label: "Refactor" },
  { value: "spike", label: "Spike" },
  { value: "research", label: "Research" },
  { value: "maintenance", label: "Maintenance" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

const RISK_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

export function CreateFeatureModal() {
  const { closeModal, selectedProjectId, setFeatures } = useStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("feature");
  const [priority, setPriority] = useState("medium");
  const [riskLevel, setRiskLevel] = useState("auto");
  const [settings, setSettings] = useState<AgentRunSettingsPayload>({
    effortLevel: "balanced",
    executionMode: "draft",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !selectedProjectId) return;

    setLoading(true);
    setError(null);

    try {
      await api.features.create(selectedProjectId, {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        priority,
        riskLevel,
        agentRunSettings: settings,
      });

      const features = await api.features.list(selectedProjectId);
      setFeatures(features);
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create feature");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-100">
            <GitBranch size={16} className="text-emerald-400" />
            New Feature / Task
          </h2>
          <button
            onClick={closeModal}
            className="rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-300"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add user authentication with OAuth2"
              autoFocus
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of what this should accomplish..."
              rows={3}
              className="w-full resize-none rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Type + Priority + Risk */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-gray-300 focus:border-blue-500 focus:outline-none"
              >
                {FEATURE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-gray-300 focus:border-blue-500 focus:outline-none"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Risk</label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value)}
                className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-gray-300 focus:border-blue-500 focus:outline-none"
              >
                {RISK_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Agent Run Settings */}
          <div className="rounded border border-gray-800 bg-gray-950/50 p-3">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
              Agent Settings
            </h3>
            <AgentRunSettingsPanel value={settings} onChange={setSettings} />
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
              disabled={!title.trim() || loading}
              className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
