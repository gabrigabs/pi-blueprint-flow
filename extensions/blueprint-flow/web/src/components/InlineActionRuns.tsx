import { ChevronDown, ChevronUp, Clock, Loader2, Radio, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { ActionRun } from "../store";
import { useStore } from "../store";
import { ActionStatusBadge } from "./ActionStatusBadge";

interface Props {
	stepName: string;
	featureId: string;
}

interface LiveEvent {
	type: string;
	message: string | null;
	timestamp: number;
}

export function InlineActionRuns({ stepName, featureId }: Props) {
	const { actionRuns, bridgeStatus } = useStore();
	const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
	const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
	const eventsEndRef = useRef<HTMLDivElement>(null);

	const stepRuns = actionRuns.filter(
		(r) => r.step_name === stepName && r.feature_id === featureId,
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
	liveEvents,
	eventsEndRef,
}: {
	run: ActionRun;
	expanded: boolean;
	onToggle: () => void;
	onCancel: () => void;
	liveEvents: LiveEvent[];
	eventsEndRef?: React.RefObject<HTMLDivElement | null>;
}) {
	const isActive = ["created", "queued", "waiting_for_pi", "injected", "agent_running", "tool_running"].includes(run.status);
	const isTerminal = ["completed", "failed", "cancelled", "not_connected"].includes(run.status);

	return (
		<div
			className={`rounded-lg border transition-all duration-200 ${
				isActive
					? "border-fuchsia-500/20 bg-fuchsia-950/10"
					: isTerminal
						? "border-white/[0.03] bg-zinc-900/30"
						: "border-white/[0.04] bg-zinc-900/50"
			}`}
		>
			<div className="flex items-center justify-between px-3 py-2">
				<div className="flex items-center gap-2 min-w-0">
					<ActionStatusBadge status={run.status} />
					<span className="text-xs text-zinc-300 truncate">
						{run.action_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
					</span>
				</div>

				<div className="flex items-center gap-1 shrink-0">
					{run.error && (
						<span className="max-w-[100px] truncate text-[10px] text-red-400/80" title={run.error}>
							{run.error}
						</span>
					)}
					{isActive && (
						<button
							type="button"
							onClick={(e) => { e.stopPropagation(); onCancel(); }}
							className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
							title="Cancel"
						>
							<XCircle size={12} />
						</button>
					)}
					<button
						type="button"
						onClick={onToggle}
						className="p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
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
				<div className="border-t border-white/[0.04] px-3 py-2 max-h-36 overflow-y-auto">
					{liveEvents.length === 0 ? (
						<p className="text-[11px] text-zinc-600 italic">No events yet</p>
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
		"pi.agent.start": "text-fuchsia-500",
		"pi.agent.end": "text-emerald-500",
		"pi.tool.start": "text-cyan-500",
		"pi.tool.end": "text-cyan-600",
		"pi.prompt.injected": "text-violet-500",
		"blueprint.error": "text-red-500",
	};

	const color = typeColors[event.type] ?? "text-zinc-600";
	const shortType = event.type.split(".").pop() ?? event.type;

	return (
		<div className="flex items-baseline gap-2 text-[11px] leading-relaxed">
			<span className={`font-mono shrink-0 ${color}`}>{shortType}</span>
			{event.message && (
				<span className="text-zinc-500 truncate">{event.message}</span>
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
		<div className="flex items-center gap-1 text-[10px] text-zinc-600">
			<Clock size={9} />
			<span>{elapsed}</span>
		</div>
	);
}