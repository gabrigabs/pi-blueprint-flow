import type { Edge, Node } from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import { STEP_LABELS } from "../../constants/steps";
import type { Artifact, Interview, Step } from "../../store";

const elk = new ELK();

export const NODE_WIDTH = 300;
export const NODE_HEIGHT = 90;

export type LayoutDirection = "vertical" | "horizontal";

export interface StepNodeData {
	label: string;
	status: string;
	stepName: string;
	artifactCount: number;
	interviewCount: number;
	isCurrentStep: boolean;
	isSelected: boolean;
	[key: string]: unknown;
}

export function stepsToNodes(
	steps: Step[],
	artifacts: Artifact[],
	interviews?: Interview[],
	selectedNodeId?: string | null,
): Node<StepNodeData>[] {
	const pendingInterviews = interviews?.filter((i) => !i.answer) ?? [];

	return steps.map((step, index) => ({
		id: step.id,
		type: "workflowStep",
		position: { x: 0, y: index * 120 },
		data: {
			label: STEP_LABELS[step.name] || step.name,
			status: step.status,
			stepName: step.name,
			artifactCount: artifacts.filter((a) => a.step_name === step.name).length,
			interviewCount: step.status === "needs_user"
				? pendingInterviews.length
				: 0,
			isCurrentStep: step.status === "running" || step.status === "needs_user",
			isSelected: step.id === selectedNodeId,
		},
	}));
}

export function stepsToEdges(steps: Step[]): Edge[] {
	return steps.slice(0, -1).map((step, i) => ({
		id: `e-${step.id}-${steps[i + 1].id}`,
		source: step.id,
		target: steps[i + 1].id,
		type: "smoothstep",
		animated: step.status === "running",
		style: {
			stroke: step.status === "done" ? "var(--accent-success)" : "var(--border-default)",
			strokeWidth: 2,
		},
	}));
}

export async function autoLayout(
	nodes: Node<StepNodeData>[],
	edges: Edge[],
	direction: LayoutDirection = "vertical",
): Promise<{ nodes: Node<StepNodeData>[] }> {
	const elkDirection = direction === "horizontal" ? "RIGHT" : "DOWN";

	const graph = {
		id: "workflow-root",
		layoutOptions: {
			"elk.algorithm": "layered",
			"elk.direction": elkDirection,
			"elk.spacing.nodeNode": "40",
			"elk.layered.spacing.nodeNodeBetweenLayers": "80",
			"elk.layered.nodePlacement.strategy": "SIMPLE",
			"elk.padding": "[top=32,left=32,bottom=32,right=32]",
		},
		children: nodes.map((n) => ({
			id: n.id,
			width: NODE_WIDTH,
			height: NODE_HEIGHT,
		})),
		edges: edges.map((e) => ({
			id: e.id,
			sources: [e.source],
			targets: [e.target],
		})),
	};

	const layout = await elk.layout(graph);

	return {
		nodes: nodes.map((n) => {
			const child = layout.children?.find((c: { id: string }) => c.id === n.id);
			if (child?.x != null && child?.y != null) {
				return { ...n, position: { x: child.x, y: child.y } };
			}
			return n;
		}),
	};
}
