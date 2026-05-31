import type { Edge, Node } from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import { STEP_LABELS } from "../../constants/steps";
import type { ActionRun, Artifact, Interview, Step } from "../../store";

const elk = new ELK();

export const NODE_WIDTH = 340;
export const NODE_HEIGHT = 90;
export const NODE_HEIGHT_EXPANDED = 200;
export const SATELLITE_WIDTH = 180;
export const SATELLITE_HEIGHT = 50;
export const SATELLITE_GAP = 12;
export const SATELLITE_OFFSET_X = 60;

export type LayoutDirection = "vertical" | "horizontal";

export interface StepNodeData {
	label: string;
	status: string;
	stepName: string;
	artifactCount: number;
	artifacts: { id: string; filename: string; type: string }[];
	interviewCount: number;
	activityCount: number;
	isCurrentStep: boolean;
	isSelected: boolean;
	[key: string]: unknown;
}

export function stepsToNodes(
	steps: Step[],
	artifacts: Artifact[],
	interviews?: Interview[],
	actionRuns?: ActionRun[],
	selectedNodeId?: string | null,
): Node<StepNodeData>[] {
	return steps.map((step, index) => {
		const stepArtifacts = artifacts.filter((a) => a.step_name === step.name);
		const stepActivities =
			actionRuns?.filter((r) => r.step_name === step.name) ?? [];
		const stepInterviews =
			step.name === "interview"
				? (interviews?.filter((i) => !i.answer) ?? [])
				: [];
		const isSelected = step.id === selectedNodeId;

		return {
			id: step.id,
			type: "workflowStep",
			position: { x: 0, y: index * 120 },
			data: {
				label: STEP_LABELS[step.name] || step.name,
				status: step.status,
				stepName: step.name,
				artifactCount: stepArtifacts.length,
				artifacts: stepArtifacts.map((a) => ({
					id: a.id,
					filename: a.filename,
					type: a.type,
				})),
				interviewCount: stepInterviews.length,
				activityCount: stepActivities.length,
				isCurrentStep:
					step.status === "current" ||
					step.status === "running" ||
					step.status === "needs_user",
				isSelected,
			},
		};
	});
}

export function stepsToEdges(steps: Step[]): Edge[] {
	return steps.slice(0, -1).map((step, i) => ({
		id: `e-${step.id}-${steps[i + 1].id}`,
		source: step.id,
		target: steps[i + 1].id,
		type: "smoothstep",
		animated: step.status === "running",
		style: {
			stroke:
				step.status === "done"
					? "rgba(107, 207, 127, 0.4)"
					: step.status === "running"
						? "rgba(91, 155, 213, 0.6)"
						: step.status === "current"
							? "rgba(91, 155, 213, 0.35)"
							: "rgba(255, 255, 255, 0.06)",
			strokeWidth:
				step.status === "done" || step.status === "running"
					? 3
					: step.status === "current"
						? 2
						: 1.5,
		},
	}));
}

