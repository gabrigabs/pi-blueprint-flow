import { FileText, MessageSquare, Zap } from "lucide-react";

export type StepTab = "actions" | "artifacts" | "interview";

interface Props {
	activeTab: StepTab;
	onTabChange: (tab: StepTab) => void;
	actionCount: number;
	artifactCount: number;
	interviewCount: number;
	showInterview: boolean;
}

export function InlineStepTabs({
	activeTab,
	onTabChange,
	actionCount,
	artifactCount,
	interviewCount,
	showInterview,
}: Props) {
	const tabs: Array<{
		id: StepTab;
		label: string;
		count: number;
		icon: React.ReactNode;
		show: boolean;
	}> = [
		{
			id: "actions",
			label: "Actions",
			count: actionCount,
			icon: <Zap size={11} />,
			show: true,
		},
		{
			id: "artifacts",
			label: "Artifacts",
			count: artifactCount,
			icon: <FileText size={11} />,
			show: true,
		},
		{
			id: "interview",
			label: "Interview",
			count: interviewCount,
			icon: <MessageSquare size={11} />,
			show: showInterview,
		},
	];

	return (
		<div className="flex items-center gap-0.5 rounded-lg bg-[var(--bg-inset)] p-0.5">
			{tabs
				.filter((t) => t.show)
				.map((tab) => (
					<button
						key={tab.id}
						onClick={(e) => {
							e.stopPropagation();
							onTabChange(tab.id);
						}}
						className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-all ${
							activeTab === tab.id
								? "bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-sm"
								: "text-[var(--text-muted)] hover:text-[var(--text-tertiary)]"
						}`}
					>
						{tab.icon}
						<span>{tab.label}</span>
						{tab.count > 0 && (
							<span
								className={`rounded-full px-1.5 py-0.5 text-[9px] font-mono ${
									activeTab === tab.id
										? "bg-[var(--bg-surface-hover)] text-[var(--text-tertiary)]"
										: "bg-[var(--bg-surface)] text-[var(--text-muted)]"
								}`}
							>
								{tab.count}
							</span>
						)}
					</button>
				))}
		</div>
	);
}
