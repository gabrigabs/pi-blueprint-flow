import type { LucideIcon } from "lucide-react";

interface Props {
	icon?: LucideIcon;
	title: string;
	description?: string;
	action?: {
		label: string;
		onClick: () => void;
	};
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
	return (
		<div className="flex flex-col items-center justify-center px-6 py-10 text-center">
			{Icon && (
				<div
					className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
					style={{
						background: "var(--bg-surface)",
						border: "1px solid var(--border-default)",
					}}
				>
					<Icon size={20} style={{ color: "var(--text-muted)" }} />
				</div>
			)}
			<p
				className="text-sm font-medium"
				style={{ color: "var(--text-secondary)" }}
			>
				{title}
			</p>
			{description && (
				<p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
					{description}
				</p>
			)}
			{action && (
				<button
					type="button"
					onClick={action.onClick}
					className="mt-4 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
					style={{
						background: "var(--bg-surface)",
						border: "1px solid var(--border-default)",
						color: "var(--text-secondary)",
					}}
				>
					{action.label}
				</button>
			)}
		</div>
	);
}
