import type { AgentModelInfo } from "../lib/api";

interface Badge {
	label: string;
	color: string;
}

function getModelBadges(model: AgentModelInfo): Badge[] {
	const badges: Badge[] = [];
	const id = model.id.toLowerCase();

	if (model.cost.input < 1.0) badges.push({ label: "Budget", color: "emerald" });
	else if (model.cost.input > 10.0) badges.push({ label: "Premium", color: "amber" });

	if (model.reasoning) badges.push({ label: "Reasoning", color: "violet" });

	if (model.contextWindow >= 200000) badges.push({ label: "200k ctx", color: "blue" });

	if (id.includes("haiku")) badges.push({ label: "Fast", color: "emerald" });
	if (id.includes("opus")) badges.push({ label: "Strong", color: "amber" });

	if (model.reasoning && model.contextWindow >= 100000) {
		badges.push({ label: "Design", color: "pink" });
	}
	if (model.cost.input < 1.5 && model.contextWindow >= 100000) {
		badges.push({ label: "Research", color: "cyan" });
	}

	return badges;
}

const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
	emerald: { bg: "rgba(16, 185, 129, 0.15)", text: "rgb(110, 231, 183)" },
	amber: { bg: "rgba(245, 158, 11, 0.15)", text: "rgb(252, 211, 77)" },
	violet: { bg: "rgba(139, 92, 246, 0.15)", text: "rgb(196, 167, 255)" },
	blue: { bg: "rgba(59, 130, 246, 0.15)", text: "rgb(147, 197, 253)" },
	pink: { bg: "rgba(236, 72, 153, 0.15)", text: "rgb(249, 168, 212)" },
	cyan: { bg: "rgba(34, 211, 238, 0.15)", text: "rgb(103, 232, 249)" },
};

export function ModelBadges({ model, compact }: { model: AgentModelInfo; compact?: boolean }) {
	const badges = getModelBadges(model);
	if (badges.length === 0) return null;

	const displayed = compact ? badges.slice(0, 2) : badges;

	return (
		<span className="inline-flex items-center gap-0.5 ml-1.5">
			{displayed.map((badge) => {
				const colors = BADGE_COLORS[badge.color] ?? BADGE_COLORS.blue;
				return (
					<span
						key={badge.label}
						className="rounded px-1 py-px text-[9px] font-medium leading-tight"
						style={{ background: colors.bg, color: colors.text }}
					>
						{badge.label}
					</span>
				);
			})}
		</span>
	);
}

export { getModelBadges, type Badge };
