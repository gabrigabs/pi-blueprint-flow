import { useEffect } from "react";
import { useStore } from "../store";
import { api } from "../lib/api";
import { ActionStatusBadge } from "./ActionStatusBadge";
import { XCircle } from "lucide-react";

export function ActionRunPanel() {
  const { actionRuns, selectedFeatureId, bridgeStatus, setBridgeStatus, setActionRuns } = useStore();

  useEffect(() => {
    // Fetch bridge status on mount
    api.bridge.status().then((res) => setBridgeStatus(res.status)).catch(() => {});
  }, [setBridgeStatus]);

  useEffect(() => {
    // Fetch action runs for the selected feature
    if (selectedFeatureId) {
      api.actionRuns
        .list({ featureId: selectedFeatureId, limit: 20 })
        .then(setActionRuns)
        .catch(() => {});
    } else {
      setActionRuns([]);
    }
  }, [selectedFeatureId, setActionRuns]);

  const featureRuns = actionRuns.filter(
    (r) => r.feature_id === selectedFeatureId,
  );

  const handleCancel = async (id: string) => {
    try {
      await api.actionRuns.cancel(id);
    } catch {
      // handled by WS update
    }
  };

  if (featureRuns.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-gray-800 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Action Runs
        </h3>
        <BridgeIndicator status={bridgeStatus} />
      </div>
      <div className="space-y-1.5">
        {featureRuns.slice(0, 10).map((run) => (
          <div
            key={run.id}
            className="flex items-center justify-between rounded bg-gray-900 px-2 py-1.5 text-sm"
          >
            <div className="flex items-center gap-2">
              <ActionStatusBadge status={run.status} />
              <span className="text-gray-300">{formatActionType(run.action_type)}</span>
              {run.step_name && (
                <span className="text-gray-500">({run.step_name})</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {run.error && (
                <span className="max-w-[150px] truncate text-xs text-red-400" title={run.error}>
                  {run.error}
                </span>
              )}
              {isCancellable(run.status) && (
                <button
                  type="button"
                  onClick={() => handleCancel(run.id)}
                  className="text-gray-500 hover:text-red-400"
                  title="Cancel"
                >
                  <XCircle size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BridgeIndicator({ status }: { status: string }) {
  const colors: Record<string, string> = {
    idle: "bg-emerald-500",
    busy: "bg-yellow-500",
    not_connected: "bg-red-500",
  };

  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      <span className={`h-2 w-2 rounded-full ${colors[status] ?? "bg-gray-500"}`} />
      Pi: {status === "not_connected" ? "disconnected" : status}
    </div>
  );
}

function formatActionType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isCancellable(status: string): boolean {
  return ["created", "queued", "waiting_for_pi", "injected", "agent_running", "tool_running"].includes(status);
}
