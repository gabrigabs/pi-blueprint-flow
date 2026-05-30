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
import { registerFeatureRoutes } from "./routes/features.js";
import { registerImportRoutes } from "./routes/import.js";
import { registerInterviewRoutes } from "./routes/interviews.js";
import { registerProjectRoutes } from "./routes/projects.js";
import { registerWikiRoutes } from "./routes/wiki.js";
import { registerWorkflowRoutes } from "./routes/workflows.js";

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
		let projectCount = 0;
		let featureCount = 0;
		try {
			const database = getDb();
			dbInitialized = true;
			projectCount = (
				database
					.prepare("SELECT COUNT(*) as count FROM projects WHERE archived = 0")
					.get() as { count: number }
			).count;
			featureCount = (
				database.prepare("SELECT COUNT(*) as count FROM features").get() as {
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
			projectCount,
			featureCount,
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
			const projects = db
				.prepare(
					"SELECT * FROM projects WHERE archived = 0 ORDER BY updated_at DESC",
				)
				.all();

			// Import getPiBridge lazily to avoid circular deps at module level
			import("./pi-bridge.js")
				.then(({ getPiBridge }) => {
					const bridge = getPiBridge();
					socket.send(
						JSON.stringify({
							type: "init",
							data: { projects, bridgeStatus: bridge.getStatus() },
						}),
					);
				})
				.catch(() => {
					socket.send(JSON.stringify({ type: "init", data: { projects } }));
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
		"project:created",
		"project:updated",
		"project:archived",
		"feature:created",
		"feature:updated",
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
		"import:pi_analysis_requested",
		"config:updated",
	] as const;

	for (const event of broadcastedEvents) {
		bus.on(event, (data) => broadcastEvent(event, data));
	}

	// --- REST API: Read endpoints ---

	server.get("/api/projects", async () => {
		const db = getDb();
		return db
			.prepare(
				`SELECT p.*, COUNT(f.id) as feature_count
         FROM projects p
         LEFT JOIN features f ON f.project_id = p.id
         WHERE p.archived = 0
         GROUP BY p.id
         ORDER BY p.updated_at DESC`,
			)
			.all();
	});

	server.get<{ Params: { id: string } }>(
		"/api/projects/:id",
		async (req, reply) => {
			const db = getDb();
			const project = db
				.prepare("SELECT * FROM projects WHERE id = ?")
				.get(req.params.id);
			if (!project) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Project not found" });
			}
			return project;
		},
	);

	server.get<{ Params: { projectId: string } }>(
		"/api/projects/:projectId/features",
		async (req) => {
			const db = getDb();
			return db
				.prepare(
					"SELECT * FROM features WHERE project_id = ? ORDER BY updated_at DESC",
				)
				.all(req.params.projectId);
		},
	);

	server.get<{ Params: { id: string } }>(
		"/api/features/:id",
		async (req, reply) => {
			const db = getDb();
			const feature = db
				.prepare("SELECT * FROM features WHERE id = ?")
				.get(req.params.id);
			if (!feature) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Feature not found" });
			}
			return feature;
		},
	);

	server.get<{ Params: { featureId: string } }>(
		"/api/features/:featureId/steps",
		async (req) => {
			const db = getDb();
			return db
				.prepare("SELECT * FROM steps WHERE feature_id = ? ORDER BY rowid")
				.all(req.params.featureId);
		},
	);

	server.get<{ Params: { featureId: string } }>(
		"/api/features/:featureId/artifacts",
		async (req) => {
			const db = getDb();
			return db
				.prepare(
					"SELECT id, feature_id, step_name, type, filename, created_at FROM artifacts WHERE feature_id = ? ORDER BY created_at DESC",
				)
				.all(req.params.featureId);
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

	server.get<{ Params: { featureId: string } }>(
		"/api/features/:featureId/interviews",
		async (req) => {
			const db = getDb();
			const rows = db
				.prepare(
					"SELECT * FROM interviews WHERE feature_id = ? ORDER BY created_at ASC",
				)
				.all(req.params.featureId) as any[];

			return rows.map((r) => ({
				...r,
				options: r.options ? JSON.parse(r.options) : null,
			}));
		},
	);

	server.get<{ Params: { projectId: string } }>(
		"/api/projects/:projectId/memories",
		async (req) => {
			const db = getDb();
			return db
				.prepare(
					"SELECT * FROM memories WHERE project_id = ? ORDER BY created_at DESC LIMIT 50",
				)
				.all(req.params.projectId);
		},
	);

	server.get<{ Params: { featureId: string } }>(
		"/api/features/:featureId/settings",
		async (req) => {
			const db = getDb();
			return (
				db
					.prepare(
						"SELECT * FROM agent_run_settings WHERE feature_id = ? ORDER BY created_at DESC LIMIT 1",
					)
					.get(req.params.featureId) ?? null
			);
		},
	);

	// --- REST API: Write endpoints ---

	registerProjectRoutes(server);
	registerFeatureRoutes(server);
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
