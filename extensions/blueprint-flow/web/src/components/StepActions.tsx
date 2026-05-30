import { useState } from "react";
import { ChevronRight, ChevronLeft, Play, Ban, CheckCircle } from "lucide-react";
import { useStore } from "../store";
import { api } from "../lib/api";
import { AgentRunSettingsPanel } from "./AgentRunSettingsPanel";
import type { AgentRunSettingsPayload } from "../lib/api";

interface Props {
  featureId: string;
  stepId: string;
  stepName: string;
  stepStatus: string;
  isCurrentStep: boolean;
}

export function StepActions({ featureId, stepId, stepName, stepStatus, isCurrentStep }: Props) {
  const { setSteps, setFeatures, selectedProjectId } = useStore();
  const [showRunPanel, setShowRunPanel] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [settings, setSettings] = useState<AgentRunSettingsPayload>({
    effortLevel: "balanced",
    executionMode: "draft",
  });

  async function handleAdvance() {
    setLoading("advance");
    try {
      const result = await api.features.advance(featureId);
      setSteps(result.steps);
      if (selectedProjectId) {
        const features = await api.features.list(selectedProjectId);
        setFeatures(features);
      }
    } catch {
      // error handling could be added
    } finally {
      setLoading(null);
    }
  }

  async function handleBack() {
    setLoading("back");
    try {
      const result = await api.features.back(featureId);
      setSteps(result.steps);
      if (selectedProjectId) {
        const features = await api.features.list(selectedProjectId);
        setFeatures(features);
      }
    } catch {
      // error handling could be added
    } finally {
      setLoading(null);
    }
  }

  async function handleStatusChange(status: string) {
    setLoading(status);
    try {
      await api.steps.updateStatus(stepId, status);
      const steps = await api.steps.list(featureId);
      setSteps(steps);
    } catch {
      // error handling could be added
    } finally {
      setLoading(null);
    }
  }

  async function handleRunStep() {
    setLoading("run");
    try {
      await api.features.runStep(featureId, settings);
      setShowRunPanel(false);
    } catch {
      // error handling could be added
    } finally {
      setLoading(null);
    }
  }

  if (!isCurrentStep && stepStatus !== "running") return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-1">
        <button
          onClick={handleBack}
          disabled={loading !== null}
          title="Back to previous step"
          className="rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-300 disabled:opacity-30"
        >
          <ChevronLeft size={14} />
        </button>

        <button
          onClick={() => setShowRunPanel(!showRunPanel)}
          disabled={loading !== null}
          title="Run this step"
          className="flex items-center gap-1 rounded bg-blue-600/20 px-2 py-1 text-xs text-blue-300 hover:bg-blue-600/30 disabled:opacity-30"
        >
          <Play size={10} />
          Run
        </button>

        <button
          onClick={handleAdvance}
          disabled={loading !== null}
          title="Advance to next step"
          className="flex items-center gap-1 rounded bg-emerald-600/20 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-600/30 disabled:opacity-30"
        >
          Done
          <ChevronRight size={10} />
        </button>

        <button
          onClick={() => handleStatusChange("blocked")}
          disabled={loading !== null}
          title="Mark as blocked"
          className="rounded p-1 text-gray-500 hover:bg-red-900/30 hover:text-red-400 disabled:opacity-30"
        >
          <Ban size={12} />
        </button>

        <button
          onClick={() => handleStatusChange("done")}
          disabled={loading !== null}
          title="Mark as done"
          className="rounded p-1 text-gray-500 hover:bg-emerald-900/30 hover:text-emerald-400 disabled:opacity-30"
        >
          <CheckCircle size={12} />
        </button>
      </div>

      {showRunPanel && (
        <div className="rounded border border-gray-700 bg-gray-900 p-2">
          <AgentRunSettingsPanel value={settings} onChange={setSettings} compact />
          <button
            onClick={handleRunStep}
            disabled={loading !== null}
            className="mt-2 w-full rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {loading === "run" ? "Running..." : `Run ${stepName}`}
          </button>
        </div>
      )}
    </div>
  );
}
