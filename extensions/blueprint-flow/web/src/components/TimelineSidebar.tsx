import {
	Boxes,
	Brain,
	Check,
	CircleDot,
	ClipboardList,
	Code,
	FileText,
	Inbox,
	Loader2,
	MessageSquare,
	Palette,
	Search,
	ShieldCheck,
	Sparkles,
	Workflow,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { STEP_LABELS } from "../constants/steps";
import { useStore } from "../store";

const STEP_ICONS: Record<string, React.ReactNode> = {
	intake: <Inbox size={12} />,
	research: <Search size={12} />,
	interview: <MessageSquare size={12} />,
	spec: <FileText size={12} />,
	ddd: <Boxes size={12} />,
	design: <Palette size={12} />,
	behavior: <Workflow size={12} />,
	implementation_plan: <ClipboardList size={12} />,
	implementation: <Code size={12} />,
	review: <ShieldCheck size={12} />,
	memory_update: <Brain size={12} />,
};

export function TimelineSidebar() {
	const { steps, artifacts, selectedNodeId, selectNode } = useStore();
	const currentFlow = useStore((s) =>
		s.flows.find((f) => f.id === s.selectedFlowId),
	);
	const [celebratingStep, setCelebratingStep] = useState<string | null>(null);
	const prevStepsRef = useRef<typeof steps>([]);
	const celebrateTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const listRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (prevStepsRef.current.length > 0 && steps.length > 0) {
			for (const step of steps) {
				const prev = prevStepsRef.current.find((s) => s.id === step.id);
				if (prev && prev.status !== "done" && step.status === "done") {
					setCelebratingStep(step.name);
					clearTimeout(celebrateTimeoutRef.current);
					celebrateTimeoutRef.current = setTimeout(
						() => setCelebratingStep(null),
						1200,
					);
				}
			}
		}
		prevStepsRef.current = steps;
		return () => clearTimeout(celebrateTimeoutRef.current);
	}, [steps]);

	const doneCount = steps.filter((s) => s.status === "done").length;
	const progressPercent =
		steps.length > 0 ? (doneCount / steps.length) * 100 : 0;

	if (steps.length === 0) return null;

	return (
		<div
			className="flex flex-col flex-1 min-h-0 border-t"
			style={{ borderColor: "var(--border-subtle)" }}
		>
			<div className="px-4 py-3">
				<div className="flex items-center justify-between mb-2">
					<span className="section-label">Flow</span>
					<span className="font-mono text-[10px] text-[var(--text-muted)]">
						{doneCount}/{steps.length}
					</span>
				</div>
				<div className="flow-progress-bar">
					<div
						className="flow-progress-fill"
						style={{ width: `${progressPercent}%` }}
					/>
				</div>
			</div>

			<div
				ref={listRef}
				className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-3"
			>
				<div className="relative">
					{steps.map((step, index) => {
						const isLast = index === steps.length - 1;
						const label = STEP_LABELS[step.name] || step.name;
						const icon = STEP_ICONS[step.name] || <CircleDot size={12} />;
						const isActive =
							step.status === "running" || step.status === "needs_user";
						const isSelected = selectedNodeId === step.id;
						const isCelebrating = celebratingStep === step.name;
						const stepArtifacts = artifacts.filter(
							(a) => a.step_name === step.name,
						);

						const connectorClass =
							step.status === "done"
								? "timeline-connector-done"
								: isActive
									? "timeline-connector-active"
									: "";

						const nodeClass =
							step.status === "done"
								? "timeline-node-done"
								: step.status === "running"
									? "timeline-node-running"
									: step.status === "needs_user"
										? "timeline-node-needs_user"
										: "";

						return (
							<div
								key={step.id}
								className="relative flex gap-3 cursor-pointer"
								role="button"
								tabIndex={0}
								onClick={() => selectNode(step.id)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										selectNode(step.id);
									}
								}}
							>
								<div className="relative flex flex-col items-center">
									{!isLast && (
										<div
											className={`absolute top-[28px] left-1/2 -translate-x-1/2 w-[2px] h-[calc(100%-28px)] ${connectorClass}`}
											style={{
												background: connectorClass
													? undefined
													: "var(--border-subtle)",
											}}
										/>
									)}
									<div
										className={`timeline-node ${nodeClass} ${isSelected ? "timeline-node-focused" : ""} ${isCelebrating ? "animate-celebrate-pop" : ""}`}
										style={{ width: 24, height: 24 }}
									>
										{step.status === "done" ? (
											<Check
												size={10}
												className="text-[var(--accent-success)]"
											/>
										) : step.status === "running" ? (
											<Loader2
												size={10}
												className="text-[var(--accent-primary)] animate-spin"
											/>
										) : (
											<span
												className={
													isActive
														? "text-[var(--amber-400)]"
														: "text-[var(--text-muted)]"
												}
											>
												{icon}
											</span>
										)}
									</div>
									{isCelebrating && (
										<div className="absolute top-0 left-1/2 -translate-x-1/2">
											<div className="w-6 h-6 rounded-full bg-[var(--accent-success)]/30 animate-celebrate-ripple" />
										</div>
									)}
								</div>

								<div className={`flex-1 pb-3 min-w-0 ${isLast ? "pb-0" : ""}`}>
									<div
										className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-all duration-150 ${
											isSelected
												? "bg-[var(--bg-surface)] border border-[var(--border-accent)]"
												: "hover:bg-[var(--bg-surface-hover)] border border-transparent"
										}`}
									>
										<span
											className={`text-xs font-medium truncate ${
												step.status === "done"
													? "text-[var(--accent-success)]/80"
													: isActive
														? "text-[var(--accent-primary)]"
														: "text-[var(--text-secondary)]"
											}`}
										>
											{label}
										</span>
										{stepArtifacts.length > 0 && (
											<span className="ml-auto shrink-0 rounded bg-[var(--bg-surface)] px-1 py-0.5 text-[9px] text-[var(--text-muted)] font-mono">
												{stepArtifacts.length}
											</span>
										)}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
