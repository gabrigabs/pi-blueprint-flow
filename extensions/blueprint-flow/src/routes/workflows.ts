import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import type { WorkflowStep } from "../db.js";
import {
	createWorkflow,
	deleteWorkflow,
	getWorkflow,
	getWorkspaceWorkflow,
	listWorkflows,
	parseWorkflowSteps,
	setWorkspaceWorkflow,
	updateWorkflow,
} from "../db.js";
import { bus } from "../events.js";

export function registerWorkflowRoutes(app: FastifyInstance): void {
	// List workflows (optionally filtered by workspace)
	app.get<{ Querystring: { workspaceId?: string } }>(
		"/api/workflows",
		async (req, reply) => {
			const workflows = listWorkflows(req.query.workspaceId);
			return reply.send(
				workflows.map((w) => ({
					...w,
					steps: parseWorkflowSteps(w),
				})),
			);
		},
	);

	// Get single workflow
	app.get<{ Params: { id: string } }>(
		"/api/workflows/:id",
		async (req, reply) => {
			const workflow = getWorkflow(req.params.id);
			if (!workflow) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Workflow not found" });
			}
			return reply.send({ ...workflow, steps: parseWorkflowSteps(workflow) });
		},
	);

	// Get workspace's active workflow
	app.get<{ Params: { workspaceId: string } }>(
		"/api/workspaces/:workspaceId/workflow",
		async (req, reply) => {
			const workflow = getWorkspaceWorkflow(req.params.workspaceId);
			return reply.send({ ...workflow, steps: parseWorkflowSteps(workflow) });
		},
	);

	// Create a new workflow
	app.post<{
		Body: {
			workspaceId?: string;
			name: string;
			description?: string;
			steps: WorkflowStep[];
		};
	}>("/api/workflows", async (req, reply) => {
		const { workspaceId, name, description, steps } = req.body;

		if (!name || typeof name !== "string" || !name.trim()) {
			return reply
				.code(400)
				.send({ error: "validation", message: "name is required" });
		}

		if (!steps || !Array.isArray(steps) || steps.length === 0) {
			return reply.code(400).send({
				error: "validation",
				message: "steps must be a non-empty array",
			});
		}

		// Validate step structure
		for (const step of steps) {
			if (!step.name || !step.label) {
				return reply.code(400).send({
					error: "validation",
					message: "Each step must have a name and label",
				});
			}
		}

		const id = nanoid(12);
		const workflow = createWorkflow({
			id,
			workspaceId: workspaceId ?? null,
			name: name.trim(),
			description: description?.trim(),
			steps,
		});

		return reply
			.code(201)
			.send({ ...workflow, steps: parseWorkflowSteps(workflow) });
	});

	// Update a workflow
	app.patch<{
		Params: { id: string };
		Body: { name?: string; description?: string; steps?: WorkflowStep[] };
	}>("/api/workflows/:id", async (req, reply) => {
		const { name, description, steps } = req.body;

		if (steps && (!Array.isArray(steps) || steps.length === 0)) {
			return reply.code(400).send({
				error: "validation",
				message: "steps must be a non-empty array",
			});
		}

		if (steps) {
			for (const step of steps) {
				if (!step.name || !step.label) {
					return reply.code(400).send({
						error: "validation",
						message: "Each step must have a name and label",
					});
				}
			}
		}

		const workflow = updateWorkflow(req.params.id, {
			name,
			description,
			steps,
		});
		if (!workflow) {
			return reply
				.code(404)
				.send({ error: "not_found", message: "Workflow not found" });
		}

		return reply.send({ ...workflow, steps: parseWorkflowSteps(workflow) });
	});

	// Delete a workflow
	app.delete<{ Params: { id: string } }>(
		"/api/workflows/:id",
		async (req, reply) => {
			const deleted = deleteWorkflow(req.params.id);
			if (!deleted) {
				return reply.code(400).send({
					error: "cannot_delete",
					message: "Cannot delete this workflow (default or not found)",
				});
			}
			return reply.send({ success: true });
		},
	);

	// Assign workflow to workspace
	app.post<{
		Params: { workspaceId: string };
		Body: { workflowId: string };
	}>("/api/workspaces/:workspaceId/workflow", async (req, reply) => {
		const { workspaceId } = req.params;
		const { workflowId } = req.body;

		if (!workflowId) {
			return reply
				.code(400)
				.send({ error: "validation", message: "workflowId is required" });
		}

		const workflow = getWorkflow(workflowId);
		if (!workflow) {
			return reply
				.code(404)
				.send({ error: "not_found", message: "Workflow not found" });
		}

		setWorkspaceWorkflow(workspaceId, workflowId);
		bus.emit("workspace:updated", { id: workspaceId });

		return reply.send({ success: true, workflowId });
	});
}
