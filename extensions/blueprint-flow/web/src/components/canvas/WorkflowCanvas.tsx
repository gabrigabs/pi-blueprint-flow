import {
	Background,
	BackgroundVariant,
	Controls,
	MiniMap,
	ReactFlow,
	useEdgesState,
	useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useRef } from "react";
import { useStore } from "../../store";
import { autoLayout, stepsToEdges, stepsToNodes } from "./layout";
import { WorkflowStepNode } from "./WorkflowStepNode";

const nodeTypes = { workflowStep: WorkflowStepNode };

export function WorkflowCanvas() {
	const steps = useStore((s) => s.steps);
	const artifacts = useStore((s) => s.artifacts);

	const [nodes, setNodes, onNodesChange] = useNodesState([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);

	const structureKey = useMemo(
		() => steps.map((s) => s.id).join(","),
		[steps],
	);
	const statusKey = useMemo(
		() => steps.map((s) => `${s.id}:${s.status}`).join(","),
		[steps],
	);
	const prevStructureRef = useRef(structureKey);

	useEffect(() => {
		if (steps.length === 0) return;

		const n = stepsToNodes(steps, artifacts);
		const e = stepsToEdges(steps);

		setEdges(e);

		const structureChanged = prevStructureRef.current !== structureKey;
		prevStructureRef.current = structureKey;

		if (structureChanged || nodes.length === 0) {
			autoLayout(n, e).then(({ nodes: layouted }) => setNodes(layouted));
		} else {
			setNodes((prev) =>
				prev.map((node) => {
					const updated = n.find((nn) => nn.id === node.id);
					if (updated) {
						return { ...node, data: updated.data };
					}
					return node;
				}),
			);
		}
	}, [structureKey, statusKey]);

	if (steps.length === 0) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<p className="text-sm text-[var(--text-muted)]">No steps to display</p>
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
					gap={20}
					size={1}
					color="rgba(255,255,255,0.03)"
				/>
				<Controls
					showZoom
					showFitView
					showInteractive={false}
					position="bottom-right"
					className="!bg-zinc-900 !border-zinc-700 !shadow-lg [&>button]:!bg-zinc-800 [&>button]:!border-zinc-700 [&>button]:!text-zinc-400 [&>button:hover]:!bg-zinc-700"
				/>
				<MiniMap
					position="bottom-left"
					pannable
					zoomable
					className="!bg-zinc-900/80 !border-zinc-700"
					nodeColor={(node) => {
						const status = (node.data as { status?: string })?.status;
						if (status === "done") return "#10b981";
						if (status === "running") return "#06b6d4";
						if (status === "needs_user") return "#f59e0b";
						return "#3f3f46";
					}}
				/>
			</ReactFlow>
		</div>
	);
}
