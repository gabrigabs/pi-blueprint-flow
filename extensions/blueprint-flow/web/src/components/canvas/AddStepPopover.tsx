import { Bot, Hand, Sparkles, X } from "lucide-react";
import { useState } from "react";
import type { StepType } from "../../store";
import { useStore } from "../../store";

interface Props {
	index: number;
	onClose: () => void;
}

const typeOptions: {
	type: StepType;
	label: string;
	icon: typeof Bot;
	color: string;
}[] = [
	{ type: "agent", label: "Agent", icon: Bot, color: "var(--cyan-400)" },
	{ type: "manual", label: "Manual", icon: Hand, color: "var(--emerald-400)" },
	{
		type: "hybrid",
		label: "Hybrid",
		icon: Sparkles,
		color: "var(--amber-400)",
	},
];

const actionOptions = [
	"generate",
	"analyze",
	"summarize",
	"research",
	"implement",
	"review",
	"custom",
];

export function AddStepPopover({ index, onClose }: Props) {
	const [label, setLabel] = useState("");
	const [stepType, setStepType] = useState<StepType>("agent");
	const [actionType, setActionType] = useState("generate");
	const addEditStep = useStore((s) => s.addEditStep);

	function handleAdd() {
		const name = label
			.toLowerCase()
			.replace(/\s+/g, "_")
			.replace(/[^a-z0-9_]/g, "");

		addEditStep(index, {
			name,
			label,
			type: stepType,
			actionType: stepType !== "manual" ? actionType : undefined,
		});
		onClose();
	}

	return (
		<div
			role="dialog"
			className="absolute z-50"
			onClick={(e) => e.stopPropagation()}
			onKeyDown={(e) => e.stopPropagation()}
			onPointerDown={(e) => e.stopPropagation()}
		>
			<div
				className="flex flex-col gap-3 rounded-xl border p-4"
				style={{
					width: 260,
					background: "var(--bg-elevated)",
					borderColor: "var(--border-default)",
					boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
				}}
			>
				{/* Header */}
				<div className="flex items-center justify-between">
					<span
						className="text-sm font-medium"
						style={{ color: "var(--text-primary)" }}
					>
						Add Step
					</span>
					<button
						type="button"
						onClick={onClose}
						className="flex items-center justify-center rounded-md p-1 hover:opacity-80"
						style={{ color: "var(--text-muted)" }}
					>
						<X size={14} />
					</button>
				</div>

				{/* Label input */}
				<label className="block">
					<span
						className="mb-1 block text-xs"
						style={{ color: "var(--text-secondary)" }}
					>
						Label
					</span>
					<input
						type="text"
						value={label}
						onChange={(e) => setLabel(e.target.value)}
						placeholder="Step name..."
						className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none"
						style={{
							background: "var(--bg-surface)",
							borderColor: "var(--border-subtle)",
							color: "var(--text-primary)",
						}}
					/>
				</label>

				{/* Type toggle */}
				<div>
					<span
						className="mb-1 block text-xs"
						style={{ color: "var(--text-secondary)" }}
					>
						Type
					</span>
					<div className="flex gap-1">
						{typeOptions.map(
							({ type, label: typeLabel, icon: Icon, color }) => {
								const selected = stepType === type;
								return (
									<button
										key={type}
										type="button"
										onClick={() => setStepType(type)}
										className="flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors"
										style={{
											background: selected ? `${color}20` : "transparent",
											color: selected ? color : "var(--text-muted)",
										}}
									>
										<Icon size={13} />
										{typeLabel}
									</button>
								);
							},
						)}
					</div>
				</div>

				{/* Action type */}
				{(stepType === "agent" || stepType === "hybrid") && (
					<label className="block">
						<span
							className="mb-1 block text-xs"
							style={{ color: "var(--text-secondary)" }}
						>
							Action
						</span>
						<select
							value={actionType}
							onChange={(e) => setActionType(e.target.value)}
							className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none"
							style={{
								background: "var(--bg-surface)",
								borderColor: "var(--border-subtle)",
								color: "var(--text-primary)",
							}}
						>
							{actionOptions.map((opt) => (
								<option key={opt} value={opt}>
									{opt}
								</option>
							))}
						</select>
					</label>
				)}

				{/* Add button */}
				<button
					type="button"
					onClick={handleAdd}
					disabled={!label.trim()}
					className="w-full rounded-lg py-2 text-sm font-medium text-white transition-opacity disabled:opacity-40"
					style={{ background: "var(--accent-primary)" }}
				>
					Add
				</button>
			</div>
		</div>
	);
}
