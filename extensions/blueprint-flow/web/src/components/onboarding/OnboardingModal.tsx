import { Download, FolderPlus } from "lucide-react";
import { useState } from "react";
import { useStore } from "../../store";
import { BlueprintModal } from "../BlueprintModal";
import { ImportProjectFlow } from "./ImportProjectFlow";
import { NewProjectFlow } from "./NewProjectFlow";

type View = "choose" | "new" | "import";

export function OnboardingModal() {
	const { closeModal } = useStore();
	const [view, setView] = useState<View>("choose");

	function getTitle() {
		switch (view) {
			case "choose":
				return "Get Started";
			case "new":
				return "New Project";
			case "import":
				return "Import Project";
		}
	}

	return (
		<BlueprintModal
			open
			onClose={closeModal}
			title={getTitle()}
			icon={
				view === "import" ? (
					<Download size={16} style={{ color: "var(--amber-400)" }} />
				) : (
					<FolderPlus size={16} style={{ color: "var(--accent-primary)" }} />
				)
			}
			width={view === "choose" ? "md" : "lg"}
		>
			{view === "choose" && (
				<div className="grid grid-cols-2 gap-4">
					<button
						onClick={() => setView("new")}
						className="group rounded-xl border p-5 text-left transition-all hover:border-[var(--accent-primary)]"
						style={{
							borderColor: "var(--border-default)",
							background: "var(--bg-surface)",
						}}
					>
						<div
							className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg transition-colors"
							style={{
								background: "color-mix(in srgb, var(--accent-primary) 10%, transparent)",
								color: "var(--accent-primary)",
							}}
						>
							<FolderPlus size={20} />
						</div>
						<h3
							className="text-sm font-medium mb-1"
							style={{ color: "var(--text-primary)" }}
						>
							New Project
						</h3>
						<p className="text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
							Start fresh with a name and workflow template
						</p>
					</button>

					<button
						onClick={() => setView("import")}
						className="group rounded-xl border p-5 text-left transition-all hover:border-[var(--amber-400)]"
						style={{
							borderColor: "var(--border-default)",
							background: "var(--bg-surface)",
						}}
					>
						<div
							className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg transition-colors"
							style={{
								background: "var(--amber-glow)",
								color: "var(--amber-400)",
							}}
						>
							<Download size={20} />
						</div>
						<h3
							className="text-sm font-medium mb-1"
							style={{ color: "var(--text-primary)" }}
						>
							Import Existing
						</h3>
						<p className="text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
							Point to a repository and auto-detect its stack
						</p>
					</button>
				</div>
			)}

			{view === "new" && <NewProjectFlow onBack={() => setView("choose")} />}
			{view === "import" && <ImportProjectFlow onBack={() => setView("choose")} />}
		</BlueprintModal>
	);
}
