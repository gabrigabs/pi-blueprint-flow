import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { STEP_LABELS } from "../constants/steps";
import { useStore } from "../store";
import { DesignCanvas } from "./design/DesignCanvas";
import { InlineActionRuns } from "./InlineActionRuns";
import { InlineArtifactViewer } from "./InlineArtifactViewer";
import { InlineInterviewSection } from "./InlineInterviewSection";
import { InlineStepTabs, type StepTab } from "./InlineStepTabs";
import { StepActions } from "./StepActions";

function StepStatusPill({ status }: { status: string }) {
	const styles: Record<string, string> = {
		done: "text-[var(--accent-success)] bg-[var(--emerald-glow)]",
		running: "text-[var(--accent-primary)] bg-[var(--cyan-glow)]",
		needs_user: "text-[var(--amber-400)] bg-[var(--amber-glow)]",
		blocked: "text-[var(--rose-400)] bg-[var(--rose-glow)]",
		rejected: "text-[var(--rose-400)] bg-[var(--rose-glow)]",
		pending: "text-[var(--text-muted)] bg-[var(--bg-surface)]",
	};

	return (
		<span
			className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${styles[status] || styles.pending}`}
		>
			{status}
		</span>
	);
}

export function NodeSidebar() {
	const {
		selectedNodeId,
		selectedFlowId,
		selectNode,
		steps,
		artifacts,
		actionRuns,
		interviews,
	} = useStore();
	const currentFlow = useStore((s) =>
		s.flows.find((f) => f.id === s.selectedFlowId),
	);

	const step = steps.find((s) => s.id === selectedNodeId);
	const [activeTab, setActiveTab] = useState<StepTab>("actions");

	useEffect(() => {
		setActiveTab("actions");
	}, [selectedNodeId]);

	if (!step || !selectedFlowId) return null;

	const stepArtifacts = artifacts.filter((a) => a.step_name === step.name);
	const stepRuns = actionRuns.filter(
		(r) => r.step_name === step.name && r.flow_id === selectedFlowId,
	);
	const isCurrentStep = currentFlow?.current_step === step.name;
	const isActive = step.status === "running" || step.status === "needs_user";
	const showInterview = step.name === "interview";
	const showDesign = step.name === "design";
	const interviewCount = showInterview
		? interviews.filter((i) => i.answer === null).length
		: 0;

	return (
		<aside
			className="w-80 shrink-0 flex flex-col overflow-hidden border-l animate-fade-in"
			style={{
				borderColor: "var(--border-subtle)",
				background: "var(--bg-elevated)",
			}}
		>
			{/* Header */}
			<div
				className="flex items-center justify-between px-4 py-3 border-b shrink-0"
				style={{ borderColor: "var(--border-subtle)" }}
			>
				<div className="flex items-center gap-2 min-w-0">
					<h3
						className="text-sm font-medium truncate"
						style={{ color: "var(--text-primary)" }}
					>
						{STEP_LABELS[step.name] || step.name}
					</h3>
					<StepStatusPill status={step.status} />
				</div>
				<button
					onClick={() => selectNode(null)}
					className="rounded p-1 transition-colors hover:bg-[var(--bg-surface-hover)]"
					style={{ color: "var(--text-muted)" }}
					aria-label="Close step details"
				>
					<X size={14} />
				</button>
			</div>

			{/* Tabs */}
			<div className="px-4 pt-3 shrink-0">
				<InlineStepTabs
					activeTab={activeTab}
					onTabChange={setActiveTab}
					actionCount={stepRuns.length}
					artifactCount={stepArtifacts.length}
					interviewCount={interviewCount}
					showInterview={showInterview}
				/>
			</div>

			{/* Tab content */}
			<div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3">
				{activeTab === "actions" && (
					<InlineActionRuns stepName={step.name} flowId={selectedFlowId} />
				)}
				{activeTab === "artifacts" && (
					<InlineArtifactViewer stepName={step.name} flowId={selectedFlowId} />
				)}
				{activeTab === "interview" && showInterview && (
					<InlineInterviewSection flowId={selectedFlowId} />
				)}
			</div>

			{/* Design canvas (if design step) */}
			{showDesign && (
				<div
					className="border-t px-4 py-3 shrink-0 max-h-[280px] overflow-hidden"
					style={{ borderColor: "var(--border-subtle)" }}
				>
					<DesignCanvas flowId={selectedFlowId} />
				</div>
			)}

			{/* Step actions */}
			{(isCurrentStep || isActive) && (
				<div
					className="border-t px-4 py-3 shrink-0"
					style={{ borderColor: "var(--border-subtle)" }}
				>
					<StepActions
						flowId={selectedFlowId}
						stepId={step.id}
						stepName={step.name}
						stepStatus={step.status}
						isCurrentStep={isCurrentStep}
					/>
				</div>
			)}
		</aside>
	);
}
