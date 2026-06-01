import { Bot, Hand, Sparkles, X } from "lucide-react";
import type { StepType } from "../../store";
import { useStore } from "../../store";

const TYPE_OPTIONS: {
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

const ACTION_OPTIONS = [
	"generate",
	"analyze",
	"summarize",
	"research",
	"implement",
	"review",
	"custom",
];

const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh"];

export function StepConfigPanel() {
	const selectedNodeId = useStore((s) => s.selectedNodeId);
	const editModeSteps = useStore((s) => s.editModeSteps);
	const updateEditStep = useStore((s) => s.updateEditStep);
	const selectNode = useStore((s) => s.selectNode);

	if (!selectedNodeId || !editModeSteps) return null;

	const index = editModeSteps.findIndex(
		(s, i) => `edit-${i}-${s.name}` === selectedNodeId,
	);
	if (index === -1) return null;

	const step = editModeSteps[index];

	function update<K extends keyof typeof step>(
		key: K,
		value: (typeof step)[K],
	) {
		updateEditStep(index, { [key]: value });
	}

	return (
		<div
			className="absolute top-0 right-0 bottom-0 z-20 w-[360px] flex flex-col overflow-hidden border-l animate-fade-in"
			style={{
				background: "var(--bg-elevated)",
				borderColor: "var(--border-default)",
				boxShadow: "-8px 0 32px rgba(0, 0, 0, 0.4)",
			}}
		>
			{/* Header */}
			<div
				className="flex items-center justify-between px-5 py-3.5 border-b shrink-0"
				style={{ borderColor: "var(--border-subtle)" }}
			>
				<span
					className="text-sm font-semibold"
					style={{ color: "var(--text-primary)" }}
				>
					Configure Step
				</span>
				<button
					type="button"
					onClick={() => selectNode(null)}
					className="rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
					style={{ color: "var(--text-muted)" }}
				>
					<X size={14} />
				</button>
			</div>

			{/* Fields */}
			<div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-5">
				{/* Label */}
				<Field label="Label">
					<input
						type="text"
						value={step.label}
						onChange={(e) => update("label", e.target.value)}
						className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:border-[var(--accent-primary)]"
						style={{
							background: "var(--bg-inset)",
							borderColor: "var(--border-subtle)",
							color: "var(--text-primary)",
						}}
					/>
				</Field>

				{/* Type */}
				<Field label="Type">
					<div className="flex gap-1">
						{TYPE_OPTIONS.map(({ type, label, icon: Icon, color }) => {
							const selected = (step.type ?? "agent") === type;
							return (
								<button
									key={type}
									type="button"
									onClick={() => update("type", type)}
									className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors"
									style={{
										background: selected
											? `color-mix(in srgb, ${color} 12%, transparent)`
											: "transparent",
										color: selected ? color : "var(--text-muted)",
										border: `1px solid ${selected ? `color-mix(in srgb, ${color} 25%, transparent)` : "var(--border-subtle)"}`,
									}}
								>
									<Icon size={12} />
									{label}
								</button>
							);
						})}
					</div>
				</Field>

				{/* Action type (agent/hybrid only) */}
				{(step.type === "agent" || step.type === "hybrid" || !step.type) && (
					<Field label="Action">
						<select
							value={step.actionType ?? "generate"}
							onChange={(e) => update("actionType", e.target.value)}
							className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none"
							style={{
								background: "var(--bg-inset)",
								borderColor: "var(--border-subtle)",
								color: "var(--text-primary)",
							}}
						>
							{ACTION_OPTIONS.map((opt) => (
								<option key={opt} value={opt}>
									{opt}
								</option>
							))}
						</select>
					</Field>
				)}

				{/* Model override */}
				<Field label="Model override">
					<input
						type="text"
						value={step.modelId ?? ""}
						onChange={(e) => update("modelId", e.target.value || undefined)}
						placeholder="default"
						className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:border-[var(--accent-primary)]"
						style={{
							background: "var(--bg-inset)",
							borderColor: "var(--border-subtle)",
							color: "var(--text-primary)",
						}}
					/>
				</Field>

				{/* Thinking level */}
				<Field label="Thinking level">
					<div className="flex flex-wrap gap-1">
						{THINKING_LEVELS.map((level) => {
							const selected = (step.thinkingLevel ?? "medium") === level;
							return (
								<button
									key={level}
									type="button"
									onClick={() => update("thinkingLevel", level)}
									className="rounded-md px-2 py-0.5 text-[10px] font-mono transition-colors"
									style={{
										background: selected ? "var(--cyan-glow)" : "transparent",
										color: selected ? "var(--cyan-400)" : "var(--text-muted)",
										border: `1px solid ${selected ? "rgba(91,155,213,0.25)" : "var(--border-subtle)"}`,
									}}
								>
									{level}
								</button>
							);
						})}
					</div>
				</Field>

				{/* Optional toggle */}
				<div className="flex items-center justify-between">
					<span
						className="text-xs font-medium"
						style={{ color: "var(--text-secondary)" }}
					>
						Optional step
					</span>
					<button
						type="button"
						onClick={() => update("optional", !step.optional)}
						className="relative h-5 w-9 rounded-full transition-colors"
						style={{
							background: step.optional
								? "var(--accent-primary)"
								: "var(--bg-surface-hover)",
						}}
					>
						<span
							className="absolute top-0.5 h-4 w-4 rounded-full transition-transform"
							style={{
								background: "white",
								left: step.optional ? "calc(100% - 18px)" : "2px",
							}}
						/>
					</button>
				</div>

				{/* Instructions */}
				<Field
					label="Instructions"
					hint="Overrides the default system prompt for this step"
				>
					<textarea
						value={step.instructions ?? ""}
						onChange={(e) =>
							update("instructions", e.target.value || undefined)
						}
						placeholder="Custom instructions for the agent on this step..."
						rows={5}
						className="w-full rounded-lg border px-3 py-2 text-xs outline-none focus:border-[var(--accent-primary)] resize-none"
						style={{
							background: "var(--bg-inset)",
							borderColor: "var(--border-subtle)",
							color: "var(--text-primary)",
							fontFamily: "var(--font-mono)",
							lineHeight: 1.6,
						}}
					/>
				</Field>

				{/* Skip condition */}
				<Field
					label="Skip condition"
					hint="When to skip this step automatically"
				>
					<textarea
						value={step.skipCondition ?? ""}
						onChange={(e) =>
							update("skipCondition", e.target.value || undefined)
						}
						placeholder="e.g. Skip if no external APIs are involved"
						rows={3}
						className="w-full rounded-lg border px-3 py-2 text-xs outline-none focus:border-[var(--accent-primary)] resize-none"
						style={{
							background: "var(--bg-inset)",
							borderColor: "var(--border-subtle)",
							color: "var(--text-primary)",
							lineHeight: 1.6,
						}}
					/>
				</Field>
			</div>
		</div>
	);
}

function Field({
	label,
	hint,
	children,
}: {
	label: string;
	hint?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-1.5">
			<div>
				<span
					className="text-xs font-medium"
					style={{ color: "var(--text-secondary)" }}
				>
					{label}
				</span>
				{hint && (
					<p
						className="text-[11px] mt-0.5"
						style={{ color: "var(--text-muted)" }}
					>
						{hint}
					</p>
				)}
			</div>
			{children}
		</div>
	);
}
