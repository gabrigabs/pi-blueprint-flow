import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const BLUEPRINT_PORT = 4377;
export const BLUEPRINT_DATA_DIR = ".pi/blueprint";
export const BLUEPRINT_DB_FILE = "blueprint.sqlite";

export const FLOW_STEPS = [
	"intake",
	"research",
	"interview",
	"spec",
	"ddd",
	"behavior",
	"implementation_plan",
	"implementation",
	"review",
	"memory_update",
] as const;

export type FlowStep = (typeof FLOW_STEPS)[number];

export const STEP_LABELS: Record<FlowStep, string> = {
	intake: "Intake",
	research: "Research",
	interview: "Interview",
	spec: "Specification",
	ddd: "Domain Modeling",
	behavior: "Behavior Scenarios",
	implementation_plan: "Implementation Plan",
	implementation: "Implementation",
	review: "Review Gate",
	memory_update: "Memory Update",
};

export type StepStatus =
	| "pending"
	| "running"
	| "needs_user"
	| "blocked"
	| "done"
	| "rejected";

export type FeatureStatus = "pending" | "in_progress" | "done" | "archived";

export function getDbPath(cwd: string): string {
	return join(cwd, BLUEPRINT_DATA_DIR, BLUEPRINT_DB_FILE);
}

export function getDataDir(cwd: string): string {
	return join(cwd, BLUEPRINT_DATA_DIR);
}

/**
 * Resolves the web UI dist path by trying multiple candidate locations.
 * Validates that `index.html` actually exists (not just the directory).
 */
export function resolveWebDistPath(): { path: string; found: boolean } {
	const thisDir = dirname(fileURLToPath(import.meta.url));

	const candidates = [
		// From src/ (running source directly via Pi)
		join(thisDir, "..", "web", "dist"),
		// From compiled dist/ (if extension is compiled before loading)
		join(thisDir, "..", "..", "web", "dist"),
		// From project root (local dev with pi install /path)
		join(process.cwd(), "extensions", "blueprint-flow", "web", "dist"),
	];

	for (const candidate of candidates) {
		if (existsSync(join(candidate, "index.html"))) {
			return { path: candidate, found: true };
		}
	}

	// Return first candidate for error messaging
	return { path: candidates[0], found: false };
}
