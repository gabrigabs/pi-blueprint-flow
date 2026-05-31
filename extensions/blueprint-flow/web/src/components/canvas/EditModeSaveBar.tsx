import { Loader2, RotateCcw, Save } from "lucide-react";
import { useState } from "react";
import { api } from "../../lib/api";
import { useStore } from "../../store";

export function EditModeSaveBar() {
	const activeWorkflow = useStore((s) => s.activeWorkflow);
	const editModeSteps = useStore((s) => s.editModeSteps);
	const setCanvasEditMode = useStore((s) => s.setCanvasEditMode);
	const setEditModeSteps = useStore((s) => s.setEditModeSteps);
	const setActiveWorkflow = useStore((s) => s.setActiveWorkflow);

	const [saving, setSaving] = useState(false);

	const handleDiscard = () => {
		setEditModeSteps(null);
		setCanvasEditMode(false);
	};

	const handleSave = async () => {
		if (!activeWorkflow || !editModeSteps) return;

		setSaving(true);
		try {
			const updatedWorkflow = await api.workflows.update(activeWorkflow.id, {
				steps: editModeSteps,
			});
			setActiveWorkflow(updatedWorkflow);
			setEditModeSteps(null);
			setCanvasEditMode(false);
		} catch (err) {
			console.error("Failed to save workflow:", err);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div
			className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 rounded-xl border px-4 py-2"
			style={{
				backgroundColor: "var(--bg-elevated)",
				borderColor: "var(--border-default)",
				boxShadow: "0 -4px 24px rgba(0, 0, 0, 0.2)",
			}}
		>
			<span className="text-sm" style={{ color: "var(--text-muted)" }}>
				{editModeSteps?.length ?? 0} steps
			</span>

			<button
				type="button"
				onClick={handleDiscard}
				className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm border transition-colors hover:opacity-80"
				style={{
					color: "var(--text-primary)",
					borderColor: "var(--border-default)",
				}}
			>
				<RotateCcw size={14} />
				Discard
			</button>

			<button
				type="button"
				onClick={handleSave}
				disabled={saving || !editModeSteps?.length}
				className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
				style={{
					backgroundColor: "var(--accent-primary)",
				}}
			>
				{saving ? (
					<Loader2 size={14} className="animate-spin" />
				) : (
					<Save size={14} />
				)}
				Save Workflow
			</button>
		</div>
	);
}
