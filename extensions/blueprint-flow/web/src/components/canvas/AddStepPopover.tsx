import { Bot, ChevronDown, Hand, Sparkles, X } from "lucide-react";
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

const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh"];

export function AddStepPopover({ index, onClose }: Props) {
	const [label, setLabel] = useState("");
	const [stepType, setStepType] = useState<StepType>("agent");
	const [actionType, setActionType] = useState("generate");
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [modelId, setModelId] = useState("");
	const [thinkingLevel, setThinkingLevel] = useState("medium");
	const [optional, setOptional] = useState(false);
	const addEditStep = useStore((s) => s.addEditStep);
	const selectNode = useStore((s) => s.selectNode);
	const editModeSteps = useStore((s) => s.editModeSteps);

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
			modelId: modelId || undefined,
			thinkingLevel: thinkingLevel !== "medium" ? thinkingLevel : undefined,
			optional: optional || undefined,
		});

		const newNodeId = `step-${index}`;
		setTimeout(() => selectNode(newNodeId), 50);
		onClose();
	}

	return (
		<div
			role="dialog"
			className="relative"
			onClick={(e) => e.stopPropagation()}
			onKeyDown={(e) => e.stopPropagation()}
			onPointerDown={(e) => e.stopPropagation()}
			style={{ zIndex: 9999 }}
		>
			<div
				className="flex flex-col gap-3 rounded-xl border p-4"
				style={{
					width: 280,
					background: "var(--bg-elevated)",
					borderColor: "var(--border-default)",
					boxShadow:
						"0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px var(--border-subtle)",
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
						autoFocus
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

				{/* Advanced (collapsible) */}
				<button
					type="button"
					onClick={() => setShowAdvanced(!showAdvanced)}
					className="flex items-center gap-1 text-xs transition-colors hover:opacity-80"
					style={{ color: "var(--text-muted)" }}
				>
					<ChevronDown
						size={12}
						style={{
							transform: showAdvanced ? "rotate(180deg)" : "none",
							transition: "transform 0.15s",
						}}
					/>
					Advanced
				</button>

				{showAdvanced && (
					<div className="flex flex-col gap-2.5 animate-fade-in">
						{/* Model override */}
						<label className="block">
							<span
								className="mb-1 block text-xs"
								style={{ color: "var(--text-secondary)" }}
							>
								Model override
							</span>
							<input
								type="text"
								value={modelId}
								onChange={(e) => setModelId(e.target.value)}
								placeholder="default"
								className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none"
								style={{
									background: "var(--bg-surface)",
									borderColor: "var(--border-subtle)",
									color: "var(--text-primary)",
								}}
							/>
						</label>

						{/* Thinking level */}
						<div>
							<span
								className="mb-1 block text-xs"
								style={{ color: "var(--text-secondary)" }}
							>
								Thinking
							</span>
							<div className="flex flex-wrap gap-1">
								{THINKING_LEVELS.map((level) => {
									const selected = thinkingLevel === level;
									return (
										<button
											key={level}
											type="button"
											onClick={() => setThinkingLevel(level)}
											className="rounded-md px-2 py-0.5 text-[10px] font-mono transition-colors"
											style={{
												background: selected
													? "rgba(91,155,213,0.12)"
													: "transparent",
												color: selected
													? "var(--accent-primary)"
													: "var(--text-muted)",
												border: `1px solid ${selected ? "rgba(91,155,213,0.25)" : "var(--border-subtle)"}`,
											}}
										>
											{level}
										</button>
									);
								})}
							</div>
						</div>

						{/* Optional toggle */}
						<label className="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={optional}
								onChange={(e) => setOptional(e.target.checked)}
								className="rounded"
							/>
							<span
								className="text-xs"
								style={{ color: "var(--text-secondary)" }}
							>
								Optional step
							</span>
						</label>
					</div>
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
