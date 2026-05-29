import { useStore } from "../store";
import { MessageSquare, CheckCircle, Circle } from "lucide-react";

export function InterviewPanel() {
  const { interviews } = useStore();

  if (interviews.length === 0) {
    return (
      <div className="p-3">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
          Interview
        </h3>
        <p className="text-xs text-gray-500">No interview questions yet</p>
      </div>
    );
  }

  const answered = interviews.filter((i) => i.answer !== null).length;

  return (
    <div className="p-3">
      <h3 className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-gray-400">
        <span className="flex items-center gap-1.5">
          <MessageSquare size={12} /> Interview
        </span>
        <span className="text-gray-500">
          {answered}/{interviews.length} answered
        </span>
      </h3>
      <ul className="space-y-2">
        {interviews.map((interview) => (
          <li
            key={interview.id}
            className="rounded border border-gray-800 bg-gray-900/50 p-2"
          >
            <div className="flex items-start gap-2">
              {interview.answer ? (
                <CheckCircle size={14} className="mt-0.5 shrink-0 text-emerald-400" />
              ) : (
                <Circle size={14} className="mt-0.5 shrink-0 text-gray-500" />
              )}
              <div className="flex-1">
                <p className="text-sm text-gray-200">{interview.question}</p>
                {interview.why && (
                  <p className="mt-0.5 text-xs italic text-gray-500">
                    Why: {interview.why}
                  </p>
                )}
                {interview.answer && (
                  <p className="mt-1 rounded bg-gray-800 px-2 py-1 text-sm text-gray-300">
                    {interview.answer}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-2">
                  <TypeBadge type={interview.type} />
                  {interview.required === 1 && (
                    <span className="text-xs text-red-400">required</span>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    clarification: "text-blue-400 bg-blue-900/30",
    constraint: "text-amber-400 bg-amber-900/30",
    edge_case: "text-purple-400 bg-purple-900/30",
    priority: "text-emerald-400 bg-emerald-900/30",
    acceptance_criteria: "text-cyan-400 bg-cyan-900/30",
    technical: "text-orange-400 bg-orange-900/30",
  };

  const style = colors[type] || "text-gray-400 bg-gray-800";

  return (
    <span className={`rounded px-1.5 py-0.5 text-xs ${style}`}>
      {type}
    </span>
  );
}
