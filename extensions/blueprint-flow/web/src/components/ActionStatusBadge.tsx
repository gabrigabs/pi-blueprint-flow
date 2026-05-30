const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  created: { label: "Created", color: "bg-gray-600 text-gray-200" },
  queued: { label: "Queued", color: "bg-blue-900 text-blue-300" },
  waiting_for_pi: { label: "Waiting", color: "bg-yellow-900 text-yellow-300" },
  injected: { label: "Injected", color: "bg-indigo-900 text-indigo-300" },
  agent_running: { label: "Running", color: "bg-purple-900 text-purple-300" },
  tool_running: { label: "Tool", color: "bg-cyan-900 text-cyan-300" },
  needs_user: { label: "Needs Input", color: "bg-orange-900 text-orange-300" },
  saving_artifacts: { label: "Saving", color: "bg-teal-900 text-teal-300" },
  completed: { label: "Done", color: "bg-emerald-900 text-emerald-300" },
  failed: { label: "Failed", color: "bg-red-900 text-red-300" },
  cancelled: { label: "Cancelled", color: "bg-gray-700 text-gray-400" },
  not_connected: { label: "No Pi", color: "bg-red-950 text-red-400" },
};

interface ActionStatusBadgeProps {
  status: string;
  className?: string;
}

export function ActionStatusBadge({ status, className = "" }: ActionStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, color: "bg-gray-600 text-gray-200" };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.color} ${className}`}
    >
      {(status === "agent_running" || status === "tool_running") && (
        <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {config.label}
    </span>
  );
}
