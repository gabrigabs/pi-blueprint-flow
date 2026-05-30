import type { Edge, Node } from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import { STEP_LABELS } from "../../constants/steps";
import type { Artifact, Step } from "../../store";

const elk = new ELK();

const NODE_WIDTH = 240;
const NODE_HEIGHT = 80;

export interface StepNodeData {
	label: string;
	status: string;
	stepName: string;
	artifactCount: number;
	isCurrentStep: boolean;
	[key: string]: unknown;
}

export function stepsToNodes(steps: Step[], artifacts: Artifact[]): Node<StepNodeData>[] {
	return steps.map((step, index) => ({
		id: step.id,
		type: "workflowStep",
		position: { x: 0, y: index * 120 },
		data: {
			label: STEP_LABELS[step.name] || step.name,
			status: step.status,
			stepName: step.name,
			artifactCount: artifacts.filter((a) => a.step_name === step.name).length,
			isCurrentStep: step.status === "running" || step.status === "needs_user",
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
			stroke: step.status === "done" ? "#10b981" : "#374151",
			strokeWidth: 2,
		},
	}));
}

export async function autoLayout(
	nodes: Node<StepNodeData>[],
	edges: Edge[],
): Promise<{ nodes: Node<StepNodeData>[] }> {
	const graph = {
		id: "workflow-root",
		layoutOptions: {
			"elk.algorithm": "layered",
			"elk.direction": "DOWN",
			"elk.spacing.nodeNode": "32",
			"elk.layered.spacing.nodeNodeBetweenLayers": "48",
			"elk.layered.nodePlacement.strategy": "SIMPLE",
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
