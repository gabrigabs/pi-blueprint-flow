import type { WorkflowStep } from "../store";

export interface WorkflowTemplate {
	id: string;
	name: string;
	description: string;
	steps: WorkflowStep[];
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
	{
		id: "full-ddd",
		name: "Full DDD Flow",
		description: "Complete domain-driven pipeline with research, interviews, and review gates",
		steps: [
			{ name: "intake", label: "Intake", actionType: "run_step" },
			{ name: "research", label: "Research", actionType: "research" },
			{ name: "interview", label: "Interview", actionType: "interview" },
			{ name: "spec", label: "Specification", actionType: "spec" },
			{ name: "ddd", label: "Domain Modeling", actionType: "ddd" },
			{ name: "design", label: "Design", actionType: "run_step" },
			{ name: "behavior", label: "Behavior Scenarios", actionType: "behavior" },
			{ name: "implementation_plan", label: "Implementation Plan", actionType: "implementation_plan" },
			{ name: "implementation", label: "Implementation", actionType: "implementation" },
			{ name: "review", label: "Review Gate", actionType: "review" },
			{ name: "memory_update", label: "Memory Update", actionType: "memory_update" },
		],
	},
	{
		id: "quick-feature",
		name: "Quick Feature",
		description: "Streamlined flow for well-understood features",
		steps: [
			{ name: "intake", label: "Intake", actionType: "run_step" },
			{ name: "spec", label: "Specification", actionType: "spec" },
			{ name: "implementation_plan", label: "Implementation Plan", actionType: "implementation_plan" },
			{ name: "implementation", label: "Implementation", actionType: "implementation" },
			{ name: "review", label: "Review Gate", actionType: "review" },
		],
	},
	{
		id: "bug-fix",
		name: "Bug Fix",
		description: "Focused flow for investigating and fixing bugs",
		steps: [
			{ name: "intake", label: "Intake", actionType: "run_step" },
			{ name: "research", label: "Research", actionType: "research" },
			{ name: "implementation", label: "Implementation", actionType: "implementation" },
			{ name: "review", label: "Review Gate", actionType: "review" },
		],
	},
	{
		id: "research-only",
		name: "Research Only",
		description: "Explore and document without implementation",
		steps: [
			{ name: "intake", label: "Intake", actionType: "run_step" },
			{ name: "research", label: "Research", actionType: "research" },
			{ name: "memory_update", label: "Memory Update", actionType: "memory_update" },
		],
	},
];

export function getTemplateById(id: string): WorkflowTemplate | undefined {
	return WORKFLOW_TEMPLATES.find((t) => t.id === id);
}
