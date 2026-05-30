import { useEffect, useState } from "react";
import { X, AlertTriangle, CheckCircle2, Info, RefreshCw } from "lucide-react";

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
    return () => { listeners.delete(setToasts); };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const config = {
    success: {
      icon: <CheckCircle2 size={15} />,
      border: "border-emerald-500/30",
      bg: "bg-emerald-950/80",
      text: "text-emerald-300",
      iconColor: "text-emerald-400",
    },
    error: {
      icon: <AlertTriangle size={15} />,
      border: "border-red-500/30",
      bg: "bg-red-950/80",
      text: "text-red-300",
      iconColor: "text-red-400",
    },
    warning: {
      icon: <AlertTriangle size={15} />,
      border: "border-amber-500/30",
      bg: "bg-amber-950/80",
      text: "text-amber-300",
      iconColor: "text-amber-400",
    },
    info: {
      icon: <Info size={15} />,
      border: "border-sky-500/30",
      bg: "bg-sky-950/80",
      text: "text-sky-300",
      iconColor: "text-sky-400",
    },
  }[toast.type];

  return (
    <div
      className={`
        flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 shadow-xl backdrop-blur-md
        animate-[slideIn_0.2s_ease-out]
        ${config.border} ${config.bg}
      `}
    >
      <span className={`mt-0.5 shrink-0 ${config.iconColor}`}>{config.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${config.text}`}>{toast.message}</p>
        {toast.action && (
          <button
            type="button"
            onClick={toast.action.onClick}
            className={`mt-1 flex items-center gap-1 text-xs font-medium ${config.iconColor} hover:underline`}
          >
            <RefreshCw size={10} />
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        className="shrink-0 rounded p-0.5 text-zinc-500 hover:text-zinc-300"
      >
        <X size={13} />
      </button>
    </div>
  );
}
