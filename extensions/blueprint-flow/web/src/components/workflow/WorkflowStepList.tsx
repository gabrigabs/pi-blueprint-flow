import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { WorkflowStep } from "../../store";

const ACTION_TYPES = [
	{ value: "run_step", label: "Run Step" },
	{ value: "research", label: "Research" },
	{ value: "interview", label: "Interview" },
	{ value: "spec", label: "Spec" },
	{ value: "ddd", label: "DDD" },
	{ value: "behavior", label: "Behavior" },
	{ value: "implementation_plan", label: "Impl Plan" },
	{ value: "implementation", label: "Implementation" },
	{ value: "review", label: "Review" },
	{ value: "memory_update", label: "Memory" },
];

interface Props {
	steps: WorkflowStep[];
	onChange: (steps: WorkflowStep[]) => void;
}

export function WorkflowStepList({ steps, onChange }: Props) {
	const [dragIndex, setDragIndex] = useState<number | null>(null);

	function handleAdd() {
		onChange([...steps, { name: "", label: "", actionType: "run_step" }]);
	}

	function handleRemove(index: number) {
		onChange(steps.filter((_, i) => i !== index));
	}

	function handleChange(
		index: number,
		field: keyof WorkflowStep,
		value: string,
	) {
		onChange(
			steps.map((s, i) =>
				i === index
					? {
							...s,
							[field]:
								field === "name"
									? value.toLowerCase().replace(/\s+/g, "_")
									: value,
						}
					: s,
			),
		);
	}

	function handleDragStart(index: number) {
		setDragIndex(index);
	}

	function handleDragOver(e: React.DragEvent, index: number) {
		e.preventDefault();
		if (dragIndex === null || dragIndex === index) return;

		const newSteps = [...steps];
		const [moved] = newSteps.splice(dragIndex, 1);
		newSteps.splice(index, 0, moved);
		onChange(newSteps);
		setDragIndex(index);
	}

	function handleDragEnd() {
		setDragIndex(null);
	}

	return (
		<div className="space-y-1.5">
			{steps.map((step, i) => (
				<div
					key={i}
					draggable
					onDragStart={() => handleDragStart(i)}
					onDragOver={(e) => handleDragOver(e, i)}
					onDragEnd={handleDragEnd}
					className="flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors"
					style={{
						borderColor:
							dragIndex === i
								? "var(--accent-primary)"
								: "var(--border-subtle)",
						background:
							dragIndex === i ? "var(--bg-surface-hover)" : "var(--bg-surface)",
					}}
				>
					<GripVertical
						size={12}
						className="cursor-grab shrink-0"
						style={{ color: "var(--text-muted)" }}
					/>

					<span
						className="text-[10px] w-4 text-center shrink-0 font-mono"
						style={{ color: "var(--text-muted)" }}
					>
						{i + 1}
					</span>

					<input
						type="text"
						value={step.name}
						onChange={(e) => handleChange(i, "name", e.target.value)}
						className="w-24 rounded border px-2 py-1 text-xs font-mono focus:outline-none"
						style={{
							borderColor: "var(--border-subtle)",
							background: "var(--bg-elevated)",
							color: "var(--text-secondary)",
						}}
						placeholder="step_name"
					/>

					<input
						type="text"
						value={step.label}
						onChange={(e) => handleChange(i, "label", e.target.value)}
						className="flex-1 rounded border px-2 py-1 text-xs focus:outline-none"
						style={{
							borderColor: "var(--border-subtle)",
							background: "var(--bg-elevated)",
							color: "var(--text-primary)",
						}}
						placeholder="Display Label"
					/>

					<select
						value={step.actionType ?? "run_step"}
						onChange={(e) => handleChange(i, "actionType", e.target.value)}
						className="w-28 rounded border px-1.5 py-1 text-xs focus:outline-none"
						style={{
							borderColor: "var(--border-subtle)",
							background: "var(--bg-elevated)",
							color: "var(--text-tertiary)",
						}}
					>
						{ACTION_TYPES.map((t) => (
							<option key={t.value} value={t.value}>
								{t.label}
							</option>
						))}
					</select>

					<button
						type="button"
						onClick={() => handleRemove(i)}
						className="shrink-0 rounded p-1 transition-colors hover:bg-[var(--rose-glow)]"
						style={{ color: "var(--text-muted)" }}
					>
						<Trash2 size={12} />
					</button>
				</div>
			))}

			<button
				type="button"
				onClick={handleAdd}
				className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs transition-colors hover:bg-[var(--bg-surface-hover)]"
				style={{ color: "var(--text-tertiary)" }}
			>
				<Plus size={12} /> Add Step
			</button>
		</div>
	);
}
