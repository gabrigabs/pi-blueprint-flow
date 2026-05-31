import {
	ChevronDown,
	ChevronUp,
	Clock,
	Loader2,
	Radio,
	RefreshCw,
	XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { ActionRun } from "../store";
import { useStore } from "../store";
import { ActionStatusBadge } from "./ActionStatusBadge";

interface Props {
	stepName: string;
	flowId: string;
}

interface LiveEvent {
	type: string;
	message: string | null;
	timestamp: number;
}

export function InlineActionRuns({ stepName, flowId }: Props) {
	const { actionRuns, bridgeStatus } = useStore();
	const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
	const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
	const eventsEndRef = useRef<HTMLDivElement>(null);

	const stepRuns = actionRuns.filter(
		(r) => r.step_name === stepName && r.flow_id === flowId,
	);

	useEffect(() => {
		function handleLiveEvent(e: CustomEvent<{ actionRunId: string; type: string; message: string | null }>) {
			const { actionRunId, type, message } = e.detail;
			if (expandedRunId && actionRunId === expandedRunId) {
				setLiveEvents((prev) => [...prev.slice(-50), { type, message, timestamp: Date.now() }]);
			}
		}

		window.addEventListener("blueprint:action-event", handleLiveEvent as EventListener);
		return () => window.removeEventListener("blueprint:action-event", handleLiveEvent as EventListener);
	}, [expandedRunId]);

	useEffect(() => {
		eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [liveEvents]);

	const handleCancel = async (id: string) => {
		try {
			await api.actionRuns.cancel(id);
		} catch {}
	};

	const handleRetry = async (id: string, feedback?: string): Promise<void> => {
		try {
			await api.actionRuns.retry(id, feedback);
		} catch {}
	};

	const toggleExpand = (id: string) => {
		if (expandedRunId === id) {
			setExpandedRunId(null);
			setLiveEvents([]);
		} else {
			setExpandedRunId(id);
			setLiveEvents([]);
			api.actionRuns.getEvents(id).then((events) => {
				setLiveEvents(events.map((e) => ({
					type: e.type,
					message: e.message,
					timestamp: new Date(e.created_at).getTime(),
				})));
			}).catch(() => {});
		}
	};

	if (stepRuns.length === 0) {
		return (
			<div className="flex items-center gap-2 py-3 px-2">
				{bridgeStatus === "not_connected" ? (
					<>
						<Radio size={12} className="text-red-500" />
						<span className="text-xs text-red-400">Pi agent not connected</span>
					</>
				) : (
					<span className="text-xs text-[var(--text-muted)]">No actions run for this step yet</span>
				)}
			</div>
		);
	}

	return (
		<div className="space-y-1.5 py-2">
			{stepRuns.slice(0, 10).map((run) => (
				<RunCard
					key={run.id}
					run={run}
					expanded={expandedRunId === run.id}
					onToggle={() => toggleExpand(run.id)}
					onCancel={() => handleCancel(run.id)}
					onRetry={(feedback) => handleRetry(run.id, feedback)}
					liveEvents={expandedRunId === run.id ? liveEvents : []}
					eventsEndRef={expandedRunId === run.id ? eventsEndRef : undefined}
				/>
			))}
		</div>
	);
}

function RunCard({
	run,
	expanded,
	onToggle,
	onCancel,
	onRetry,
	liveEvents,
	eventsEndRef,
}: {
	run: ActionRun;
	expanded: boolean;
	onToggle: () => void;
	onCancel: () => void;
	onRetry: (feedback?: string) => Promise<void>;
	liveEvents: LiveEvent[];
	eventsEndRef?: React.RefObject<HTMLDivElement | null>;
}) {
	const [retryFeedback, setRetryFeedback] = useState("");
	const [retrying, setRetrying] = useState(false);
	const isActive = ["created", "queued", "waiting_for_pi", "injected", "agent_running", "tool_running"].includes(run.status);
	const isTerminal = ["completed", "failed", "cancelled", "not_connected"].includes(run.status);
	const canRetry = ["completed", "failed", "cancelled"].includes(run.status);

	async function handleRetryClick() {
		setRetrying(true);
		try {
			await onRetry(retryFeedback.trim() || undefined);
			setRetryFeedback("");
		} finally {
			setRetrying(false);
		}
	}

	return (
		<div
			className={`rounded-lg border transition-all duration-200 ${
				isActive
					? "border-[var(--accent-primary)]/20 bg-[var(--cyan-glow)]"
					: isTerminal
						? "border-[var(--border-subtle)] bg-[var(--bg-inset)]"
						: "border-[var(--border-default)] bg-[var(--bg-surface)]"
			}`}
		>
			<div className="flex items-center justify-between px-3 py-2">
				<div className="flex items-center gap-2 min-w-0">
					<ActionStatusBadge status={run.status} />
					<span className="text-xs text-[var(--text-secondary)] truncate">
						{run.action_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
					</span>
				</div>

				<div className="flex items-center gap-1 shrink-0">
					{run.error && (
						<span className="max-w-[100px] truncate text-[10px] text-[var(--rose-400)]/80" title={run.error}>
							{run.error}
						</span>
					)}
					{isActive && (
						<button
							type="button"
							onClick={(e) => { e.stopPropagation(); onCancel(); }}
							className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--rose-400)] hover:bg-[var(--rose-glow)] transition-colors"
							title="Cancel"
						>
							<XCircle size={12} />
						</button>
					)}
					{canRetry && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								void handleRetryClick();
							}}
							className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--cyan-glow)] transition-colors"
							title="Retry"
						>
							{retrying ? (
								<Loader2 size={12} className="animate-spin" />
							) : (
								<RefreshCw size={12} />
							)}
						</button>
					)}
					<button
						type="button"
						onClick={onToggle}
						className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
					>
						{expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
					</button>
				</div>
			</div>

			{isActive && run.started_at && (
				<div className="px-3 pb-1.5">
					<ElapsedTime startedAt={run.started_at} />
				</div>
			)}

			{expanded && (
				<div className="border-t border-[var(--border-subtle)] px-3 py-2 max-h-36 overflow-y-auto">
					{canRetry && (
						<div className="mb-2 flex gap-1.5">
							<input
								type="text"
								value={retryFeedback}
								onChange={(e) => setRetryFeedback(e.target.value)}
								placeholder="Retry feedback..."
								className="min-w-0 flex-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-2 py-1 text-[11px] text-[var(--text-secondary)] outline-none focus:border-[var(--border-strong)]"
							/>
							<button
								type="button"
								onClick={handleRetryClick}
								disabled={retrying}
								className="rounded bg-[var(--cyan-glow)] px-2 py-1 text-[11px] font-medium text-[var(--accent-primary)] disabled:opacity-40"
							>
								Retry
							</button>
						</div>
					)}
					{liveEvents.length === 0 ? (
						<p className="text-[11px] text-[var(--text-muted)] italic">No events yet</p>
					) : (
						<div className="space-y-0.5">
							{liveEvents.map((evt, i) => (
								<EventLine key={i} event={evt} />
							))}
							<div ref={eventsEndRef} />
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function EventLine({ event }: { event: LiveEvent }) {
	const typeColors: Record<string, string> = {
		"pi.agent.start": "text-[var(--accent-primary)]",
		"pi.agent.end": "text-[var(--accent-success)]",
		"pi.tool.start": "text-[var(--cyan-300)]",
		"pi.tool.end": "text-[var(--cyan-500)]",
		"pi.prompt.injected": "text-[var(--amber-400)]",
		"blueprint.error": "text-[var(--rose-400)]",
	};

	const color = typeColors[event.type] ?? "text-[var(--text-muted)]";
	const shortType = event.type.split(".").pop() ?? event.type;

	return (
		<div className="flex items-baseline gap-2 text-[11px] leading-relaxed">
			<span className={`font-mono shrink-0 ${color}`}>{shortType}</span>
			{event.message && (
				<span className="text-[var(--text-tertiary)] truncate">{event.message}</span>
			)}
		</div>
	);
}

function ElapsedTime({ startedAt }: { startedAt: string }) {
	const [elapsed, setElapsed] = useState("");

	useEffect(() => {
		const start = new Date(startedAt).getTime();
		const update = () => {
			const diff = Math.floor((Date.now() - start) / 1000);
			const m = Math.floor(diff / 60);
			const s = diff % 60;
			setElapsed(m > 0 ? `${m}m ${s}s` : `${s}s`);
		};
		update();
		const interval = setInterval(update, 1000);
		return () => clearInterval(interval);
	}, [startedAt]);

	return (
		<div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
			<Clock size={9} />
			<span>{elapsed}</span>
		</div>
	);
}
