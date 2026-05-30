import {
	Background,
	BackgroundVariant,
	Controls,
	MiniMap,
	ReactFlow,
	ReactFlowProvider,
	useEdgesState,
	useNodesState,
	useReactFlow,
	type Edge,
	type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useStore } from "../../store";
import { autoLayout, stepsToEdges, stepsToNodes, type StepNodeData } from "./layout";
import { WorkflowStepNode } from "./WorkflowStepNode";

type StepNode = Node<StepNodeData>;

const nodeTypes = { workflowStep: WorkflowStepNode };

const NODE_WIDTH = 240;
const NODE_HEIGHT = 80;

function WorkflowCanvasInner() {
	const steps = useStore((s) => s.steps);
	const artifacts = useStore((s) => s.artifacts);
	const selectedNodeId = useStore((s) => s.selectedNodeId);
	const selectNode = useStore((s) => s.selectNode);

	const { setCenter, getNode } = useReactFlow();

	const initialNodes: StepNode[] = [];
	const initialEdges: Edge[] = [];
	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

	const structureKey = useMemo(
		() => steps.map((s) => s.id).join(","),
		[steps],
	);
	const statusKey = useMemo(
		() => steps.map((s) => `${s.id}:${s.status}`).join(","),
		[steps],
	);
	const prevStructureRef = useRef(structureKey);
	const hasNodesRef = useRef(false);

	useEffect(() => {
		if (steps.length === 0) return;

		const n = stepsToNodes(steps, artifacts, selectedNodeId);
		const e = stepsToEdges(steps);

		setEdges(e);

		const structureChanged = prevStructureRef.current !== structureKey;
		prevStructureRef.current = structureKey;

		if (structureChanged || !hasNodesRef.current) {
			autoLayout(n, e).then(({ nodes: layouted }) => {
				setNodes(layouted);
				hasNodesRef.current = true;
			});
		} else {
			setNodes((prev: StepNode[]) =>
				prev.map((node) => {
					const updated = n.find((nn) => nn.id === node.id);
					if (updated) {
						return { ...node, data: updated.data };
					}
					return node;
				}),
			);
		}
	}, [structureKey, statusKey, steps, artifacts, setEdges, setNodes]);

	useEffect(() => {
		if (!hasNodesRef.current) return;
		setNodes((prev: StepNode[]) =>
			prev.map((node) => ({
				...node,
				data: { ...node.data, isSelected: node.id === selectedNodeId },
			})),
		);
	}, [selectedNodeId, setNodes]);

	useEffect(() => {
		if (selectedNodeId && hasNodesRef.current) {
			const node = getNode(selectedNodeId);
			if (node) {
				setCenter(
					node.position.x + NODE_WIDTH / 2,
					node.position.y + NODE_HEIGHT / 2,
					{ zoom: 1, duration: 300 },
				);
			}
		}
	}, [selectedNodeId, getNode, setCenter]);

	const onNodeClick = useCallback(
		(_: React.MouseEvent, node: Node) => {
			selectNode(node.id);
		},
		[selectNode],
	);

	const onPaneClick = useCallback(() => {
		selectNode(null);
	}, [selectNode]);

	if (steps.length === 0) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<div className="flex flex-col items-center gap-4 animate-fade-in">
					<div className="skeleton h-[60px] w-[200px] rounded-xl" />
					<div className="skeleton h-[2px] w-[2px] rounded-full" />
					<div className="skeleton h-[60px] w-[200px] rounded-xl" />
					<div className="skeleton h-[2px] w-[2px] rounded-full" />
					<div className="skeleton h-[60px] w-[200px] rounded-xl" />
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 h-full">
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				nodeTypes={nodeTypes}
				onNodeClick={onNodeClick}
				onPaneClick={onPaneClick}
				fitView
				fitViewOptions={{ padding: 0.3 }}
				minZoom={0.3}
				maxZoom={1.5}
				nodesDraggable={false}
				nodesConnectable={false}
				zoomOnScroll={false}
				panOnScroll
				proOptions={{ hideAttribution: true }}
			>
				<Background
					variant={BackgroundVariant.Dots}
					gap={24}
					size={1}
					color="rgba(91, 155, 213, 0.06)"
				/>
				<Controls
					showZoom
					showFitView
					showInteractive={false}
					position="bottom-right"
					className="!bg-[var(--bg-surface)] !border-[var(--border-default)] !shadow-lg [&>button]:!bg-[var(--bg-elevated)] [&>button]:!border-[var(--border-default)] [&>button]:!text-[var(--text-tertiary)] [&>button:hover]:!bg-[var(--bg-surface-hover)]"
				/>
				<MiniMap
					position="bottom-left"
					pannable
					zoomable
					className="!bg-[var(--bg-surface)]/80 !border-[var(--border-default)]"
					nodeColor={(node) => {
						const status = (node.data as { status?: string })?.status;
						if (status === "done") return "var(--accent-success)";
						if (status === "running") return "var(--accent-primary)";
						if (status === "needs_user") return "var(--amber-400)";
						return "var(--text-muted)";
					}}
				/>
			</ReactFlow>
		</div>
	);
}

export function WorkflowCanvas() {
	return (
		<ReactFlowProvider>
			<WorkflowCanvasInner />
		</ReactFlowProvider>
	);
}
