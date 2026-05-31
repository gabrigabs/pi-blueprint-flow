import type { WorkflowStep } from "../store";

export type StepType = "agent" | "manual" | "hybrid";

export interface WorkflowTemplate {
	id: string;
	name: string;
	description: string;
	icon: string;
	color: string;
	steps: WorkflowStep[];
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
	{
		id: "software-feature",
		name: "Software Feature",
		description:
			"Full pipeline from intake to implementation with review gates",
		icon: "code",
		color: "var(--accent-primary)",
		steps: [
			{
				name: "intake",
				label: "Intake",
				actionType: "run_step",
				type: "agent",
			},
			{
				name: "research",
				label: "Research",
				actionType: "research",
				type: "agent",
			},
			{
				name: "spec",
				label: "Specification",
				actionType: "spec",
				type: "agent",
			},
			{
				name: "implement",
				label: "Implement",
				actionType: "implementation",
				type: "agent",
			},
			{ name: "review", label: "Review", actionType: "review", type: "agent" },
		],
	},
	{
		id: "research",
		name: "Research Deep Dive",
		description:
			"Define a question, gather sources, analyze, and synthesize findings",
		icon: "search",
		color: "var(--amber-400)",
		steps: [
			{
				name: "define_question",
				label: "Define Question",
				actionType: "run_step",
				type: "manual",
			},
			{
				name: "gather_sources",
				label: "Gather Sources",
				actionType: "research",
				type: "agent",
			},
			{
				name: "analyze",
				label: "Analyze",
				actionType: "analyze",
				type: "agent",
			},
			{
				name: "synthesize",
				label: "Synthesize",
				actionType: "summarize",
				type: "agent",
			},
			{
				name: "report",
				label: "Report",
				actionType: "generate",
				type: "agent",
			},
		],
	},
	{
		id: "fitness",
		name: "Fitness Plan",
		description:
			"Assess goals, design a program, plan periodization and nutrition",
		icon: "dumbbell",
		color: "#6bcf7f",
		steps: [
			{
				name: "assess_goals",
				label: "Assess Goals",
				actionType: "run_step",
				type: "hybrid",
			},
			{
				name: "design_program",
				label: "Design Program",
				actionType: "generate",
				type: "agent",
			},
			{
				name: "periodization",
				label: "Periodization",
				actionType: "generate",
				type: "agent",
			},
			{
				name: "nutrition",
				label: "Nutrition",
				actionType: "generate",
				type: "hybrid",
			},
			{ name: "review", label: "Review", actionType: "review", type: "manual" },
		],
	},
	{
		id: "financial",
		name: "Financial Review",
		description: "Gather data, analyze spending, set goals, and build a budget",
		icon: "wallet",
		color: "#a78bfa",
		steps: [
			{
				name: "gather_data",
				label: "Gather Data",
				actionType: "run_step",
				type: "manual",
			},
			{
				name: "analyze",
				label: "Analyze",
				actionType: "analyze",
				type: "agent",
			},
			{
				name: "set_goals",
				label: "Set Goals",
				actionType: "run_step",
				type: "hybrid",
			},
			{
				name: "budget",
				label: "Budget",
				actionType: "generate",
				type: "agent",
			},
			{ name: "track", label: "Track", actionType: "run_step", type: "manual" },
		],
	},
	{
		id: "content",
		name: "Content Creation",
		description: "Brainstorm, outline, draft, edit, and prepare for publishing",
		icon: "pen-tool",
		color: "#f472b6",
		steps: [
			{
				name: "brainstorm",
				label: "Brainstorm",
				actionType: "generate",
				type: "hybrid",
			},
			{
				name: "outline",
				label: "Outline",
				actionType: "generate",
				type: "agent",
			},
			{ name: "draft", label: "Draft", actionType: "generate", type: "agent" },
			{ name: "edit", label: "Edit", actionType: "review", type: "hybrid" },
			{
				name: "publish_prep",
				label: "Publish Prep",
				actionType: "run_step",
				type: "manual",
			},
		],
	},
	{
		id: "learning",
		name: "Learning Path",
		description:
			"Define a topic, find resources, create a study plan, and assess progress",
		icon: "graduation-cap",
		color: "#22d3ee",
		steps: [
			{
				name: "define_topic",
				label: "Define Topic",
				actionType: "run_step",
				type: "manual",
			},
			{
				name: "find_resources",
				label: "Find Resources",
				actionType: "research",
				type: "agent",
			},
			{
				name: "study_plan",
				label: "Study Plan",
				actionType: "generate",
				type: "agent",
			},
			{
				name: "practice",
				label: "Practice",
				actionType: "run_step",
				type: "manual",
			},
			{ name: "assess", label: "Assess", actionType: "review", type: "hybrid" },
		],
	},
	{
		id: "quick",
		name: "Quick Task",
		description: "Single-step execution for simple, well-defined tasks",
		icon: "zap",
		color: "var(--accent-success)",
		steps: [
			{
				name: "do_it",
				label: "Execute",
				actionType: "run_step",
				type: "agent",
			},
		],
	},
	{
		id: "blank",
		name: "Start from Scratch",
		description: "Empty canvas — design your own workflow from zero",
		icon: "plus",
		color: "var(--text-tertiary)",
		steps: [],
	},
];

export function getTemplateById(id: string): WorkflowTemplate | undefined {
	return WORKFLOW_TEMPLATES.find((t) => t.id === id);
}
