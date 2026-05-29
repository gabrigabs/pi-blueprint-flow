import { useStore } from "../store";
import {
  Inbox,
  Search,
  MessageSquare,
  FileText,
  Boxes,
  Workflow,
  ClipboardList,
  Code,
  ShieldCheck,
  Brain,
} from "lucide-react";

const STEP_ICONS: Record<string, React.ReactNode> = {
  intake: <Inbox size={14} />,
  research: <Search size={14} />,
  interview: <MessageSquare size={14} />,
  spec: <FileText size={14} />,
  ddd: <Boxes size={14} />,
  behavior: <Workflow size={14} />,
  implementation_plan: <ClipboardList size={14} />,
  implementation: <Code size={14} />,
  review: <ShieldCheck size={14} />,
  memory_update: <Brain size={14} />,
};

const STEP_LABELS: Record<string, string> = {
  intake: "Intake",
  research: "Research",
  interview: "Interview",
  spec: "Specification",
  ddd: "Domain Modeling",
  behavior: "Behavior Scenarios",
  implementation_plan: "Implementation Plan",
  implementation: "Implementation",
  review: "Review Gate",
  memory_update: "Memory Update",
};

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: "bg-gray-900", text: "text-gray-500", border: "border-gray-700" },
  running: { bg: "bg-blue-950/50", text: "text-blue-300", border: "border-blue-600" },
  needs_user: { bg: "bg-amber-950/50", text: "text-amber-300", border: "border-amber-600" },
  blocked: { bg: "bg-red-950/50", text: "text-red-300", border: "border-red-600" },
  done: { bg: "bg-emerald-950/30", text: "text-emerald-400", border: "border-emerald-700" },
  rejected: { bg: "bg-red-950/30", text: "text-red-400", border: "border-red-700" },
};

export function VerticalKanban() {
  const { steps, artifacts } = useStore();

  if (steps.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-500">
        <p>No flow steps loaded</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
        Development Flow
      </h2>
      {steps.map((step, idx) => {
        const style = STATUS_STYLES[step.status] || STATUS_STYLES.pending;
        const stepArtifacts = artifacts.filter((a) => a.step_name === step.name);
        const isActive = step.status === "running" || step.status === "needs_user";

        return (
          <div
            key={step.id}
            className={`rounded-lg border px-3 py-2 transition-all ${style.bg} ${style.border} ${
              isActive ? "ring-1 ring-blue-500/30" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={style.text}>{STEP_ICONS[step.name]}</span>
                <span className={`text-sm font-medium ${style.text}`}>
                  {STEP_LABELS[step.name] || step.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {stepArtifacts.length > 0 && (
                  <span className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-400">
                    {stepArtifacts.length} artifact{stepArtifacts.length > 1 ? "s" : ""}
                  </span>
                )}
                <StepStatusBadge status={step.status} />
              </div>
            </div>
            {step.started_at && (
              <p className="mt-1 text-xs text-gray-600">
                Started: {new Date(step.started_at).toLocaleString()}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepStatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: "pending",
    running: "running",
    needs_user: "needs input",
    blocked: "blocked",
    done: "done",
    rejected: "rejected",
  };

  const style = STATUS_STYLES[status] || STATUS_STYLES.pending;

  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${style.text} ${style.bg}`}>
      {labels[status] || status}
    </span>
  );
}
