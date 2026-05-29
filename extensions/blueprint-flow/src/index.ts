import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { initDb, closeDb } from "./db.js";
import { getDbPath, getDataDir } from "./config.js";
import { bus } from "./events.js";

// Tools
import { createProjectTool, listProjectsTool } from "./tools/project.js";
import { createFeatureTool, listFeaturesTool } from "./tools/feature.js";
import { getFlowStateTool, advanceStepTool, resetStepTool } from "./tools/flow.js";

export default function (pi: ExtensionAPI) {
  const cwd = process.cwd();

  // Initialize database on session start
  pi.on("session_start", async () => {
    const dbPath = getDbPath(cwd);
    initDb(dbPath);
  });

  // Cleanup on session end
  pi.on("agent_end", async () => {
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

  // Register commands (will be expanded in checkpoint 6)
  pi.registerCommand("blueprint:init", {
    description: "Initialize a new Blueprint project",
    handler: async (args, ctx) => {
      ctx.ui.notify("Use blueprint_create_project tool to create a project.");
    },
  });

  pi.registerCommand("blueprint:status", {
    description: "Show current flow state",
    handler: async (args, ctx) => {
      ctx.ui.notify("Use blueprint_get_flow_state tool with a feature ID.");
    },
  });
}
