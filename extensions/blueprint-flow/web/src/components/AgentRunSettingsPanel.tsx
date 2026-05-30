import { useState } from "react";
import { Cpu, Zap, Scale, Brain, Flame } from "lucide-react";
import type { AgentRunSettingsPayload } from "../lib/api";

interface Props {
  value: AgentRunSettingsPayload;
  onChange: (settings: AgentRunSettingsPayload) => void;
  compact?: boolean;
}

const EFFORT_OPTIONS = [
  { value: "fast", label: "Fast", icon: Zap, description: "Quick tasks, minimal research" },
  { value: "balanced", label: "Balanced", icon: Scale, description: "Standard workflow" },
  { value: "deep", label: "Deep", icon: Brain, description: "Complex features, thorough review" },
  { value: "max", label: "Max", icon: Flame, description: "Critical changes, full rigor" },
] as const;

const MODE_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "review", label: "Review" },
  { value: "apply", label: "Apply" },
] as const;

export function AgentRunSettingsPanel({ value, onChange, compact }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  function update(partial: Partial<AgentRunSettingsPayload>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="space-y-3">
      {/* Model */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">
          <Cpu size={10} className="mr-1 inline" />
          Model
        </label>
        <input
          type="text"
          value={value.modelId ?? ""}
          onChange={(e) => update({ modelId: e.target.value || undefined })}
          placeholder="default"
          className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Effort Level */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-400">Effort</label>
        <div className="grid grid-cols-4 gap-1">
          {EFFORT_OPTIONS.map(({ value: v, label, icon: Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => update({ effortLevel: v })}
              className={`flex flex-col items-center gap-0.5 rounded px-2 py-1.5 text-xs transition-colors ${
                value.effortLevel === v
                  ? "bg-blue-600/30 text-blue-300 ring-1 ring-blue-500/50"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-750 hover:text-gray-300"
              }`}
            >
              <Icon size={12} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Execution Mode */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-400">Mode</label>
        <div className="grid grid-cols-3 gap-1">
          {MODE_OPTIONS.map(({ value: v, label }) => (
            <button
              key={v}
              type="button"
              onClick={() => update({ executionMode: v })}
              className={`rounded px-2 py-1.5 text-xs transition-colors ${
                value.executionMode === v
                  ? "bg-emerald-600/30 text-emerald-300 ring-1 ring-emerald-500/50"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-750 hover:text-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      {!compact && (
        <div className="space-y-1.5">
          <label className="mb-1 block text-xs font-medium text-gray-400">Options</label>
          <ToggleOption
            label="Use memory"
            checked={value.allowMemorySearch !== false}
            onChange={(v) => update({ allowMemorySearch: v })}
          />
          <ToggleOption
            label="Scan repo"
            checked={value.allowRepoScan !== false}
            onChange={(v) => update({ allowRepoScan: v })}
          />
          <ToggleOption
            label="Web research"
            checked={value.allowWebResearch !== false}
            onChange={(v) => update({ allowWebResearch: v })}
          />
        </div>
      )}

      {/* Advanced */}
      {!compact && (
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-gray-500 hover:text-gray-400"
        >
          {showAdvanced ? "Hide advanced" : "Advanced options..."}
        </button>
      )}

      {showAdvanced && !compact && (
        <div className="space-y-2 rounded border border-gray-800 bg-gray-900/50 p-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-0.5 block text-xs text-gray-500">Max research results</label>
              <input
                type="number"
                min={1}
                max={30}
                value={value.maxResearchResults ?? ""}
                onChange={(e) => update({ maxResearchResults: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="auto"
                className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-300 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-xs text-gray-500">Max interview questions</label>
              <input
                type="number"
                min={1}
                max={20}
                value={value.maxInterviewQuestions ?? ""}
                onChange={(e) => update({ maxInterviewQuestions: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="auto"
                className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-300 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-0.5 block text-xs text-gray-500">Review strictness</label>
            <select
              value={value.reviewStrictness ?? "normal"}
              onChange={(e) => update({ reviewStrictness: e.target.value })}
              className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-300 focus:border-blue-500 focus:outline-none"
            >
              <option value="light">Light</option>
              <option value="normal">Normal</option>
              <option value="strict">Strict</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3 w-3 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-0 focus:ring-offset-0"
      />
      <span className="text-xs text-gray-400">{label}</span>
    </label>
  );
}
