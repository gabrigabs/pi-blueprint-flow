import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import type { ActionRun } from "../store";
import { api } from "../lib/api";
import { ActionStatusBadge } from "./ActionStatusBadge";
import { XCircle, Zap, Clock, ChevronDown, ChevronUp, Radio } from "lucide-react";

interface LiveEvent {
  type: string;
  message: string | null;
  timestamp: number;
}

export function ActionRunPanel() {
  const { actionRuns, selectedFeatureId, bridgeStatus, setBridgeStatus, setActionRuns } = useStore();
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.bridge.status().then((res) => setBridgeStatus(res.status)).catch(() => {});
  }, [setBridgeStatus]);

  useEffect(() => {
    if (selectedFeatureId) {
      api.actionRuns
        .list({ featureId: selectedFeatureId, limit: 20 })
        .then(setActionRuns)
        .catch(() => {});
    } else {
      setActionRuns([]);
    }
  }, [selectedFeatureId, setActionRuns]);

  // Listen for live action:event via custom event on window (dispatched from useWebSocket)
  useEffect(() => {
    function handleLiveEvent(e: CustomEvent<{ actionRunId: string; type: string; message: string | null }>) {
      const { actionRunId, type, message } = e.detail;
      if (expandedRunId && actionRunId === expandedRunId) {
        setLiveEvents((prev) => [...prev.slice(-50), { type, message, timestamp: Date.now() }]);
      }
    }

    window.addEventListener("blueprint:action-event", handleLiveEvent as EventListener);
    return () => window.removeEventListener("blueprint:action-event", handleLiveEvent as EventListener);
  }, [expandedRunId]);

  // Auto-scroll events
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveEvents]);

  const featureRuns = actionRuns.filter((r) => r.feature_id === selectedFeatureId);

  const handleCancel = async (id: string) => {
    try {
      await api.actionRuns.cancel(id);
    } catch {
      // handled by WS
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedRunId === id) {
      setExpandedRunId(null);
      setLiveEvents([]);
    } else {
      setExpandedRunId(id);
      setLiveEvents([]);
      // Load historical events
      api.actionRuns.getEvents(id).then((events) => {
        setLiveEvents(events.map((e) => ({
          type: e.type,
          message: e.message,
          timestamp: new Date(e.created_at).getTime(),
        })));
      }).catch(() => {});
    }
  };

  if (featureRuns.length === 0 && bridgeStatus === "not_connected") {
    return (
      <div className="border-b border-white/[0.04] p-4">
        <div className="flex items-center gap-2 rounded-lg bg-red-950/20 border border-red-900/30 px-3 py-2">
          <Radio size={14} className="text-red-500" />
          <span className="text-xs text-red-400">Pi agent not connected</span>
        </div>
      </div>
    );
  }

  if (featureRuns.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-white/[0.04]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <Zap size={13} className="text-fuchsia-400" />
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
            Actions
          </h3>
        </div>
        <BridgeIndicator status={bridgeStatus} />
      </div>

      {/* Runs list */}
      <div className="px-3 pb-3 space-y-1">
        {featureRuns.slice(0, 10).map((run) => (
          <ActionRunCard
            key={run.id}
            run={run}
            expanded={expandedRunId === run.id}
            onToggle={() => toggleExpand(run.id)}
            onCancel={() => handleCancel(run.id)}
            liveEvents={expandedRunId === run.id ? liveEvents : []}
            eventsEndRef={expandedRunId === run.id ? eventsEndRef : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function ActionRunCard({
  run,
  expanded,
  onToggle,
  onCancel,
  liveEvents,
  eventsEndRef,
}: {
  run: ActionRun;
  expanded: boolean;
  onToggle: () => void;
  onCancel: () => void;
  liveEvents: LiveEvent[];
  eventsEndRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const isActive = isCancellable(run.status);
  const isTerminal = ["completed", "failed", "cancelled", "not_connected"].includes(run.status);

  return (
    <div
      className={`
        rounded-lg border transition-all duration-200
        ${isActive
          ? "border-fuchsia-500/20 bg-fuchsia-950/10"
          : isTerminal
            ? "border-white/[0.03] bg-zinc-900/30"
            : "border-white/[0.04] bg-zinc-900/50"
        }
      `}
    >
      {/* Main row */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <ActionStatusBadge status={run.status} />
          <span className="text-sm text-zinc-300 truncate">
            {formatActionType(run.action_type)}
          </span>
          {run.step_name && (
            <span className="text-[11px] text-zinc-600 truncate">
              {run.step_name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {run.error && (
            <span
              className="max-w-[120px] truncate text-[11px] text-red-400/80"
              title={run.error}
            >
              {run.error}
            </span>
          )}
          {isActive && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onCancel(); }}
              className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
              title="Cancel"
            >
              <XCircle size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Elapsed time */}
      {isActive && run.started_at && (
        <div className="px-3 pb-1.5">
          <ElapsedTime startedAt={run.started_at} />
        </div>
      )}

      {/* Expanded events */}
      {expanded && (
        <div className="border-t border-white/[0.04] px-3 py-2 max-h-40 overflow-y-auto">
          {liveEvents.length === 0 ? (
            <p className="text-[11px] text-zinc-600 italic">No events yet</p>
          ) : (
            <div className="space-y-0.5">
              {liveEvents.map((evt, i) => (
                <EventLine key={i} event={evt} />
              ))}
              <div ref={eventsEndRef} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventLine({ event }: { event: LiveEvent }) {
  const typeColors: Record<string, string> = {
    "pi.agent.start": "text-fuchsia-500",
    "pi.agent.end": "text-emerald-500",
    "pi.tool.start": "text-cyan-500",
    "pi.tool.end": "text-cyan-600",
    "pi.tool.update": "text-cyan-700",
    "pi.prompt.injected": "text-violet-500",
    "ui.action.queued": "text-sky-500",
    "blueprint.error": "text-red-500",
  };

  const color = typeColors[event.type] ?? "text-zinc-600";
  const shortType = event.type.split(".").pop() ?? event.type;

  return (
    <div className="flex items-baseline gap-2 text-[11px] leading-relaxed">
      <span className={`font-mono shrink-0 ${color}`}>{shortType}</span>
      {event.message && (
        <span className="text-zinc-500 truncate">{event.message}</span>
      )}
    </div>
  );
}

function ElapsedTime({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const update = () => {
      const diff = Math.floor((Date.now() - start) / 1000);
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setElapsed(m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <div className="flex items-center gap-1 text-[10px] text-zinc-600">
      <Clock size={10} />
      <span>{elapsed}</span>
    </div>
  );
}

function BridgeIndicator({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    idle: { color: "bg-emerald-500", label: "idle" },
    busy: { color: "bg-fuchsia-500 animate-pulse", label: "busy" },
    not_connected: { color: "bg-red-500", label: "offline" },
  };

  const { color, label } = config[status] ?? { color: "bg-zinc-500", label: status };

  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      <span className="text-[10px] text-zinc-600 font-medium">{label}</span>
    </div>
  );
}

function formatActionType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function isCancellable(status: string): boolean {
  return ["created", "queued", "waiting_for_pi", "injected", "agent_running", "tool_running"].includes(status);
}
