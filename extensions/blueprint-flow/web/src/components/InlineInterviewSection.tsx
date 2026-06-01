import {
	CheckCircle,
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

interface Props {
	flowId: string;
}

export function InlineInterviewSection({ flowId }: Props) {
	const { interviews, setInterviews } = useStore();

	if (interviews.length === 0) {
		return (
			<div className="py-3 px-2">
				<span className="text-xs text-[var(--text-muted)]">
					No interview questions yet
				</span>
			</div>
		);
	}

	const pending = interviews.filter((i) => i.answer === null);
	const answered = interviews.filter((i) => i.answer !== null);

	async function refreshInterviews() {
		try {
			const data = await api.interviews.list(flowId);
			setInterviews(data);
		} catch {}
	}

	return (
		<div className="py-2 space-y-3">
			{/* Summary */}
			<div className="flex items-center gap-2 px-1">
				<MessageSquare size={12} className="text-amber-400" />
				<span className="text-[11px] text-[var(--text-tertiary)]">
					{answered.length}/{interviews.length} answered
				</span>
			</div>

			{/* Pending questions */}
			{pending.length > 0 && (
				<div className="space-y-2">
					{pending.map((interview) => (
						<PendingQuestion
							key={interview.id}
							interview={interview}
							onAnswered={refreshInterviews}
						/>
					))}
				</div>
			)}

			{/* Answered questions */}
			{answered.length > 0 && (
				<div className="space-y-1">
					<p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider px-1">
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
	const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
	const [loading, setLoading] = useState(false);

	async function submitAnswer(value: string) {
		if (!value.trim()) return;
		setLoading(true);
		try {
			await api.interviews.answer(interview.id, value.trim());
			setAnswer("");
			setSelectedOptions([]);
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

	function toggleOption(opt: string) {
		setSelectedOptions((prev) =>
			prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt],
		);
	}

	const responseType = interview.response_type || "free_text";
	const options = interview.options;

	return (
		<div className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-3">
			<div className="flex items-start gap-2 mb-2">
				<HelpCircle size={13} className="mt-0.5 shrink-0 text-amber-400" />
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
							<span className="text-[10px] text-red-400 font-medium">
								required
							</span>
						)}
					</div>
				</div>
				{!interview.required && (
					<button
						onClick={handleSkip}
						disabled={loading}
						title="Skip question"
						className="rounded bg-gray-800 p-1.5 text-gray-500 hover:bg-gray-700 hover:text-gray-300 disabled:opacity-30 transition-colors"
					>
						<SkipForward size={12} />
					</button>
				)}
			</div>

			{/* Single choice — button list */}
			{responseType === "single_choice" && options && (
				<div className="flex flex-col gap-1.5 mt-2">
					{options.map((opt, i) => (
						<button
							key={opt}
							onClick={() => submitAnswer(opt)}
							disabled={loading}
							className="text-left rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 hover:border-amber-600 hover:bg-gray-800 disabled:opacity-50 transition-colors"
						>
							<span className="text-amber-400 mr-2 font-mono text-xs">
								{String.fromCharCode(65 + i)}.
							</span>
							{opt}
						</button>
					))}
				</div>
			)}

			{/* Multi choice — checkboxes */}
			{responseType === "multi_choice" && options && (
				<div className="flex flex-col gap-1.5 mt-2">
					{options.map((opt) => (
						<label
							key={opt}
							className="flex items-center gap-2 rounded border border-gray-700 bg-gray-900 px-3 py-2 cursor-pointer hover:border-amber-600 transition-colors"
						>
							<input
								type="checkbox"
								checked={selectedOptions.includes(opt)}
								onChange={() => toggleOption(opt)}
								className="accent-amber-500"
								disabled={loading}
							/>
							<span className="text-sm text-gray-200">{opt}</span>
						</label>
					))}
					<button
						onClick={() => submitAnswer(selectedOptions.join(", "))}
						disabled={loading || selectedOptions.length === 0}
						className="mt-1 rounded bg-amber-600/20 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-600/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
					>
						Submit ({selectedOptions.length} selected)
					</button>
				</div>
			)}

			{/* Free text — textarea */}
			{responseType === "free_text" && (
				<div className="flex gap-2 mt-2">
					<textarea
						value={answer}
						onChange={(e) => setAnswer(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								submitAnswer(answer);
							}
						}}
						placeholder="Type your answer..."
						rows={2}
						className="flex-1 rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-amber-600 focus:outline-none resize-none"
						disabled={loading}
					/>
					<button
						onClick={() => submitAnswer(answer)}
						disabled={loading || !answer.trim()}
						title="Submit answer"
						className="rounded bg-amber-600/20 p-2 text-amber-300 hover:bg-amber-600/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors self-end"
					>
						<Send size={13} />
					</button>
				</div>
			)}
		</div>
	);
}

function AnsweredQuestion({ interview }: { interview: Interview }) {
	const isSkipped = interview.answer?.startsWith("[SKIPPED]");

	return (
		<div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2">
			<div className="flex items-start gap-2">
				{isSkipped ? (
					<SkipForward size={12} className="mt-0.5 shrink-0 text-gray-500" />
				) : (
					<CheckCircle size={12} className="mt-0.5 shrink-0 text-emerald-400" />
				)}
				<div className="flex-1 min-w-0">
					<p className="text-xs text-gray-300 truncate">{interview.question}</p>
					{interview.answer && !isSkipped && (
						<p className="mt-0.5 rounded bg-gray-800 px-2 py-1 text-[11px] text-gray-400 truncate">
							{interview.answer}
						</p>
					)}
					{isSkipped && (
						<p className="mt-0.5 text-[11px] text-gray-600 italic">Skipped</p>
					)}
				</div>
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
		<span className={`rounded px-1.5 py-0.5 text-[10px] ${style}`}>{type}</span>
	);
}
