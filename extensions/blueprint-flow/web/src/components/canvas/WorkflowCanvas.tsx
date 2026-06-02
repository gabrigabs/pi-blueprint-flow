import {
	Background,
	BackgroundVariant,
	Controls,
	type Edge,
	MiniMap,
	type Node,
	ReactFlow,
	ReactFlowProvider,
	useEdgesState,
	useNodesState,
	useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../../store";
import { ArtifactSatelliteNode } from "./ArtifactSatellite";
import { CanvasToolbar } from "./CanvasToolbar";
import { DropZoneEdge } from "./DropZoneEdge";
import { EditModeSaveBar } from "./EditModeSaveBar";
import { FeatureKnowledgePanel } from "./FeatureKnowledgePanel";
import {
	autoLayout,
	editStepsToEdges,
	editStepsToNodes,
	type LayoutDirection,
	NODE_HEIGHT,
	NODE_HEIGHT_EXPANDED,
	NODE_WIDTH,
	type StepNodeData,
	stepsToEdges,
	stepsToNodes,
	stepsToSatelliteEdges,
	stepsToSatelliteNodes,
} from "./layout";
import { StepConfigPanel } from "./StepConfigPanel";
import { StepDetailDrawer } from "./StepDetailDrawer";
import { EditModeNode, WorkflowStepNode } from "./WorkflowStepNode";

type StepNode = Node<StepNodeData>;

const nodeTypes = {
	workflowStep: WorkflowStepNode,
	editModeNode: EditModeNode,
	artifactSatellite: ArtifactSatelliteNode,
};

const edgeTypes = {
	dropZone: DropZoneEdge,
};

function WorkflowCanvasInner() {
	const steps = useStore((s) => s.steps);
	const artifacts = useStore((s) => s.artifacts);
	const interviews = useStore((s) => s.interviews);
	const actionRuns = useStore((s) => s.actionRuns);
	const selectedNodeId = useStore((s) => s.selectedNodeId);
	const selectedFlowId = useStore((s) => s.selectedFlowId);
	const selectNode = useStore((s) => s.selectNode);
	const canvasEditMode = useStore((s) => s.canvasEditMode);
	const editModeSteps = useStore((s) => s.editModeSteps);
	const activeWorkflow = useStore((s) => s.activeWorkflow);

	const [direction, setDirection] = useState<LayoutDirection>("vertical");
	const [showKnowledge, setShowKnowledge] = useState(false);
	const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
	const { setCenter, getNode, fitView } = useReactFlow();

	const positionsKey = selectedFlowId
		? `flow-${selectedFlowId}-positions`
		: null;

	function getSavedPositions(): Record<
		string,
		{ x: number; y: number }
	> | null {
		if (!positionsKey) return null;
		try {
			const raw = localStorage.getItem(positionsKey);
			return raw ? JSON.parse(raw) : null;
		} catch {
			return null;
		}
	}

	function savePositions(nodeList: Node[]) {
		if (!positionsKey) return;
		const positions: Record<string, { x: number; y: number }> = {};
		for (const n of nodeList) {
			if (!n.id.startsWith("sat-")) {
				positions[n.id] = n.position;
			}
		}
		localStorage.setItem(positionsKey, JSON.stringify(positions));
	}

	function clearSavedPositions() {
		if (positionsKey) localStorage.removeItem(positionsKey);
	}

	const initialNodes: StepNode[] = [];
	const initialEdges: Edge[] = [];
	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

	const structureKey = useMemo(() => steps.map((s) => s.id).join(","), [steps]);
	const statusKey = useMemo(
		() => steps.map((s) => `${s.id}:${s.status}`).join(","),
		[steps],
	);
	const prevStructureRef = useRef(structureKey);
	const hasNodesRef = useRef(false);

	useEffect(() => {
		if (canvasEditMode) return;
		if (steps.length === 0) return;

		const n = stepsToNodes(
			steps,
			artifacts,
			interviews,
			actionRuns,
			selectedNodeId,
			activeWorkflow?.steps,
		);
		const e = stepsToEdges(steps);

		const structureChanged = prevStructureRef.current !== structureKey;
		prevStructureRef.current = structureKey;

		if (structureChanged || !hasNodesRef.current) {
			const saved = getSavedPositions();
			autoLayout(n, e, direction, selectedNodeId).then(
				({ nodes: layouted }) => {
					const positioned = saved
						? layouted.map((node) =>
								saved[node.id] ? { ...node, position: saved[node.id] } : node,
							)
						: layouted;
					const sats = stepsToSatelliteNodes(
						steps,
						artifacts,
						interviews,
						actionRuns,
						hoveredNodeId,
						positioned,
					);
					const satEdges = stepsToSatelliteEdges(hoveredNodeId, sats);
					setNodes([...positioned, ...sats] as StepNode[]);
					setEdges([...e, ...satEdges]);
					hasNodesRef.current = true;
				},
			);
		} else {
			setNodes((prev: StepNode[]) => {
				const mainNodes = prev.filter((node) => !node.id.startsWith("sat-"));
				const updated = mainNodes.map((node) => {
					const u = n.find((nn) => nn.id === node.id);
					if (u) return { ...node, data: u.data };
					return node;
				});
				const sats = stepsToSatelliteNodes(
					steps,
					artifacts,
					interviews,
					actionRuns,
					hoveredNodeId,
					updated,
				);
				const satEdges = stepsToSatelliteEdges(hoveredNodeId, sats);
				setEdges([...e, ...satEdges]);
				return [...updated, ...sats] as StepNode[];
			});
		}
	}, [
		structureKey,
		statusKey,
		steps,
		artifacts,
		interviews,
		actionRuns,
		setEdges,
		setNodes,
		direction,
		canvasEditMode,
	]);

	useEffect(() => {
		if (canvasEditMode) return;
		if (steps.length === 0 || !hasNodesRef.current) return;
		const n = stepsToNodes(
			steps,
			artifacts,
			interviews,
			actionRuns,
			selectedNodeId,
			activeWorkflow?.steps,
		);
		const e = stepsToEdges(steps);
		autoLayout(n, e, direction, selectedNodeId).then(({ nodes: layouted }) => {
			const sats = stepsToSatelliteNodes(
				steps,
				artifacts,
				interviews,
				actionRuns,
				hoveredNodeId,
				layouted,
			);
			const satEdges = stepsToSatelliteEdges(hoveredNodeId, sats);
			setNodes([...layouted, ...sats] as StepNode[]);
			setEdges([...e, ...satEdges]);
		});
	}, [direction, canvasEditMode]);

	useEffect(() => {
		if (canvasEditMode) return;
		if (!hasNodesRef.current || steps.length === 0) return;
		const n = stepsToNodes(
			steps,
			artifacts,
			interviews,
			actionRuns,
			selectedNodeId,
			activeWorkflow?.steps,
		);
		const e = stepsToEdges(steps);
		autoLayout(n, e, direction, selectedNodeId).then(({ nodes: layouted }) => {
			const sats = stepsToSatelliteNodes(
				steps,
				artifacts,
				interviews,
				actionRuns,
				hoveredNodeId,
				layouted,
			);
			const satEdges = stepsToSatelliteEdges(hoveredNodeId, sats);
			setNodes([...layouted, ...sats] as StepNode[]);
			setEdges([...e, ...satEdges]);
		});
	}, [selectedNodeId, canvasEditMode]);

	// Update satellites on hover without re-layout
	useEffect(() => {
		if (canvasEditMode) return;
		if (!hasNodesRef.current || steps.length === 0) return;
		setNodes((prev: StepNode[]) => {
			const mainNodes = prev.filter((node) => !node.id.startsWith("sat-"));
			const sats = stepsToSatelliteNodes(
				steps,
				artifacts,
				interviews,
				actionRuns,
				hoveredNodeId,
				mainNodes,
			);
			const satEdges = stepsToSatelliteEdges(hoveredNodeId, sats);
			const e = stepsToEdges(steps);
			setEdges([...e, ...satEdges]);
			return [...mainNodes, ...sats] as StepNode[];
		});
	}, [hoveredNodeId, canvasEditMode]);

	// Edit mode layout
	useEffect(() => {
		if (!canvasEditMode || !editModeSteps) return;
		const n = editStepsToNodes(editModeSteps, selectedNodeId);
		const e = editStepsToEdges(editModeSteps);
		autoLayout(n, e, direction, null).then(({ nodes: layouted }) => {
			setNodes(layouted as unknown as StepNode[]);
			setEdges(e);
		});
	}, [canvasEditMode, editModeSteps, direction]);

	useEffect(() => {
		if (selectedNodeId && hasNodesRef.current) {
			const node = getNode(selectedNodeId);
			if (node) {
				const h = node.data?.isSelected ? NODE_HEIGHT_EXPANDED : NODE_HEIGHT;
				setCenter(node.position.x + NODE_WIDTH / 2, node.position.y + h / 2, {
					zoom: 1,
					duration: 300,
				});
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

	const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
		if (node.id.startsWith("sat-")) return;
		setHoveredNodeId(node.id);
	}, []);

	const onNodeMouseLeave = useCallback(() => {
		setHoveredNodeId(null);
	}, []);

	const reorderEditStep = useStore((s) => s.reorderEditStep);

	const onNodeDragStop = useCallback(
		(_: unknown, node: Node) => {
			if (canvasEditMode && editModeSteps) {
				const sorted = [...nodes]
					.filter((n) => n.id.startsWith("edit-"))
					.sort((a, b) => a.position.y - b.position.y);
				const fromIndex = editModeSteps.findIndex(
					(s, i) => `edit-${i}-${s.name}` === node.id,
				);
				const toIndex = sorted.findIndex((n) => n.id === node.id);
				if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
					reorderEditStep(fromIndex, toIndex);
				}
			} else {
				savePositions(nodes);
			}
		},
		[canvasEditMode, editModeSteps, nodes, reorderEditStep],
	);

	function handleResetLayout() {
		clearSavedPositions();
		const n = stepsToNodes(
			steps,
			artifacts,
			interviews,
			actionRuns,
			selectedNodeId,
			activeWorkflow?.steps,
		);
		const e = stepsToEdges(steps);
		autoLayout(n, e, direction, selectedNodeId).then(({ nodes: layouted }) => {
			const sats = stepsToSatelliteNodes(
				steps,
				artifacts,
				interviews,
				actionRuns,
				hoveredNodeId,
				layouted,
			);
			const satEdges = stepsToSatelliteEdges(hoveredNodeId, sats);
			setNodes([...layouted, ...sats] as StepNode[]);
			setEdges([...e, ...satEdges]);
		});
	}

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
				onResetLayout={handleResetLayout}
				showKnowledge={showKnowledge}
				onToggleKnowledge={() => setShowKnowledge(!showKnowledge)}
			/>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
				onNodeClick={onNodeClick}
				onNodeMouseEnter={canvasEditMode ? undefined : onNodeMouseEnter}
				onNodeMouseLeave={canvasEditMode ? undefined : onNodeMouseLeave}
				onNodeDragStop={onNodeDragStop}
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

			{/* Edit mode save bar */}
			{canvasEditMode && <EditModeSaveBar />}

			{/* Edit mode config panel */}
			{canvasEditMode && selectedNodeId && <StepConfigPanel />}

			{/* Floating detail drawer */}
			{!canvasEditMode && selectedNodeId && <StepDetailDrawer />}

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
