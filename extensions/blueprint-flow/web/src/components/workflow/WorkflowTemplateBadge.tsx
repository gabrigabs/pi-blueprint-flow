import { Layers } from "lucide-react";
import { WORKFLOW_TEMPLATES } from "../../constants/workflow-templates";
import type { WorkflowStep } from "../../store";

interface Props {
	steps: WorkflowStep[];
	onClick?: () => void;
}

export function WorkflowTemplateBadge({ steps, onClick }: Props) {
	const matchedTemplate = WORKFLOW_TEMPLATES.find(
		(t) =>
			t.steps.length === steps.length &&
			t.steps.every((s, i) => s.name === steps[i]?.name),
	);

	const label = matchedTemplate?.name ?? "Custom";
	const count = steps.length;

	return (
		<button
			type="button"
			onClick={onClick}
			className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors hover:bg-[var(--bg-surface-hover)]"
			style={{
				borderColor: "var(--border-default)",
				color: "var(--text-secondary)",
			}}
		>
			<Layers size={11} style={{ color: "var(--accent-primary)" }} />
			<span>{label}</span>
			<span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
				{count} steps
			</span>
		</button>
	);
}
