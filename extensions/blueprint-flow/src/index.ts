import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	BLUEPRINT_PORT,
	detectLegacyDbPath,
	FLOW_STEPS,
	resolveDataDir,
	resolveDbPath,
	resolveWebDistPath,
	resolveWebSrcDir,
	STEP_LABELS,
	webUiNeedsBuild,
} from "./config.js";
import type { Feature } from "./db.js";
import { closeDb, getDb, initDb, migrateFromLegacyDb } from "./db.js";
import { bus } from "./events.js";
import { startServer, stopServer } from "./server.js";
import { setPiRef } from "./services/pi-config-reader.js";
import { registerPiEventListeners } from "./services/pi-event-listener.js";
import { readArtifactTool, saveArtifactTool } from "./tools/artifacts.js";
import { createFeatureTool, listFeaturesTool } from "./tools/feature.js";
import {
	advanceStepTool,
	getFlowStateTool,
	resetStepTool,
} from "./tools/flow.js";
import {
	askInterviewTool,
	getInterviewHistoryTool,
} from "./tools/interview.js";
import { saveMemoryTool, searchMemoryTool } from "./tools/memory.js";
// Tools
import { createProjectTool, listProjectsTool } from "./tools/project.js";
import { researchRepoTool } from "./tools/research-repo.js";
import { researchWebTool } from "./tools/research-web.js";
import { reviewGateTool } from "./tools/review-gate.js";
import {
	memoryAddFactTool,
	memoryRetrieveContextTool,
	wikiSearchTool,
	wikiUpsertPageTool,
} from "./tools/wiki.js";

