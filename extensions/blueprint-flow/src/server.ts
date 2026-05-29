import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import { existsSync } from "node:fs";
import { BLUEPRINT_PORT } from "./config.js";
import { getDb } from "./db.js";
import { bus } from "./events.js";
import type { Feature, Project, Artifact, Memory, Interview, Step } from "./db.js";

let server: ReturnType<typeof Fastify> | null = null;
const wsClients = new Set<any>();

export async function startServer(webDistPath: string): Promise<void> {
  if (server) return; // Already running

  server = Fastify({ logger: false });

  await server.register(fastifyWebsocket);

  // Serve static web UI if built
  if (existsSync(webDistPath)) {
    await server.register(fastifyStatic, {
      root: webDistPath,
      prefix: "/",
    });
  }

  // WebSocket endpoint
  server.get("/ws", { websocket: true }, (socket) => {
    wsClients.add(socket);
    socket.on("close", () => wsClients.delete(socket));

    // Send initial state
    try {
      const db = getDb();
      const projects = db.prepare("SELECT * FROM projects ORDER BY updated_at DESC").all();
      socket.send(JSON.stringify({ type: "init", data: { projects } }));
    } catch {
      // DB might not be ready
    }
  });

  // Broadcast events to all WebSocket clients
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

  // Subscribe to bus events for real-time updates
  bus.on("project:created", (data) => broadcastEvent("project:created", data));
  bus.on("feature:created", (data) => broadcastEvent("feature:created", data));
  bus.on("feature:updated", (data) => broadcastEvent("feature:updated", data));
  bus.on("step:advanced", (data) => broadcastEvent("step:advanced", data));
  bus.on("artifact:saved", (data) => broadcastEvent("artifact:saved", data));
  bus.on("memory:saved", (data) => broadcastEvent("memory:saved", data));
  bus.on("interview:asked", (data) => broadcastEvent("interview:asked", data));
  bus.on("interview:answered", (data) => broadcastEvent("interview:answered", data));

  // --- REST API ---

  // Projects
  server.get("/api/projects", async () => {
    const db = getDb();
    return db
      .prepare(
        `SELECT p.*, COUNT(f.id) as feature_count
         FROM projects p
         LEFT JOIN features f ON f.project_id = p.id
         GROUP BY p.id
         ORDER BY p.updated_at DESC`
      )
      .all();
  });

  server.get<{ Params: { id: string } }>("/api/projects/:id", async (req) => {
    const db = getDb();
    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
    if (!project) return { error: "not_found" };
    return project;
  });

  // Features
  server.get<{ Params: { projectId: string } }>("/api/projects/:projectId/features", async (req) => {
    const db = getDb();
    return db
      .prepare("SELECT * FROM features WHERE project_id = ? ORDER BY updated_at DESC")
      .all(req.params.projectId);
  });

  server.get<{ Params: { id: string } }>("/api/features/:id", async (req) => {
    const db = getDb();
    const feature = db.prepare("SELECT * FROM features WHERE id = ?").get(req.params.id);
    if (!feature) return { error: "not_found" };
    return feature;
  });

  // Steps
  server.get<{ Params: { featureId: string } }>("/api/features/:featureId/steps", async (req) => {
    const db = getDb();
    return db
      .prepare("SELECT * FROM steps WHERE feature_id = ? ORDER BY rowid")
      .all(req.params.featureId);
  });

  // Artifacts
  server.get<{ Params: { featureId: string } }>("/api/features/:featureId/artifacts", async (req) => {
    const db = getDb();
    return db
      .prepare("SELECT id, feature_id, step_name, type, filename, created_at FROM artifacts WHERE feature_id = ? ORDER BY created_at DESC")
      .all(req.params.featureId);
  });

  server.get<{ Params: { id: string } }>("/api/artifacts/:id", async (req) => {
    const db = getDb();
    const artifact = db.prepare("SELECT * FROM artifacts WHERE id = ?").get(req.params.id);
    if (!artifact) return { error: "not_found" };
    return artifact;
  });

  // Interviews
  server.get<{ Params: { featureId: string } }>("/api/features/:featureId/interviews", async (req) => {
    const db = getDb();
    return db
      .prepare("SELECT * FROM interviews WHERE feature_id = ? ORDER BY created_at ASC")
      .all(req.params.featureId);
  });

  // Memories
  server.get<{ Params: { projectId: string } }>("/api/projects/:projectId/memories", async (req) => {
    const db = getDb();
    return db
      .prepare("SELECT * FROM memories WHERE project_id = ? ORDER BY created_at DESC LIMIT 50")
      .all(req.params.projectId);
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
