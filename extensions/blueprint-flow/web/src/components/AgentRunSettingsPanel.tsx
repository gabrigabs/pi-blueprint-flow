import { useEffect, useState } from "react";
import { Cpu, Zap, Scale, Brain, Flame, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import type { AgentConfigResponse, AgentModelInfo, AgentRunSettingsPayload, ThinkingLevel } from "../lib/api";

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
  const [agentConfig, setAgentConfig] = useState<AgentConfigResponse | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setConfigLoading(true);
    api.config
      .agent()
      .then((config) => {
        if (!cancelled) {
          setAgentConfig(config);
          setConfigError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setConfigError(err.message);
      })
      .finally(() => {
        if (!cancelled) setConfigLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  function update(partial: Partial<AgentRunSettingsPayload>) {
    onChange({ ...value, ...partial });
  }

  const models = agentConfig?.models ?? [];
  const hasModels = models.length > 0;
  const defaultModel = agentConfig?.defaultModel;

  return (
    <div className="space-y-3">
      {/* Model Selector */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">
          <Cpu size={10} className="mr-1 inline" />
          Model
        </label>
        {configLoading ? (
          <div className="flex items-center gap-1.5 rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-500">
            <Loader2 size={10} className="animate-spin" />
            Loading models...
          </div>
        ) : hasModels ? (
          <select
            value={value.modelId ?? ""}
            onChange={(e) => update({ modelId: e.target.value || undefined })}
            className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
          >
            <option value="">
              {defaultModel ? `default (${defaultModel})` : "default"}
            </option>
            {groupModelsByProvider(models).map(([provider, providerModels]) => (
              <optgroup key={provider} label={provider}>
                {providerModels.map((m) => (
                  <option key={`${m.provider}/${m.id}`} value={m.id}>
                    {m.name}{m.reasoning ? " (reasoning)" : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={value.modelId ?? ""}
            onChange={(e) => update({ modelId: e.target.value || undefined })}
            placeholder={defaultModel ?? "default"}
            className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
          />
        )}
        {configError && (
          <p className="mt-0.5 text-xs text-amber-500/70">
            Could not load models from Pi agent
          </p>
        )}
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

      {/* Thinking Level (only if Pi agent connected) */}
      {agentConfig && agentConfig.thinkingLevels.length > 0 && !compact && (
        <ThinkingLevelSelector
          levels={agentConfig.thinkingLevels}
          current={agentConfig.currentThinkingLevel}
        />
      )}

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

function ThinkingLevelSelector({
  levels,
  current,
}: {
  levels: ThinkingLevel[];
  current: ThinkingLevel | null;
}) {
  const [active, setActive] = useState<ThinkingLevel | null>(current);
  const [updating, setUpdating] = useState(false);

  function handleChange(level: ThinkingLevel) {
    setActive(level);
    setUpdating(true);
    api.config
      .setThinkingLevel(level)
      .then(() => setActive(level))
      .catch(() => setActive(current))
      .finally(() => setUpdating(false));
  }

  const displayLevels = levels.filter((l) => l !== "off");

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-400">
        Thinking Level
        {updating && <Loader2 size={9} className="ml-1 inline animate-spin" />}
      </label>
      <div className="grid grid-cols-5 gap-1">
        {displayLevels.map((level) => (
          <button
            key={level}
            type="button"
            disabled={updating}
            onClick={() => handleChange(level)}
            className={`rounded px-1.5 py-1 text-xs capitalize transition-colors ${
              active === level
                ? "bg-violet-600/30 text-violet-300 ring-1 ring-violet-500/50"
                : "bg-gray-800 text-gray-400 hover:bg-gray-750 hover:text-gray-300"
            } disabled:opacity-50`}
          >
            {level === "xhigh" ? "max" : level}
          </button>
        ))}
      </div>
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

function groupModelsByProvider(models: AgentModelInfo[]): [string, AgentModelInfo[]][] {
  const grouped = new Map<string, AgentModelInfo[]>();
  for (const model of models) {
    const existing = grouped.get(model.provider);
    if (existing) {
      existing.push(model);
    } else {
      grouped.set(model.provider, [model]);
    }
  }
  return Array.from(grouped.entries());
}
