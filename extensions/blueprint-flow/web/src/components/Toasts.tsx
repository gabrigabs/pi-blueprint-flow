import { AlertTriangle, CheckCircle2, Info, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";

export interface Toast {
	id: string;
	type: "success" | "error" | "info" | "warning";
	message: string;
	action?: { label: string; onClick: () => void };
	duration?: number;
}

let toastId = 0;
const listeners = new Set<(toasts: Toast[]) => void>();
let currentToasts: Toast[] = [];

function notify(listeners: Set<(toasts: Toast[]) => void>) {
	for (const fn of listeners) fn([...currentToasts]);
}

export function addToast(toast: Omit<Toast, "id">) {
	const id = String(++toastId);
	currentToasts = [...currentToasts, { ...toast, id }];
	notify(listeners);

	const duration = toast.duration ?? (toast.type === "error" ? 8000 : 4000);
	setTimeout(() => removeToast(id), duration);
}

export function removeToast(id: string) {
	currentToasts = currentToasts.filter((t) => t.id !== id);
	notify(listeners);
}

export function Toasts() {
	const [toasts, setToasts] = useState<Toast[]>([]);

	useEffect(() => {
		listeners.add(setToasts);
		return () => {
			listeners.delete(setToasts);
		};
	}, []);

	if (toasts.length === 0) return null;

	return (
		<div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
			{toasts.map((toast, i) => (
				<ToastItem key={toast.id} toast={toast} index={i} />
			))}
		</div>
	);
}

function ToastItem({ toast, index }: { toast: Toast; index: number }) {
	const config = {
		success: {
			icon: <CheckCircle2 size={14} />,
			borderColor: "rgba(52, 211, 153, 0.2)",
			bg: "linear-gradient(135deg, rgba(6, 78, 59, 0.9) 0%, rgba(10, 12, 16, 0.95) 100%)",
			iconColor: "var(--emerald-400)",
			textColor: "#a7f3d0",
		},
		error: {
			icon: <AlertTriangle size={14} />,
			borderColor: "rgba(244, 63, 94, 0.2)",
			bg: "linear-gradient(135deg, rgba(76, 5, 25, 0.9) 0%, rgba(10, 12, 16, 0.95) 100%)",
			iconColor: "var(--rose-400)",
			textColor: "#fda4af",
		},
		warning: {
			icon: <AlertTriangle size={14} />,
			borderColor: "rgba(245, 158, 11, 0.2)",
			bg: "linear-gradient(135deg, rgba(69, 26, 3, 0.9) 0%, rgba(10, 12, 16, 0.95) 100%)",
			iconColor: "var(--amber-400)",
			textColor: "#fde68a",
		},
		info: {
			icon: <Info size={14} />,
			borderColor: "rgba(34, 211, 238, 0.15)",
			bg: "linear-gradient(135deg, rgba(8, 51, 68, 0.9) 0%, rgba(10, 12, 16, 0.95) 100%)",
			iconColor: "var(--cyan-400)",
			textColor: "#a5f3fc",
		},
	}[toast.type];

	return (
		<div
			className="flex items-start gap-2.5 rounded-lg px-3.5 py-2.5 shadow-2xl backdrop-blur-md animate-[slideIn_0.25s_ease-out_both]"
			style={{
				background: config.bg,
				border: `1px solid ${config.borderColor}`,
				animationDelay: `${index * 50}ms`,
			}}
		>
			<span className="mt-0.5 shrink-0" style={{ color: config.iconColor }}>
				{config.icon}
			</span>
			<div className="flex-1 min-w-0">
				<p
					className="text-sm leading-snug font-medium"
					style={{ color: config.textColor, fontFamily: "var(--font-body)" }}
				>
					{toast.message}
				</p>
				{toast.action && (
					<button
						type="button"
						onClick={toast.action.onClick}
						className="mt-1.5 flex items-center gap-1 text-xs font-medium hover:underline"
						style={{ color: config.iconColor }}
					>
						<RefreshCw size={10} />
						{toast.action.label}
					</button>
				)}
			</div>
			<button
				type="button"
				onClick={() => removeToast(toast.id)}
				className="shrink-0 rounded p-0.5 transition-colors"
				style={{ color: "var(--text-muted)" }}
			>
				<X size={12} />
			</button>
		</div>
	);
}
