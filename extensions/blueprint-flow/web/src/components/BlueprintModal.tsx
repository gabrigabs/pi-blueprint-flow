import { X } from "lucide-react";
import { useEffect, useRef } from "react";

interface BlueprintModalProps {
	open: boolean;
	onClose: () => void;
	title: string;
	icon?: React.ReactNode;
	width?: "sm" | "md" | "lg" | "xl";
	children: React.ReactNode;
	footer?: React.ReactNode;
	/** Prevent closing on outside click (e.g. when form has unsaved data) */
	preventOutsideClose?: boolean;
}

const WIDTH_CLASSES = {
	sm: "max-w-sm",
	md: "max-w-md",
	lg: "max-w-lg",
	xl: "max-w-xl",
};

export function BlueprintModal({
	open,
	onClose,
	title,
	icon,
	width = "md",
	children,
	footer,
	preventOutsideClose = false,
}: BlueprintModalProps) {
	const overlayRef = useRef<HTMLDivElement>(null);

	// ESC to close
	useEffect(() => {
		if (!open) return;
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [open, onClose]);

	// Prevent body scroll when modal is open
	useEffect(() => {
		if (open) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [open]);

	if (!open) return null;

	function handleOverlayClick(e: React.MouseEvent) {
		if (preventOutsideClose) return;
		if (e.target === overlayRef.current) onClose();
	}

	return (
		<div
			ref={overlayRef}
			onClick={handleOverlayClick}
			className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
			style={{ background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(4px)" }}
		>
			<div
				className={`w-full ${WIDTH_CLASSES[width]} flex max-h-[85vh] flex-col rounded-xl shadow-2xl animate-fade-up`}
				style={{
					background:
						"linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)",
					border: "1px solid var(--border-default)",
					boxShadow:
						"0 0 0 1px var(--border-subtle), 0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 80px -20px rgba(245, 158, 11, 0.03)",
				}}
			>
				{/* Sticky header */}
				<div
					className="flex shrink-0 items-center justify-between px-5 py-3.5"
					style={{ borderBottom: "1px solid var(--border-subtle)" }}
				>
					<h2
						className="flex items-center gap-2.5 font-display text-base tracking-tight"
						style={{ color: "var(--text-primary)" }}
					>
						{icon}
						{title}
					</h2>
					<button
						onClick={onClose}
						className="rounded-md p-1.5 transition-colors hover:bg-[var(--bg-surface-hover)]"
						style={{ color: "var(--text-tertiary)" }}
					>
						<X size={14} />
					</button>
				</div>

				{/* Scrollable body */}
				<div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 scrollbar-thin">
					{children}
				</div>

				{/* Sticky footer */}
				{footer && (
					<div
						className="shrink-0 px-5 py-3.5"
						style={{ borderTop: "1px solid var(--border-subtle)" }}
					>
						{footer}
					</div>
				)}
			</div>
		</div>
	);
}
