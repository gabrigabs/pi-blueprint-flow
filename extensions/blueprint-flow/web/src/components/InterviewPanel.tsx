import {
	CheckCircle,
	Circle,
	HelpCircle,
	MessageSquare,
	Send,
	SkipForward,
} from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import type { Interview } from "../store";
import { useStore } from "../store";
import { addToast } from "./Toasts";

export function InterviewPanel() {
	const { interviews, setInterviews, selectedFlowId } = useStore();

	if (interviews.length === 0) {
		return (
			<div className="p-3">
				<h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
					Interview
				</h3>
				<p className="text-xs text-gray-500">No interview questions yet</p>
			</div>
		);
	}

	const pending = interviews.filter((i) => i.answer === null);
	const answered = interviews.filter((i) => i.answer !== null);

	async function refreshInterviews() {
		if (!selectedFlowId) return;
		try {
			const data = await api.interviews.list(selectedFlowId);
			setInterviews(data);
		} catch {}
	}

	return (
		<div className="p-3">
			<h3 className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-gray-400">
				<span className="flex items-center gap-1.5">
					<MessageSquare size={12} /> Interview
				</span>
				<span className="text-gray-500">
					{answered.length}/{interviews.length} answered
				</span>
			</h3>

			{/* Pending questions — answerable */}
			{pending.length > 0 && (
				<div className="space-y-2 mb-3">
					{pending.map((interview) => (
						<PendingQuestion
							key={interview.id}
							interview={interview}
							onAnswered={refreshInterviews}
						/>
					))}
				</div>
			)}

			{/* Answered questions — collapsed */}
			{answered.length > 0 && (
				<div className="space-y-1">
					<p className="text-[11px] text-gray-600 uppercase tracking-wider mb-1">
						Answered
					</p>
					{answered.map((interview) => (
						<AnsweredQuestion key={interview.id} interview={interview} />
					))}
				</div>
			)}
		</div>
	);
}

function PendingQuestion({
	interview,
	onAnswered,
}: {
	interview: Interview;
	onAnswered: () => void;
}) {
	const [answer, setAnswer] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSubmit() {
		if (!answer.trim()) return;
		setLoading(true);
		try {
			await api.interviews.answer(interview.id, answer.trim());
			setAnswer("");
			onAnswered();
			addToast({ type: "success", message: "Answer submitted" });
		} catch (err: any) {
			addToast({ type: "error", message: err.message ?? "Failed to submit" });
		} finally {
			setLoading(false);
		}
	}

	async function handleSkip() {
		if (interview.required) return;
		setLoading(true);
		try {
			await api.interviews.skip(interview.id);
			onAnswered();
		} catch (err: any) {
			addToast({ type: "error", message: err.message ?? "Failed to skip" });
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-3">
			{/* Question */}
			<div className="flex items-start gap-2 mb-2">
				<HelpCircle size={14} className="mt-0.5 shrink-0 text-amber-400" />
				<div className="flex-1">
					<p className="text-sm text-gray-200">{interview.question}</p>
					{interview.why && (
						<p className="mt-0.5 text-xs italic text-gray-500">
							Why: {interview.why}
						</p>
					)}
					<div className="mt-1 flex items-center gap-2">
						<TypeBadge type={interview.type} />
						{interview.required === 1 && (
							<span className="text-[11px] text-red-400 font-medium">
								required
							</span>
						)}
					</div>
				</div>
			</div>

			{/* Answer input */}
			<div className="flex gap-2">
				<textarea
					value={answer}
					onChange={(e) => setAnswer(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							handleSubmit();
						}
					}}
					placeholder="Type your answer..."
					rows={2}
					className="flex-1 rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-amber-600 focus:outline-none resize-none"
					disabled={loading}
				/>
				<div className="flex flex-col gap-1">
					<button
						onClick={handleSubmit}
						disabled={loading || !answer.trim()}
						title="Submit answer"
						className="rounded bg-amber-600/20 p-2 text-amber-300 hover:bg-amber-600/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
					>
						<Send size={14} />
					</button>
					{!interview.required && (
						<button
							onClick={handleSkip}
							disabled={loading}
							title="Skip question"
							className="rounded bg-gray-800 p-2 text-gray-500 hover:bg-gray-700 hover:text-gray-300 disabled:opacity-30 transition-colors"
						>
							<SkipForward size={14} />
						</button>
					)}
				</div>
			</div>
		</div>
	);
}

function AnsweredQuestion({ interview }: { interview: Interview }) {
	const isSkipped = interview.answer?.startsWith("[SKIPPED]");

	return (
		<div className="rounded border border-gray-800 bg-gray-900/50 p-2">
			<div className="flex items-start gap-2">
				{isSkipped ? (
					<SkipForward size={14} className="mt-0.5 shrink-0 text-gray-500" />
				) : (
					<CheckCircle size={14} className="mt-0.5 shrink-0 text-emerald-400" />
				)}
				<div className="flex-1 min-w-0">
					<p className="text-sm text-gray-300 truncate">{interview.question}</p>
					{interview.answer && !isSkipped && (
						<p className="mt-0.5 rounded bg-gray-800 px-2 py-1 text-xs text-gray-400 truncate">
							{interview.answer}
						</p>
					)}
					{isSkipped && (
						<p className="mt-0.5 text-xs text-gray-600 italic">Skipped</p>
					)}
				</div>
				<TypeBadge type={interview.type} />
			</div>
		</div>
	);
}

function TypeBadge({ type }: { type: string }) {
	const colors: Record<string, string> = {
		clarification: "text-blue-400 bg-blue-900/30",
		constraint: "text-amber-400 bg-amber-900/30",
		edge_case: "text-purple-400 bg-purple-900/30",
		priority: "text-emerald-400 bg-emerald-900/30",
		acceptance_criteria: "text-cyan-400 bg-cyan-900/30",
		technical: "text-orange-400 bg-orange-900/30",
	};

	const style = colors[type] || "text-gray-400 bg-gray-800";

	return (
		<span className={`rounded px-1.5 py-0.5 text-[11px] ${style}`}>{type}</span>
	);
}
