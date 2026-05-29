import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	BLUEPRINT_PORT,
	FLOW_STEPS,
	getDataDir,
	getDbPath,
	STEP_LABELS,
} from "./config.js";
import type { Feature } from "./db.js";
import { closeDb, getDb, initDb } from "./db.js";
import { bus } from "./events.js";
import { startServer, stopServer } from "./server.js";
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

export default function (pi: ExtensionAPI) {
	const cwd = process.cwd();

	// Initialize database on session start
	pi.on("session_start", async () => {
		const dbPath = getDbPath(cwd);
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
				const dbPath = getDbPath(cwd);
				initDb(dbPath);
				const baseDir = dirname(fileURLToPath(import.meta.url));
				const webDist = join(baseDir, "..", "web", "dist");
				await startServer(webDist);
				ctx.ui.notify(
					`Blueprint cockpit running at http://localhost:${BLUEPRINT_PORT}`,
				);
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
}
