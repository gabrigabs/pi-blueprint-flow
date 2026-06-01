import { Check, MessageSquare, Palette, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "../../store";
import { addToast } from "../Toasts";

interface DesignVariant {
	id: string;
	flow_id: string;
	label: string;
	html_content: string;
	css_content: string;
	js_content: string | null;
	tokens_json: Record<string, unknown> | null;
	feedback: string | null;
	selected: number;
	created_at: string;
}

interface DesignTokens {
	spacing?: number;
	primaryColor?: string;
	bgColor?: string;
	fontSize?: number;
	borderRadius?: number;
}

export function DesignCanvas({ flowId }: { flowId: string }) {
	const [variants, setVariants] = useState<DesignVariant[]>([]);
	const [loading, setLoading] = useState(true);
	const [tokens, setTokens] = useState<DesignTokens>({
		spacing: 16,
		primaryColor: "#3b82f6",
		bgColor: "#0a0a0f",
		fontSize: 16,
		borderRadius: 8,
	});
	const [feedback, setFeedback] = useState("");

	const fetchVariants = useCallback(async () => {
		try {
			const res = await fetch(`/api/flows/${flowId}/design/variants`);
			const data = await res.json();
			setVariants(data);
		} catch {
		} finally {
			setLoading(false);
		}
	}, [flowId]);

	useEffect(() => {
		fetchVariants();
	}, [fetchVariants]);

	async function selectVariant(id: string) {
		await fetch(`/api/design/variants/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ selected: true }),
		});
		addToast({ type: "success", message: "Variant selected" });
		fetchVariants();
	}

	async function submitFeedback(id: string) {
		if (!feedback.trim()) return;
		await fetch(`/api/design/variants/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ feedback: feedback.trim() }),
		});
		setFeedback("");
		addToast({ type: "success", message: "Feedback saved" });
		fetchVariants();
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center h-full">
				<RefreshCw
					size={16}
					className="animate-spin text-[var(--text-muted)]"
				/>
			</div>
		);
	}

	if (variants.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-full gap-3">
				<Palette size={24} className="text-[var(--text-muted)]" />
				<p className="text-sm text-[var(--text-muted)]">
					No design variants yet
				</p>
				<p className="text-xs text-[var(--text-muted)]">
					Run the design step to generate mockup variants
				</p>
			</div>
		);
	}

	const selectedVariant = variants.find((v) => v.selected);

	return (
		<div className="flex flex-col h-full overflow-hidden">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)]">
				<div className="flex items-center gap-2">
					<Palette size={14} className="text-amber-400" />
					<span className="text-sm font-medium text-[var(--text-secondary)]">
						Design Variants ({variants.length})
					</span>
				</div>
			</div>

			{/* Variants grid */}
			<div className="flex-1 overflow-auto p-4">
				<div
					className={`grid gap-4 h-full ${variants.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
				>
					{variants.map((variant) => (
						<VariantCard
							key={variant.id}
							variant={variant}
							tokens={tokens}
							onSelect={() => selectVariant(variant.id)}
						/>
					))}
				</div>
			</div>

			{/* Controls footer */}
			<div className="border-t border-[var(--border-subtle)] p-3">
				<div className="flex items-center gap-3">
					<DesignSlider
						label="Spacing"
						value={tokens.spacing ?? 16}
						min={4}
						max={48}
						step={4}
						onChange={(v) => setTokens((t) => ({ ...t, spacing: v }))}
					/>
					<DesignSlider
						label="Font"
						value={tokens.fontSize ?? 16}
						min={12}
						max={24}
						step={1}
						onChange={(v) => setTokens((t) => ({ ...t, fontSize: v }))}
					/>
					<DesignSlider
						label="Radius"
						value={tokens.borderRadius ?? 8}
						min={0}
						max={24}
						step={2}
						onChange={(v) => setTokens((t) => ({ ...t, borderRadius: v }))}
					/>
					<div className="flex-1" />
					{selectedVariant && (
						<div className="flex items-center gap-2">
							<input
								value={feedback}
								onChange={(e) => setFeedback(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") submitFeedback(selectedVariant.id);
								}}
								placeholder="Feedback on selected variant..."
								className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 placeholder-gray-600 focus:border-amber-600 focus:outline-none w-64"
							/>
							<button
								onClick={() => submitFeedback(selectedVariant.id)}
								disabled={!feedback.trim()}
								className="rounded bg-amber-600/20 p-1.5 text-amber-300 hover:bg-amber-600/30 disabled:opacity-30 transition-colors"
							>
								<MessageSquare size={12} />
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function VariantCard({
	variant,
	tokens,
	onSelect,
}: {
	variant: DesignVariant;
	tokens: DesignTokens;
	onSelect: () => void;
}) {
	const iframeRef = useRef<HTMLIFrameElement>(null);

	useEffect(() => {
		if (!iframeRef.current) return;
		const doc = iframeRef.current.contentDocument;
		if (!doc) return;

		const cssVars = `
			:root {
				--spacing: ${tokens.spacing ?? 16}px;
				--primary: ${tokens.primaryColor ?? "#3b82f6"};
				--bg: ${tokens.bgColor ?? "#0a0a0f"};
				--font-size: ${tokens.fontSize ?? 16}px;
				--radius: ${tokens.borderRadius ?? 8}px;
			}
		`;

		doc.open();
		doc.write(`<!DOCTYPE html>
<html>
<head>
<style>${cssVars}\n${variant.css_content}</style>
</head>
<body>${variant.html_content}</body>
${variant.js_content ? `<script>${variant.js_content}</script>` : ""}
</html>`);
		doc.close();
	}, [variant, tokens]);

	return (
		<div
			className={`flex flex-col rounded-lg border overflow-hidden transition-all ${
				variant.selected
					? "border-amber-500/50 ring-1 ring-amber-400/20"
					: "border-[var(--border-subtle)] hover:border-[var(--border-default)]"
			}`}
		>
			{/* Label bar */}
			<div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-elevated)]">
				<span className="text-xs font-medium text-[var(--text-secondary)]">
					{variant.label}
				</span>
				<button
					onClick={onSelect}
					className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
						variant.selected
							? "bg-amber-600/20 text-amber-300"
							: "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
					}`}
				>
					{variant.selected && <Check size={10} />}
					{variant.selected ? "Selected" : "Select"}
				</button>
			</div>

			{/* Iframe */}
			<iframe
				ref={iframeRef}
				sandbox="allow-scripts"
				className="flex-1 w-full min-h-[300px] bg-[#0a0a0f]"
				title={`Design variant: ${variant.label}`}
			/>

			{/* Feedback */}
			{variant.feedback && (
				<div className="px-3 py-1.5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
					<p className="text-[10px] text-gray-400 italic truncate">
						{variant.feedback}
					</p>
				</div>
			)}
		</div>
	);
}

function DesignSlider({
	label,
	value,
	min,
	max,
	step,
	onChange,
}: {
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
	onChange: (v: number) => void;
}) {
	return (
		<div className="flex items-center gap-2">
			<span className="text-[10px] text-[var(--text-muted)] w-10">{label}</span>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
				className="w-20 h-1 accent-amber-500"
			/>
			<span className="text-[10px] text-[var(--text-muted)] font-mono w-6 text-right">
				{value}
			</span>
		</div>
	);
}
