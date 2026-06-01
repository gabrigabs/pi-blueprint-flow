import {
	AlertCircle,
	AlertTriangle,
	CheckCircle,
	Info,
	Trash2,
} from "lucide-react";
import { useEffect } from "react";
import { type NotificationType, useStore } from "../../store";

const ICONS: Record<NotificationType, typeof CheckCircle> = {
	success: CheckCircle,
	error: AlertCircle,
	warning: AlertTriangle,
	info: Info,
};

const COLORS: Record<NotificationType, string> = {
	success: "var(--emerald-400)",
	error: "var(--rose-400)",
	warning: "var(--amber-400)",
	info: "var(--accent-primary)",
};

function formatRelativeTime(timestamp: number): string {
	const diff = Math.floor((Date.now() - timestamp) / 1000);
	if (diff < 60) return "just now";
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
	return `${Math.floor(diff / 86400)}d ago`;
}

interface Props {
	onClose: () => void;
}

export function NotificationPanel({ onClose }: Props) {
	const notifications = useStore((s) => s.notifications);
	const clearNotifications = useStore((s) => s.clearNotifications);
	const markNotificationsRead = useStore((s) => s.markNotificationsRead);
	const selectNode = useStore((s) => s.selectNode);

	useEffect(() => {
		markNotificationsRead();
	}, [markNotificationsRead]);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			const target = e.target as HTMLElement;
			if (!target.closest("[data-notification-panel]")) {
				onClose();
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [onClose]);

	return (
		<div
			data-notification-panel
			className="absolute top-full right-0 mt-2 w-72 rounded-xl border overflow-hidden"
			style={{
				background: "var(--bg-elevated)",
				borderColor: "var(--border-default)",
				boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
				zIndex: 50,
			}}
		>
			<div
				className="flex items-center justify-between px-3 py-2 border-b"
				style={{ borderColor: "var(--border-subtle)" }}
			>
				<span
					className="text-xs font-medium"
					style={{ color: "var(--text-primary)" }}
				>
					Notifications
				</span>
				{notifications.length > 0 && (
					<button
						type="button"
						onClick={clearNotifications}
						className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-colors hover:bg-[var(--bg-surface-hover)]"
						style={{ color: "var(--text-muted)" }}
					>
						<Trash2 size={10} /> Clear
					</button>
				)}
			</div>

			<div className="max-h-64 overflow-y-auto scrollbar-thin">
				{notifications.length === 0 ? (
					<div className="px-3 py-6 text-center">
						<span
							className="text-[11px]"
							style={{ color: "var(--text-muted)" }}
						>
							No notifications yet
						</span>
					</div>
				) : (
					notifications.map((n) => {
						const Icon = ICONS[n.type];
						const color = COLORS[n.type];
						return (
							<button
								key={n.id}
								type="button"
								onClick={() => {
									if (n.stepName) selectNode(n.stepName);
									onClose();
								}}
								className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--bg-surface-hover)]"
							>
								<Icon size={12} className="mt-0.5 shrink-0" style={{ color }} />
								<div className="min-w-0 flex-1">
									<p
										className="text-[11px] leading-tight truncate"
										style={{ color: "var(--text-primary)" }}
									>
										{n.message}
									</p>
									<p
										className="text-[11px] mt-0.5"
										style={{ color: "var(--text-muted)" }}
									>
										{formatRelativeTime(n.timestamp)}
									</p>
								</div>
							</button>
						);
					})
				)}
			</div>
		</div>
	);
}
