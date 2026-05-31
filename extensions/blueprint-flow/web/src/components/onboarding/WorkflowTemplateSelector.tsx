import {
	BookOpen,
	Check,
	Code,
	Dumbbell,
	GraduationCap,
	PenTool,
	Plus,
	Search,
	Wallet,
	Zap,
} from "lucide-react";
import {
	WORKFLOW_TEMPLATES,
	type WorkflowTemplate,
} from "../../constants/workflow-templates";

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
	code: Code,
	search: Search,
	dumbbell: Dumbbell,
	wallet: Wallet,
	"pen-tool": PenTool,
	"graduation-cap": GraduationCap,
	zap: Zap,
	plus: Plus,
};

interface Props {
	selected: string | null;
	onSelect: (template: WorkflowTemplate) => void;
}

export function WorkflowTemplateSelector({ selected, onSelect }: Props) {
	return (
		<div className="grid grid-cols-2 gap-3">
			{WORKFLOW_TEMPLATES.filter((t) => t.steps.length > 0).map((template) => {
				const Icon = TEMPLATE_ICONS[template.icon] ?? BookOpen;
				const isSelected = selected === template.id;

				return (
					<button
						key={template.id}
						type="button"
						onClick={() => onSelect(template)}
						className="group relative rounded-xl border p-4 text-left transition-all"
						style={{
							borderColor: isSelected
								? template.color
								: "var(--border-default)",
							background: isSelected
								? `color-mix(in srgb, ${template.color} 8%, var(--bg-surface))`
								: "var(--bg-surface)",
						}}
					>
						{isSelected && (
							<div
								className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full"
								style={{ background: template.color }}
							>
								<Check size={11} className="text-white" />
							</div>
						)}

						<div
							className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg"
							style={{
								background: `color-mix(in srgb, ${template.color} 12%, transparent)`,
								color: template.color,
							}}
						>
							<Icon size={16} />
						</div>

						<h3
							className="text-sm font-medium mb-1"
							style={{
								color: isSelected ? template.color : "var(--text-primary)",
							}}
						>
							{template.name}
						</h3>

						<p
							className="text-xs leading-relaxed mb-3"
							style={{ color: "var(--text-tertiary)" }}
						>
							{template.description}
						</p>

						<div className="flex items-center gap-1">
							{template.steps.map((step, i) => (
								<div key={step.name} className="flex items-center gap-1">
									{i > 0 && (
										<div
											className="h-px w-2"
											style={{
												background: "var(--border-default)",
											}}
										/>
									)}
									<div
										className="h-1.5 w-1.5 rounded-full"
										style={{
											background: isSelected
												? template.color
												: "var(--text-muted)",
											opacity: step.type === "manual" ? 0.5 : 1,
										}}
										title={`${step.label} (${step.type ?? "agent"})`}
									/>
								</div>
							))}
							<span
								className="ml-1.5 font-mono text-[10px]"
								style={{ color: "var(--text-muted)" }}
							>
								{template.steps.length}
							</span>
						</div>
					</button>
				);
			})}
		</div>
	);
}