export async function autoLayout(
	nodes: Node<StepNodeData>[],
	edges: Edge[],
	direction: LayoutDirection = "vertical",
	selectedNodeId?: string | null,
): Promise<{ nodes: Node<StepNodeData>[] }> {
	const elkDirection = direction === "horizontal" ? "RIGHT" : "DOWN";

	const graph = {
		id: "workflow-root",
		layoutOptions: {
			"elk.algorithm": "layered",
			"elk.direction": elkDirection,
			"elk.spacing.nodeNode": "80",
			"elk.layered.spacing.nodeNodeBetweenLayers": "160",
			"elk.layered.nodePlacement.strategy": "SIMPLE",
			"elk.layered.compaction.postCompaction.strategy": "EDGE_LENGTH",
			"elk.padding": "[top=60,left=60,bottom=60,right=60]",
		},
		children: nodes.map((n) => ({
			id: n.id,
			width: NODE_WIDTH,
			height: n.id === selectedNodeId ? NODE_HEIGHT_EXPANDED : NODE_HEIGHT,
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

export interface SatelliteNodeData {
	artifactId: string;
	filename: string;
	type: string;
	stepColor: string;
	isInterview?: boolean;
	interviewCount?: number;
	isActivity?: boolean;
	activityStatus?: string;
	[key: string]: unknown;
}

const STEP_COLORS_MAP: Record<string, string> = {
	intake: "#a78bfa",
	research: "#7ec8e3",
	interview: "#fcd34d",
	spec: "#5b9bd5",
	ddd: "#c084fc",
	design: "#f472b6",
	behavior: "#6bcf7f",
	implementation_plan: "#e67e22",
	implementation: "#22d3ee",
	review: "#6bcf7f",
	memory_update: "#a78bfa",
};

export function stepsToSatelliteNodes(
	steps: Step[],
	artifacts: Artifact[],
	interviews: Interview[] | undefined,
	actionRuns: ActionRun[] | undefined,
	hoveredNodeId: string | null,
	parentNodes: Node<StepNodeData>[],
): Node<SatelliteNodeData>[] {
	if (!hoveredNodeId) return [];

	const step = steps.find((s) => s.id === hoveredNodeId);
	if (!step) return [];

	const parentNode = parentNodes.find((n) => n.id === hoveredNodeId);
	if (!parentNode) return [];

	const stepColor = STEP_COLORS_MAP[step.name] ?? "#5b9bd5";
	const stepArtifacts = artifacts.filter((a) => a.step_name === step.name);
	const stepActivities =
		actionRuns?.filter((r) => r.step_name === step.name) ?? [];
	const stepInterviews =
		interviews?.filter((i) => i.feature_id === step.feature_id) ?? [];
	const pendingInterviews = stepInterviews.filter((i) => !i.answer);
	const answeredInterviews = stepInterviews.filter(
		(i) => i.answer && !i.answer.startsWith("[SKIPPED]"),
	);

	const satellites: Node<SatelliteNodeData>[] = [];
	const baseX = parentNode.position.x + NODE_WIDTH + SATELLITE_OFFSET_X;
	const baseY = parentNode.position.y;
	let idx = 0;

	stepArtifacts.forEach((artifact) => {
		satellites.push({
			id: `sat-${artifact.id}`,
			type: "artifactSatellite",
			position: {
				x: baseX,
				y: baseY + idx * (SATELLITE_HEIGHT + SATELLITE_GAP),
			},
			data: {
				artifactId: artifact.id,
				filename: artifact.filename,
				type: artifact.type,
				stepColor,
			},
		});
		idx++;
	});

	stepActivities.slice(0, 3).forEach((run) => {
		satellites.push({
			id: `sat-activity-${run.id}`,
			type: "artifactSatellite",
			position: {
				x: baseX,
				y: baseY + idx * (SATELLITE_HEIGHT + SATELLITE_GAP),
			},
			data: {
				artifactId: run.id,
				filename: run.action_type ?? "Action",
				type: "activity",
				stepColor,
				isActivity: true,
				activityStatus: run.status,
			},
		});
		idx++;
	});

	if (step.name === "interview" && stepInterviews.length > 0) {
		if (pendingInterviews.length > 0) {
			satellites.push({
				id: `sat-interview-pending-${step.id}`,
				type: "artifactSatellite",
				position: {
					x: baseX,
					y: baseY + idx * (SATELLITE_HEIGHT + SATELLITE_GAP),
				},
				data: {
					artifactId: "",
					filename: `Pending (${pendingInterviews.length})`,
					type: "interview",
					stepColor,
					isInterview: true,
					interviewCount: pendingInterviews.length,
				},
			});
			idx++;
		}
		if (answeredInterviews.length > 0) {
			satellites.push({
				id: `sat-interview-done-${step.id}`,
				type: "artifactSatellite",
				position: {
					x: baseX,
					y: baseY + idx * (SATELLITE_HEIGHT + SATELLITE_GAP),
				},
				data: {
					artifactId: "",
					filename: `Answered (${answeredInterviews.length})`,
					type: "interview",
					stepColor,
					isInterview: true,
					interviewCount: answeredInterviews.length,
				},
			});
		}
	}

	return satellites;
}

export function stepsToSatelliteEdges(
	hoveredNodeId: string | null,
	satelliteNodes: Node<SatelliteNodeData>[],
): Edge[] {
	if (!hoveredNodeId || satelliteNodes.length === 0) return [];

	const color = satelliteNodes[0]?.data?.stepColor ?? "#5b9bd5";

	return satelliteNodes.map((sat) => ({
		id: `se-${hoveredNodeId}-${sat.id}`,
		source: hoveredNodeId,
		target: sat.id,
		type: "smoothstep",
		animated: false,
		style: {
			stroke: `${color}40`,
			strokeWidth: 1.5,
			strokeDasharray: "4 4",
		},
	}));
}
