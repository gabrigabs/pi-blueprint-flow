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
	const contentRef = useRef<HTMLDivElement>(null);

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
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
		>
			<div
				ref={contentRef}
				className={`w-full ${WIDTH_CLASSES[width]} flex max-h-[85vh] flex-col rounded-lg border border-gray-700 bg-gray-900 shadow-2xl`}
			>
				{/* Sticky header */}
				<div className="flex shrink-0 items-center justify-between border-b border-gray-800 px-4 py-3">
					<h2 className="flex items-center gap-2 text-sm font-semibold text-gray-100">
						{icon}
						{title}
					</h2>
					<button
						onClick={onClose}
						className="rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors"
					>
						<X size={16} />
					</button>
				</div>

				{/* Scrollable body */}
				<div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 scrollbar-thin">
					{children}
				</div>

				{/* Sticky footer */}
				{footer && (
					<div className="shrink-0 border-t border-gray-800 px-4 py-3">
						{footer}
					</div>
				)}
			</div>
		</div>
	);
}
