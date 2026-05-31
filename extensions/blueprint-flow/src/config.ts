import { existsSync, mkdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const BLUEPRINT_PORT = 4377;
export const BLUEPRINT_DB_FILE = "blueprint.sqlite";

export const WEB_SEARCH_TIMEOUT_MS = 10_000;
export const WEB_FETCH_MAX_SIZE = 50 * 1024;
export const WEB_SEARCH_CACHE_TTL = 5 * 60 * 1000;

/**
 * The stable data directory lives OUTSIDE the Pi-installed clone.
 * Priority:
 *   1. process.env.BLUEPRINT_DATA_DIR (explicit override)
 *   2. ~/.pi/blueprint-flow (stable across pi update)
 *
 * The old per-project path (<cwd>/.pi/blueprint) is detected for migration.
 */
export function resolveDataDir(): string {
	if (process.env.BLUEPRINT_DATA_DIR) {
		const dir = process.env.BLUEPRINT_DATA_DIR;
		mkdirSync(dir, { recursive: true });
		return dir;
	}

	const dir = join(homedir(), ".pi", "blueprint-flow");
	mkdirSync(dir, { recursive: true });
	return dir;
}

/**
 * Returns the path to the SQLite database file.
 */
export function resolveDbPath(): string {
	return join(resolveDataDir(), BLUEPRINT_DB_FILE);
}

/**
 * Returns the path to the artifacts directory.
 */
export function resolveArtifactDir(): string {
	const dir = join(resolveDataDir(), "artifacts");
	mkdirSync(dir, { recursive: true });
	return dir;
}

/**
 * Returns the path to the wiki directory.
 */
export function resolveWikiDir(): string {
	const dir = join(resolveDataDir(), "wiki");
	mkdirSync(dir, { recursive: true });
	return dir;
}

/**
 * Returns the path to the workspaces directory.
 */
export function resolveWorkspacesDir(): string {
	const dir = join(resolveDataDir(), "workspaces");
	mkdirSync(dir, { recursive: true });
	return dir;
}

/** @deprecated Use resolveWorkspacesDir */
export const resolveProjectsDir = resolveWorkspacesDir;

/**
 * Returns the path to the logs directory.
 */
export function resolveLogsDir(): string {
	const dir = join(resolveDataDir(), "logs");
	mkdirSync(dir, { recursive: true });
	return dir;
}

/**
 * Detects the legacy per-project database path.
 * Used for automatic migration.
 */
export function detectLegacyDbPath(cwd: string): string | null {
	const legacyPath = join(cwd, ".pi", "blueprint", "blueprint.sqlite");
	if (existsSync(legacyPath)) {
		return legacyPath;
	}
	return null;
}

// --- Legacy compat wrappers (used by index.ts during transition) ---

/** @deprecated Use resolveDbPath() instead */
export function getDbPath(_cwd: string): string {
	return resolveDbPath();
}

/** @deprecated Use resolveDataDir() instead */
export function getDataDir(_cwd: string): string {
	return resolveDataDir();
}

// --- Flow step definitions ---

export const FLOW_STEPS = [
	"intake",
	"research",
	"interview",
	"spec",
	"ddd",
	"design",
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
	design: "Design",
	behavior: "Behavior Scenarios",
	implementation_plan: "Implementation Plan",
	implementation: "Implementation",
	review: "Review Gate",
	memory_update: "Memory Update",
};

export type StepStatus =
	| "pending"
	| "current"
	| "running"
	| "needs_user"
	| "blocked"
	| "done"
	| "rejected";

export type FlowStatus = "pending" | "in_progress" | "done" | "archived";

/** @deprecated Use FlowStatus */
export type FeatureStatus = FlowStatus;

// --- Workflow Templates ---

export const WORKFLOW_TEMPLATES: Record<string, readonly string[]> = {
	feature: [
		"intake",
		"research",
		"interview",
		"spec",
		"ddd",
		"design",
		"behavior",
		"implementation_plan",
		"implementation",
		"review",
		"memory_update",
	],
	bugfix: [
		"intake",
		"research",
		"spec",
		"implementation",
		"review",
		"memory_update",
	],
	refactor: ["intake", "spec", "implementation", "review", "memory_update"],
	spike: ["intake", "research", "memory_update"],
	research: ["intake", "research", "memory_update"],
	maintenance: ["intake", "implementation", "review", "memory_update"],
};

export const PROJECT_SCOPES = [
	"app",
	"electron_app",
	"website",
	"portfolio",
	"library",
	"cli",
	"api",
] as const;

export type ProjectScope = (typeof PROJECT_SCOPES)[number];

/**
 * Resolves the web source directory (for auto-build detection).
 * Returns the first candidate that contains a package.json.
 */
export function resolveWebSrcDir(): string | null {
	const thisDir = dirname(fileURLToPath(import.meta.url));

	const candidates = [
		join(thisDir, "..", "web"),
		join(thisDir, "..", "..", "web"),
		join(process.cwd(), "extensions", "blueprint-flow", "web"),
	];

	for (const candidate of candidates) {
		if (existsSync(join(candidate, "package.json"))) {
			return candidate;
		}
	}

	return null;
}

/**
 * Checks if the web UI needs a rebuild.
 * Returns true if dist doesn't exist or if src files are newer than dist.
 */
export function webUiNeedsBuild(): boolean {
	const { found } = resolveWebDistPath();
	if (!found) return true;

	// Check if src is newer than dist (simple mtime check on package.json vs dist/index.html)
	const webDir = resolveWebSrcDir();
	if (!webDir) return false;

	const distIndex = join(webDir, "dist", "index.html");
	const srcPkg = join(webDir, "package.json");

	if (!existsSync(distIndex)) return true;

	try {
		const distMtime = statSync(distIndex).mtimeMs;
		const srcMtime = statSync(srcPkg).mtimeMs;
		// If package.json is newer, likely needs rebuild
		return srcMtime > distMtime;
	} catch {
		return false;
	}
}

/**
 * Resolves the web UI dist path by trying multiple candidate locations.
 * Supports BLUEPRINT_WEB_DIST env var for explicit override.
 * Validates that `index.html` actually exists (not just the directory).
 */
export function resolveWebDistPath(): { path: string; found: boolean } {
	// Env var override takes priority
	if (process.env.BLUEPRINT_WEB_DIST) {
		const envPath = process.env.BLUEPRINT_WEB_DIST;
		if (existsSync(join(envPath, "index.html"))) {
			return { path: envPath, found: true };
		}
		return { path: envPath, found: false };
	}

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