export default function (pi: ExtensionAPI) {
	const cwd = process.cwd();

	// Store Pi reference for config/model access
	setPiRef(pi);

	// Register Pi event listeners for action run tracking
	registerPiEventListeners(pi);

	// Initialize database on session start
	pi.on("session_start", async () => {
		const dbPath = resolveDbPath();

		// Auto-migrate from legacy per-project path if it exists
		const legacyPath = detectLegacyDbPath(cwd);
		if (legacyPath) {
			const migrated = migrateFromLegacyDb(legacyPath, dbPath);
			if (migrated) {
				pi.sendUserMessage(
					`[Blueprint] Migrated data from legacy path (${legacyPath}) to stable location (${dbPath}). Your projects and memories are safe.`,
				);
			}
		}

		initDb(dbPath);
	});

	// Cleanup on session end
	pi.on("agent_end", async () => {
		await stopServer();
		closeDb();
		bus.removeAll();
	});

	// Register tools
	pi.registerTool(createProjectTool);
	pi.registerTool(listProjectsTool);
	pi.registerTool(createFeatureTool);
	pi.registerTool(listFeaturesTool);
	pi.registerTool(getFlowStateTool);
	pi.registerTool(advanceStepTool);
	pi.registerTool(resetStepTool);
	pi.registerTool(saveArtifactTool);
	pi.registerTool(readArtifactTool);
	pi.registerTool(askInterviewTool);
	pi.registerTool(getInterviewHistoryTool);
	pi.registerTool(saveMemoryTool);
	pi.registerTool(searchMemoryTool);
	pi.registerTool(researchRepoTool);
	pi.registerTool(researchWebTool);
	pi.registerTool(reviewGateTool);
	pi.registerTool(wikiUpsertPageTool);
	pi.registerTool(wikiSearchTool);
	pi.registerTool(memoryAddFactTool);
	pi.registerTool(memoryRetrieveContextTool);

	// --- Commands ---

	pi.registerCommand("blueprint:init", {
		description: "Initialize a new Blueprint project interactively",
		handler: async (args, ctx) => {
			const name = args?.trim() || (await ctx.ui.input("Project name:"));
			if (!name) {
				ctx.ui.notify("Cancelled — no project name provided.");
				return;
			}
			pi.sendUserMessage(
				`Create a new Blueprint project named "${name}". Use the blueprint_create_project tool.`,
			);
		},
	});

	pi.registerCommand("blueprint:ui", {
		description: "Start the Blueprint web cockpit",
		handler: async (_args, ctx) => {
			try {
				const dbPath = resolveDbPath();
				initDb(dbPath);

				// Auto-build web UI if needed
				if (webUiNeedsBuild()) {
					const webDir = resolveWebSrcDir();
					if (webDir) {
						ctx.ui.notify(
							"[Blueprint] Web UI not built — building automatically...",
						);
						try {
							const { execSync } = await import("node:child_process");
							execSync("npm install && npm run build", {
								cwd: webDir,
								stdio: "pipe",
								timeout: 120_000,
							});
							ctx.ui.notify("[Blueprint] Web UI built successfully.");
						} catch (buildErr: any) {
							const stderr = buildErr?.stderr?.toString?.() ?? "";
							ctx.ui.notify(
								`[Blueprint] Auto-build failed. Run manually: cd ${webDir} && npm install && npm run build\n${stderr.slice(0, 300)}`,
							);
						}
					}
				}

				const { path: webDist, found: webUiFound } = resolveWebDistPath();
				await startServer(webDist, webUiFound);

				if (webUiFound) {
					ctx.ui.notify(
						`Blueprint cockpit running at http://localhost:${BLUEPRINT_PORT}`,
					);
				} else {
					ctx.ui.notify(
						`Blueprint server running at http://localhost:${BLUEPRINT_PORT}, but web UI not found at ${webDist}. Run: cd extensions/blueprint-flow/web && npm install && npm run build`,
					);
				}
			} catch (err: any) {
				ctx.ui.notify(`Failed to start server: ${err.message}`);
			}
		},
	});

	pi.registerCommand("blueprint:feature", {
		description: "Create a new feature (usage: /blueprint:feature <title>)",
		handler: async (args, ctx) => {
			const title = args?.trim();
			if (!title) {
				ctx.ui.notify("Usage: /blueprint:feature <feature title>");
				return;
			}
			pi.sendUserMessage(
				`Create a new Blueprint feature titled "${title}". First list projects with blueprint_list_projects, then use blueprint_create_feature with the appropriate project.`,
			);
		},
	});

	pi.registerCommand("blueprint:status", {
		description: "Show current flow state for active feature",
		handler: async (_args, ctx) => {
			pi.sendUserMessage(
				"Show the flow state for the most recently updated in-progress feature. Use blueprint_list_projects, then blueprint_list_features, then blueprint_get_flow_state.",
			);
		},
	});

	pi.registerCommand("blueprint:advance", {
		description: "Advance the current feature to the next step",
		handler: async (args, ctx) => {
			const summary = args?.trim() || undefined;
			pi.sendUserMessage(
				`Advance the current feature to the next step${summary ? ` with summary: "${summary}"` : ""}. Find the active feature and use blueprint_advance_step.`,
			);
		},
	});

	pi.registerCommand("blueprint:artifacts", {
		description: "List artifacts for the current feature",
		handler: async (_args, ctx) => {
			pi.sendUserMessage(
				"List all artifacts for the most recently updated in-progress feature. Use blueprint_list_projects, blueprint_list_features, then blueprint_read_artifact.",
			);
		},
	});

	pi.registerCommand("blueprint:memory", {
		description: "Search project memory (usage: /blueprint:memory <query>)",
		handler: async (args, ctx) => {
			const query = args?.trim() || "";
			pi.sendUserMessage(
				`Search Blueprint memory for: "${query}". Use blueprint_list_projects then blueprint_search_memory.`,
			);
		},
	});

	pi.registerCommand("blueprint:interview", {
		description: "Start or resume an interview for the current feature",
		handler: async (_args, ctx) => {
			pi.sendUserMessage(
				"Start or resume the interview for the current in-progress feature. Use blueprint_get_interview_history to see what's been asked, then use blueprint_ask_interview to ask adaptive follow-up questions.",
			);
		},
	});

	pi.registerCommand("blueprint:research", {
		description: "Run repository research (usage: /blueprint:research <query>)",
		handler: async (args, ctx) => {
			const query = args?.trim();
			if (!query) {
				ctx.ui.notify("Usage: /blueprint:research <search query>");
				return;
			}
			pi.sendUserMessage(
				`Research the repository for: "${query}". Use blueprint_research_repo with grep mode.`,
			);
		},
	});

	pi.registerCommand("blueprint:review", {
		description: "Run the review gate for the current feature",
		handler: async (_args, ctx) => {
			pi.sendUserMessage(
				"Run the review gate for the current in-progress feature. Use blueprint_list_projects, blueprint_list_features, then blueprint_review_gate.",
			);
		},
	});

	pi.registerCommand("blueprint:reset", {
		description:
			"Reset feature to a step (usage: /blueprint:reset <step_name>)",
		handler: async (args, ctx) => {
			const step = args?.trim();
			if (!step || !FLOW_STEPS.includes(step as any)) {
				ctx.ui.notify(
					`Usage: /blueprint:reset <step>\nValid steps: ${FLOW_STEPS.join(", ")}`,
				);
				return;
			}
			pi.sendUserMessage(
				`Reset the current feature back to the "${step}" step. Find the active feature and use blueprint_reset_step.`,
			);
		},
	});

	pi.registerCommand("blueprint:doctor", {
		description: "Diagnose Blueprint Flow health: paths, DB, UI, port",
		handler: async (_args, ctx) => {
			const dataDir = resolveDataDir();
			const dbPath = resolveDbPath();
			const { path: webDist, found: webUiFound } = resolveWebDistPath();
			const legacyPath = detectLegacyDbPath(cwd);

			let dbOk = false;
			let projectCount = 0;
			let featureCount = 0;
			let lastError: string | null = null;

			try {
				const database = getDb();
				dbOk = true;
				projectCount = (
					database
						.prepare(
							"SELECT COUNT(*) as count FROM projects WHERE archived = 0",
						)
						.get() as { count: number }
				).count;
				featureCount = (
					database.prepare("SELECT COUNT(*) as count FROM features").get() as {
						count: number;
					}
				).count;
			} catch (err: any) {
				lastError = err?.message ?? "DB not initialized";
			}

			const portInUse = await checkPort(BLUEPRINT_PORT);

			const lines = [
				"=== Blueprint Flow Doctor ===",
				"",
				`Data directory:    ${dataDir}`,
				`Database path:     ${dbPath}`,
				`Database status:   ${dbOk ? "OK" : `ERROR: ${lastError}`}`,
				`Projects:          ${projectCount}`,
				`Features:          ${featureCount}`,
				"",
				`Web dist path:     ${webDist}`,
				`Web UI found:      ${webUiFound ? "YES" : "NO — run: cd extensions/blueprint-flow/web && npm install && npm run build"}`,
				`Port ${BLUEPRINT_PORT}:          ${portInUse ? "IN USE (server running)" : "FREE"}`,
				"",
				`Legacy DB found:   ${legacyPath ?? "none"}`,
				`BLUEPRINT_DATA_DIR: ${process.env.BLUEPRINT_DATA_DIR ?? "(not set)"}`,
				`BLUEPRINT_WEB_DIST: ${process.env.BLUEPRINT_WEB_DIST ?? "(not set)"}`,
				"",
				`Version:           0.1.0`,
				`Pi install path:   ${import.meta.url}`,
			];

			ctx.ui.notify(lines.join("\n"));
		},
	});
}

/** Check if a port is in use by attempting a connection */
function checkPort(port: number): Promise<boolean> {
	return new Promise((resolve) => {
		import("node:net").then(({ createConnection }) => {
			const socket = createConnection({ port, host: "127.0.0.1" });
			socket.setTimeout(500);
			socket.on("connect", () => {
				socket.destroy();
				resolve(true);
			});
			socket.on("timeout", () => {
				socket.destroy();
				resolve(false);
			});
			socket.on("error", () => {
				resolve(false);
			});
		});
	});
}
