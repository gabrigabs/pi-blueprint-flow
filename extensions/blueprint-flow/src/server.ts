import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import Fastify, { type FastifyInstance } from "fastify";
import { BLUEPRINT_PORT, resolveDataDir, resolveDbPath } from "./config.js";
import { getDb } from "./db.js";
import { bus } from "./events.js";
import { registerActionRunRoutes } from "./routes/action-runs.js";
import { registerActionRoutes } from "./routes/actions.js";
import { registerArtifactRoutes } from "./routes/artifacts.js";
import { registerConfigRoutes } from "./routes/config.js";
import { registerDesignRoutes } from "./routes/design.js";
import { registerFlowRoutes } from "./routes/flows.js";
import { registerImportRoutes } from "./routes/import.js";
import { registerInterviewRoutes } from "./routes/interviews.js";
import { registerWikiRoutes } from "./routes/wiki.js";
import { registerWorkflowRoutes } from "./routes/workflows.js";
import { registerWorkspaceRoutes } from "./routes/workspaces.js";

let server: FastifyInstance | null = null;
const wsClients = new Set<WebSocket>();

const BUILD_INSTRUCTIONS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blueprint Flow — Web UI Not Built</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0a0a0f; color: #e5e7eb; padding: 2rem; max-width: 640px; margin: 0 auto; }
    h1 { color: #f59e0b; }
    code { background: #1f2937; padding: 0.2em 0.5em; border-radius: 4px; font-size: 0.9em; }
    pre { background: #1f2937; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    .status { color: #ef4444; font-weight: 600; }
  </style>
</head>
<body>
  <h1>Blueprint Flow</h1>
  <p class="status">Web UI has not been built yet.</p>
  <p>The Blueprint server is running, but the static web UI files were not found.</p>
  <h2>To fix this:</h2>
  <pre><code>cd extensions/blueprint-flow/web
npm install
npm run build</code></pre>
  <p>Then run <code>/blueprint:ui</code> again in Pi.</p>
  <h2>API is available</h2>
  <p>REST API endpoints at <code>/api/*</code> and WebSocket at <code>/ws</code> are working normally.</p>
  <ul>
    <li><a href="/health">/health</a></li>
    <li><a href="/api/status">/api/status</a></li>
    <li><a href="/api/projects">/api/projects</a></li>
  </ul>
</body>
</html>`;

export async function startServer(
	webDistPath: string,
	webUiFound: boolean,
): Promise<void> {
	if (server) return; // Already running

	server = Fastify({ logger: false });

	await server.register(fastifyWebsocket);

	// Serve static web UI if built
	if (webUiFound) {
		await server.register(fastifyStatic, {
			root: webDistPath,
			prefix: "/",
			index: ["index.html"],
		});
	}

	// --- Diagnostic endpoints ---

	server.get("/health", async () => ({
		status: "ok",
		uptime: process.uptime(),
	}));

	server.get("/api/status", async () => {
		let dbInitialized = false;
		let workspaceCount = 0;
		let flowCount = 0;
		try {
			const database = getDb();
			dbInitialized = true;
			workspaceCount = (
				database
					.prepare(
						"SELECT COUNT(*) as count FROM workspaces WHERE archived = 0",
					)
					.get() as { count: number }
			).count;
			flowCount = (
				database.prepare("SELECT COUNT(*) as count FROM flows").get() as {
					count: number;
				}
			).count;
		} catch {}

		return {
			ok: true,
			port: BLUEPRINT_PORT,
			dbInitialized,
			dataDir: resolveDataDir(),
			dbPath: resolveDbPath(),
			webDistPath,
			webUiFound,
			workspaceCount,
			flowCount,
			version: "0.1.0",
			env: {
				BLUEPRINT_DATA_DIR: process.env.BLUEPRINT_DATA_DIR ?? null,
				BLUEPRINT_WEB_DIST: process.env.BLUEPRINT_WEB_DIST ?? null,
			},
		};
	});

	// --- WebSocket endpoint ---

	server.get("/ws", { websocket: true }, (socket: WebSocket) => {
		wsClients.add(socket);
		socket.addEventListener("close", () => wsClients.delete(socket));

		// Handle client messages (ping/pong heartbeat)
		socket.addEventListener("message", (event) => {
			try {
				const msg = JSON.parse(String(event.data));
				if (msg.type === "ping") {
					socket.send(JSON.stringify({ type: "pong" }));
				}
			} catch {
				// Ignore malformed messages
			}
		});

		try {
			const db = getDb();
			const workspaces = db
				.prepare(
					"SELECT * FROM workspaces WHERE archived = 0 ORDER BY updated_at DESC",
				)
				.all();

			// Import getPiBridge lazily to avoid circular deps at module level
			import("./pi-bridge.js")
				.then(({ getPiBridge }) => {
					const bridge = getPiBridge();
					socket.send(
						JSON.stringify({
							type: "init",
							data: { workspaces, bridgeStatus: bridge.getStatus() },
						}),
					);
				})
				.catch(() => {
					socket.send(JSON.stringify({ type: "init", data: { workspaces } }));
				});
		} catch {
			// DB might not be ready
		}
	});

	const broadcastEvent = (type: string, data: unknown) => {
		const msg = JSON.stringify({ type, data });
		for (const client of wsClients) {
			try {
				client.send(msg);
			} catch {
				wsClients.delete(client);
			}
		}
	};

	const broadcastedEvents = [
		"workspace:created",
		"workspace:updated",
		"workspace:archived",
		"flow:created",
		"flow:updated",
		"step:advanced",
		"step:back",
		"step:status_changed",
		"artifact:saved",
		"artifact:updated",
		"memory:saved",
		"interview:asked",
		"interview:answered",
		"import:started",
		"import:completed",
		"settings:saved",
		"action:created",
		"action:updated",
		"action:event",
		"action:completed",
		"action:failed",
		"action:timeout_info",
		"import:pi_analysis_requested",
		"config:updated",
	] as const;

	for (const event of broadcastedEvents) {
		bus.on(event, (data) => broadcastEvent(event, data));
	}

	// --- REST API: Read endpoints ---

	server.get("/api/workspaces", async () => {
		const db = getDb();
		return db
			.prepare(
				`SELECT w.*, COUNT(f.id) as flow_count
         FROM workspaces w
         LEFT JOIN flows f ON f.workspace_id = w.id
         WHERE w.archived = 0
         GROUP BY w.id
         ORDER BY w.updated_at DESC`,
			)
			.all();
	});

	server.get<{ Params: { id: string } }>(
		"/api/workspaces/:id",
		async (req, reply) => {
			const db = getDb();
			const workspace = db
				.prepare("SELECT * FROM workspaces WHERE id = ?")
				.get(req.params.id);
			if (!workspace) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Workspace not found" });
			}
			return workspace;
		},
	);

	server.get<{ Params: { workspaceId: string } }>(
		"/api/workspaces/:workspaceId/flows",
		async (req) => {
			const db = getDb();
			return db
				.prepare(
					"SELECT * FROM flows WHERE workspace_id = ? ORDER BY updated_at DESC",
				)
				.all(req.params.workspaceId);
		},
	);

	server.get<{ Params: { id: string } }>(
		"/api/flows/:id",
		async (req, reply) => {
			const db = getDb();
			const flow = db
				.prepare("SELECT * FROM flows WHERE id = ?")
				.get(req.params.id);
			if (!flow) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Flow not found" });
			}
			return flow;
		},
	);

	server.get<{ Params: { flowId: string } }>(
		"/api/flows/:flowId/steps",
		async (req) => {
			const db = getDb();
			return db
				.prepare("SELECT * FROM steps WHERE flow_id = ? ORDER BY rowid")
				.all(req.params.flowId);
		},
	);

	server.get<{ Params: { flowId: string } }>(
		"/api/flows/:flowId/artifacts",
		async (req) => {
			const db = getDb();
			return db
				.prepare(
					"SELECT id, flow_id, step_name, type, filename, created_at FROM artifacts WHERE flow_id = ? ORDER BY created_at DESC",
				)
				.all(req.params.flowId);
		},
	);

	server.get<{ Params: { id: string } }>(
		"/api/artifacts/:id",
		async (req, reply) => {
			const db = getDb();
			const artifact = db
				.prepare("SELECT * FROM artifacts WHERE id = ?")
				.get(req.params.id);
			if (!artifact) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Artifact not found" });
			}
			return artifact;
		},
	);

	server.get<{ Params: { flowId: string } }>(
		"/api/flows/:flowId/interviews",
		async (req) => {
			const db = getDb();
			const rows = db
				.prepare(
					"SELECT * FROM interviews WHERE flow_id = ? ORDER BY created_at ASC",
				)
				.all(req.params.flowId) as any[];

			return rows.map((r) => ({
				...r,
				options: r.options ? JSON.parse(r.options) : null,
			}));
		},
	);

	server.get<{ Params: { workspaceId: string } }>(
		"/api/workspaces/:workspaceId/memories",
		async (req) => {
			const db = getDb();
			return db
				.prepare(
					"SELECT * FROM memories WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50",
				)
				.all(req.params.workspaceId);
		},
	);

	server.get<{ Params: { flowId: string } }>(
		"/api/flows/:flowId/settings",
		async (req) => {
			const db = getDb();
			return (
				db
					.prepare(
						"SELECT * FROM agent_run_settings WHERE flow_id = ? ORDER BY created_at DESC LIMIT 1",
					)
					.get(req.params.flowId) ?? null
			);
		},
	);

	// --- REST API: Write endpoints ---

	registerWorkspaceRoutes(server);
	registerFlowRoutes(server);
	registerActionRoutes(server);
	registerActionRunRoutes(server);
	registerArtifactRoutes(server);
	registerDesignRoutes(server);
	registerImportRoutes(server);
	registerInterviewRoutes(server);
	registerConfigRoutes(server);
	registerWikiRoutes(server);
	registerWorkflowRoutes(server);

	// --- SPA Fallback / Not Found Handler ---

	server.setNotFoundHandler((req, reply) => {
		if (req.url.startsWith("/api/") || req.url === "/ws") {
			return reply.code(404).send({ error: "Not Found", statusCode: 404 });
		}

		if (webUiFound) {
			return reply.sendFile("index.html");
		}

		return reply
			.code(503)
			.header("content-type", "text/html; charset=utf-8")
			.send(BUILD_INSTRUCTIONS_HTML);
	});

	// Clean up stale action runs from previous sessions
	try {
		const db = getDb();
		const staleStatuses = [
			"created",
			"queued",
			"waiting_for_pi",
			"injected",
			"agent_running",
			"tool_running",
			"needs_user",
			"saving_artifacts",
		];
		const placeholders = staleStatuses.map(() => "?").join(",");
		const now = new Date().toISOString().replace("T", " ").slice(0, 19);
		db.prepare(
			`UPDATE action_runs SET status = 'cancelled', completed_at = ? WHERE status IN (${placeholders})`,
		).run(now, ...staleStatuses);
		db.prepare(
			"UPDATE steps SET status = 'current' WHERE status = 'running'",
		).run();
	} catch {}

	// Start listening
	await server.listen({ port: BLUEPRINT_PORT, host: "127.0.0.1" });
	bus.emit("server:started", { port: BLUEPRINT_PORT });
}

export async function stopServer(): Promise<void> {
	if (!server) return;

	for (const client of wsClients) {
		try {
			client.close();
		} catch {}
	}
	wsClients.clear();

	await server.close();
	server = null;
	bus.emit("server:stopped", {});
}
