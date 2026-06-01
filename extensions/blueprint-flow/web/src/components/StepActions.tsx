import {
	Ban,
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	Play,
	Square,
} from "lucide-react";
import { useState } from "react";
import type { AgentRunSettingsPayload } from "../lib/api";
import { api, mapExecutionMode } from "../lib/api";
import { useStore } from "../store";
import { AgentRunSettingsPanel } from "./AgentRunSettingsPanel";
import { addToast } from "./Toasts";

interface Props {
	flowId: string;
	stepId: string;
	stepName: string;
	stepStatus: string;
	isCurrentStep: boolean;
}

export function StepActions({
	flowId,
	stepId,
	stepName,
	stepStatus,
	isCurrentStep,
}: Props) {
	const {
		setSteps,
		setFlows,
		selectedWorkspaceId,
		runModelId,
		runThinkingLevel,
		executionMode,
		actionRuns,
	} = useStore();
	const [showRunPanel, setShowRunPanel] = useState(false);
	const [loading, setLoading] = useState<string | null>(null);
	const [settings, setSettings] = useState<AgentRunSettingsPayload>({
		thinkingLevel: "medium",
		executionMode: "supervised",
	});

	const activeRun = actionRuns.find(
		(r) =>
			r.flow_id === flowId &&
			r.step_name === stepName &&
			!["completed", "failed", "cancelled", "not_connected"].includes(r.status),
	);
	const isRunning = Boolean(activeRun);

	async function handleAdvance() {
		setLoading("advance");
		try {
			const result = await api.flows.advance(flowId);
			setSteps(result.steps);
			if (selectedWorkspaceId) {
				const flows = await api.flows.list(selectedWorkspaceId);
				setFlows(flows);
			}
		} catch {
			// error handling could be added
		} finally {
			setLoading(null);
		}
	}

	async function handleBack() {
		setLoading("back");
		try {
			const result = await api.flows.back(flowId);
			setSteps(result.steps);
			if (selectedWorkspaceId) {
				const flows = await api.flows.list(selectedWorkspaceId);
				setFlows(flows);
			}
		} catch {
			// error handling could be added
		} finally {
			setLoading(null);
		}
	}

	async function handleStatusChange(status: string) {
		setLoading(status);
		try {
			await api.steps.updateStatus(stepId, status);
			const steps = await api.steps.list(flowId);
			setSteps(steps);
		} catch {
			// error handling could be added
		} finally {
			setLoading(null);
		}
	}

	async function handleRunStep() {
		setLoading("run");
		try {
			const mergedSettings: AgentRunSettingsPayload = {
				...settings,
				modelId: runModelId ?? settings.modelId,
				thinkingLevel: runThinkingLevel || settings.thinkingLevel,
				executionMode: mapExecutionMode(
					executionMode || settings.executionMode,
				),
			};
			const result = (await api.flows.runStep(flowId, mergedSettings)) as any;
			setShowRunPanel(false);
			if (result.actionStatus === "not_connected") {
				addToast({
					type: "warning",
					message: "Pi agent not connected. Action cannot execute.",
				});
			} else {
				addToast({
					type: "info",
					message: `Step "${stepName}" enqueued for execution`,
				});
			}
		} catch (err: any) {
			addToast({ type: "error", message: err.message ?? "Failed to run step" });
		} finally {
			setLoading(null);
		}
	}

	if (!isCurrentStep && stepStatus !== "running" && stepStatus !== "current")
		return null;

	return (
		<div className="mt-2 space-y-2">
			<div className="flex items-center gap-1">
				{isRunning ? (
					<button
						onClick={async () => {
							if (!activeRun) return;
							setLoading("stop");
							try {
								await api.actionRuns.cancel(activeRun.id);
							} catch {}
							setLoading(null);
						}}
						disabled={loading !== null}
						title="Stop execution"
						className="flex items-center gap-1 rounded bg-[var(--rose-glow,rgba(231,76,60,0.08))] px-2 py-1 text-xs text-[var(--rose-400)] hover:bg-[var(--rose-400)]/20 disabled:opacity-30"
					>
						<Square size={10} />
						Stop
					</button>
				) : (
					<>
						<button
							onClick={handleBack}
							disabled={loading !== null}
							title="Back to previous step"
							className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-secondary)] disabled:opacity-30"
						>
							<ChevronLeft size={14} />
						</button>

						<button
							onClick={() => setShowRunPanel(!showRunPanel)}
							disabled={loading !== null}
							title="Run this step"
							className="flex items-center gap-1 rounded bg-[var(--cyan-glow)] px-2 py-1 text-xs text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 disabled:opacity-30"
						>
							<Play size={10} />
							Run
						</button>

						<button
							onClick={handleAdvance}
							disabled={loading !== null}
							title="Advance to next step"
							className="flex items-center gap-1 rounded bg-[var(--emerald-glow)] px-2 py-1 text-xs text-[var(--accent-success)] hover:bg-[var(--accent-success)]/20 disabled:opacity-30"
						>
							Done
							<ChevronRight size={10} />
						</button>

						<button
							onClick={() => handleStatusChange("blocked")}
							disabled={loading !== null}
							title="Mark as blocked"
							className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--rose-glow)] hover:text-[var(--rose-400)] disabled:opacity-30"
						>
							<Ban size={12} />
						</button>

						<button
							onClick={() => handleStatusChange("done")}
							disabled={loading !== null}
							title="Mark as done"
							className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--emerald-glow)] hover:text-[var(--accent-success)] disabled:opacity-30"
						>
							<CheckCircle size={12} />
						</button>
					</>
				)}
			</div>

			{showRunPanel && (
				<div className="rounded border border-[var(--border-default)] bg-[var(--bg-inset)] p-2">
					<AgentRunSettingsPanel
						value={settings}
						onChange={setSettings}
						compact
					/>
					<button
						onClick={handleRunStep}
						disabled={loading !== null}
						className="mt-2 w-full rounded bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--cyan-500)] disabled:opacity-50"
					>
						{loading === "run" ? "Running..." : `Run ${stepName}`}
					</button>
				</div>
			)}
		</div>
	);
}
