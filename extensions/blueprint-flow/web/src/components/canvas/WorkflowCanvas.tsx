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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../../store";
import { ArtifactSatelliteNode } from "./ArtifactSatellite";
import { CanvasToolbar } from "./CanvasToolbar";
import { FeatureKnowledgePanel } from "./FeatureKnowledgePanel";
import { autoLayout, NODE_HEIGHT, NODE_HEIGHT_EXPANDED, NODE_WIDTH, stepsToEdges, stepsToNodes, stepsToSatelliteEdges, stepsToSatelliteNodes, type LayoutDirection, type StepNodeData } from "./layout";
import { StepDetailDrawer } from "./StepDetailDrawer";
import { WorkflowStepNode } from "./WorkflowStepNode";

type StepNode = Node<StepNodeData>;

const nodeTypes = { workflowStep: WorkflowStepNode, artifactSatellite: ArtifactSatelliteNode };

function WorkflowCanvasInner() {
	const steps = useStore((s) => s.steps);
	const artifacts = useStore((s) => s.artifacts);
	const interviews = useStore((s) => s.interviews);
	const actionRuns = useStore((s) => s.actionRuns);
	const selectedNodeId = useStore((s) => s.selectedNodeId);
	const selectNode = useStore((s) => s.selectNode);

	const [direction, setDirection] = useState<LayoutDirection>("vertical");
	const [showKnowledge, setShowKnowledge] = useState(false);
	const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
	const { setCenter, getNode, fitView } = useReactFlow();

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

		const n = stepsToNodes(steps, artifacts, interviews, actionRuns, selectedNodeId);
		const e = stepsToEdges(steps);

		const structureChanged = prevStructureRef.current !== structureKey;
		prevStructureRef.current = structureKey;

		if (structureChanged || !hasNodesRef.current) {
			autoLayout(n, e, direction, selectedNodeId).then(({ nodes: layouted }) => {
				const sats = stepsToSatelliteNodes(steps, artifacts, interviews, actionRuns, hoveredNodeId, layouted);
				const satEdges = stepsToSatelliteEdges(hoveredNodeId, sats);
				setNodes([...layouted, ...sats] as StepNode[]);
				setEdges([...e, ...satEdges]);
				hasNodesRef.current = true;
			});
		} else {
			setNodes((prev: StepNode[]) => {
				const mainNodes = prev.filter((node) => !node.id.startsWith("sat-"));
				const updated = mainNodes.map((node) => {
					const u = n.find((nn) => nn.id === node.id);
					if (u) return { ...node, data: u.data };
					return node;
				});
				const sats = stepsToSatelliteNodes(steps, artifacts, interviews, actionRuns, hoveredNodeId, updated);
				const satEdges = stepsToSatelliteEdges(hoveredNodeId, sats);
				setEdges([...e, ...satEdges]);
				return [...updated, ...sats] as StepNode[];
			});
		}
	}, [structureKey, statusKey, steps, artifacts, interviews, actionRuns, setEdges, setNodes, direction]);

	useEffect(() => {
		if (steps.length === 0 || !hasNodesRef.current) return;
		const n = stepsToNodes(steps, artifacts, interviews, actionRuns, selectedNodeId);
		const e = stepsToEdges(steps);
		autoLayout(n, e, direction, selectedNodeId).then(({ nodes: layouted }) => {
			const sats = stepsToSatelliteNodes(steps, artifacts, interviews, actionRuns, hoveredNodeId, layouted);
			const satEdges = stepsToSatelliteEdges(hoveredNodeId, sats);
			setNodes([...layouted, ...sats] as StepNode[]);
			setEdges([...e, ...satEdges]);
		});
	}, [direction]);

	useEffect(() => {
		if (!hasNodesRef.current || steps.length === 0) return;
		const n = stepsToNodes(steps, artifacts, interviews, actionRuns, selectedNodeId);
		const e = stepsToEdges(steps);
		autoLayout(n, e, direction, selectedNodeId).then(({ nodes: layouted }) => {
			const sats = stepsToSatelliteNodes(steps, artifacts, interviews, actionRuns, hoveredNodeId, layouted);
			const satEdges = stepsToSatelliteEdges(hoveredNodeId, sats);
			setNodes([...layouted, ...sats] as StepNode[]);
			setEdges([...e, ...satEdges]);
		});
	}, [selectedNodeId]);

	// Update satellites on hover without re-layout
	useEffect(() => {
		if (!hasNodesRef.current || steps.length === 0) return;
		setNodes((prev: StepNode[]) => {
			const mainNodes = prev.filter((node) => !node.id.startsWith("sat-"));
			const sats = stepsToSatelliteNodes(steps, artifacts, interviews, actionRuns, hoveredNodeId, mainNodes);
			const satEdges = stepsToSatelliteEdges(hoveredNodeId, sats);
			const e = stepsToEdges(steps);
			setEdges([...e, ...satEdges]);
			return [...mainNodes, ...sats] as StepNode[];
		});
	}, [hoveredNodeId]);

	useEffect(() => {
		if (selectedNodeId && hasNodesRef.current) {
			const node = getNode(selectedNodeId);
			if (node) {
				const h = node.data?.isSelected ? NODE_HEIGHT_EXPANDED : NODE_HEIGHT;
				setCenter(
					node.position.x + NODE_WIDTH / 2,
					node.position.y + h / 2,
					{ zoom: 1, duration: 300 },
				);
			}
		}
	}, [selectedNodeId, getNode, setCenter]);

	const onNodeClick = useCallback(
		(_: React.MouseEvent, node: Node) => {
			if (node.id.startsWith("sat-")) return;
			selectNode(node.id);
		},
		[selectNode],
	);

	const onPaneClick = useCallback(() => {
		selectNode(null);
	}, [selectNode]);

	const onNodeMouseEnter = useCallback(
		(_: React.MouseEvent, node: Node) => {
			if (node.id.startsWith("sat-")) return;
			setHoveredNodeId(node.id);
		},
		[],
	);

	const onNodeMouseLeave = useCallback(() => {
		setHoveredNodeId(null);
	}, []);

	function handleFitView() {
		fitView({ padding: 0.6, duration: 500 });
	}

	if (steps.length === 0) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<div className="flex flex-col items-center gap-4 animate-fade-in">
					<div className="skeleton h-[70px] w-[280px] rounded-xl" />
					<div className="skeleton h-[2px] w-[2px] rounded-full" />
					<div className="skeleton h-[70px] w-[280px] rounded-xl" />
					<div className="skeleton h-[2px] w-[2px] rounded-full" />
					<div className="skeleton h-[70px] w-[280px] rounded-xl" />
				</div>
			</div>
		);
	}

	return (
		<div className="relative flex-1 h-full">
			{/* Atmospheric background layers */}
			<div className="canvas-atmosphere" />

			<CanvasToolbar
				direction={direction}
				onDirectionChange={setDirection}
				onFitView={handleFitView}
				showKnowledge={showKnowledge}
				onToggleKnowledge={() => setShowKnowledge(!showKnowledge)}
			/>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				nodeTypes={nodeTypes}
				onNodeClick={onNodeClick}
				onNodeMouseEnter={onNodeMouseEnter}
				onNodeMouseLeave={onNodeMouseLeave}
				onPaneClick={onPaneClick}
				fitView
				fitViewOptions={{ padding: 0.6 }}
				minZoom={0.1}
				maxZoom={2}
				defaultViewport={{ x: 0, y: 0, zoom: 1 }}
				nodesDraggable
				nodesConnectable={false}
				zoomOnScroll
				panOnScroll
				proOptions={{ hideAttribution: true }}
			>
				<Background
					variant={BackgroundVariant.Dots}
					gap={32}
					size={0.8}
					color="rgba(91, 155, 213, 0.04)"
				/>
				<Controls
					showZoom={false}
					showFitView={false}
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

			{/* Floating detail drawer */}
			{selectedNodeId && <StepDetailDrawer />}

			{/* Knowledge panel */}
			<FeatureKnowledgePanel
				visible={showKnowledge}
				onClose={() => setShowKnowledge(false)}
			/>
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
