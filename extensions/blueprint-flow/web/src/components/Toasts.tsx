import { AlertTriangle, CheckCircle2, Info, RefreshCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

function notify(fns: Set<(toasts: Toast[]) => void>) {
	for (const fn of fns) fn([...currentToasts]);
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

const MAX_VISIBLE = 3;

export function Toasts() {
	const [toasts, setToasts] = useState<Toast[]>([]);

	useEffect(() => {
		listeners.add(setToasts);
		return () => {
			listeners.delete(setToasts);
		};
	}, []);

	if (toasts.length === 0) return null;

	const visible = toasts.slice(-MAX_VISIBLE);

	return (
		<>
			<style>{`
				@keyframes toast-enter {
					from { opacity: 0; transform: translateY(8px); }
					to { opacity: 1; transform: translateY(0); }
				}
				@keyframes toast-progress {
					from { width: 100%; }
					to { width: 0%; }
				}
			`}</style>
			<div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
				{visible.map((toast) => (
					<ToastItem key={toast.id} toast={toast} />
				))}
			</div>
		</>
	);
}

const ACCENT: Record<Toast["type"], string> = {
	success: "var(--accent-success)",
	error: "var(--accent-error)",
	warning: "var(--amber-400)",
	info: "var(--accent-primary)",
};

const ICONS: Record<Toast["type"], React.ReactNode> = {
	success: <CheckCircle2 size={12} />,
	error: <AlertTriangle size={12} />,
	warning: <AlertTriangle size={12} />,
	info: <Info size={12} />,
};

function ToastItem({ toast }: { toast: Toast }) {
	const accent = ACCENT[toast.type];
	const duration = toast.duration ?? (toast.type === "error" ? 8000 : 4000);
	const mountRef = useRef(Date.now());

	return (
		<div
			className="relative flex items-start gap-2.5 rounded-md pl-0 pr-3 py-2.5 overflow-hidden"
			style={{
				background: "var(--bg-elevated)",
				border: "1px solid var(--border-default)",
				borderLeft: `2px solid ${accent}`,
				animation: "toast-enter 0.2s ease-out both",
				fontFamily: "var(--font-body)",
			}}
		>
			<span className="ml-3 mt-0.5 shrink-0" style={{ color: accent }}>
				{ICONS[toast.type]}
			</span>
			<div className="flex-1 min-w-0">
				<p
					className="text-[13px] leading-snug"
					style={{ color: "var(--text-primary)" }}
				>
					{toast.message}
				</p>
				{toast.action && (
					<button
						type="button"
						onClick={toast.action.onClick}
						className="mt-1.5 flex items-center gap-1 text-xs font-medium hover:underline"
						style={{ color: accent }}
					>
						<RefreshCw size={10} />
						{toast.action.label}
					</button>
				)}
			</div>
			<button
				type="button"
				onClick={() => removeToast(toast.id)}
				className="shrink-0 rounded p-0.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
				style={{ color: "var(--text-tertiary)" }}
			>
				<X size={11} />
			</button>
			<div
				className="absolute bottom-0 left-0 h-[2px]"
				style={{
					background: accent,
					opacity: 0.5,
					animation: `toast-progress ${duration}ms linear both`,
				}}
			/>
		</div>
	);
}
