import { basename } from "node:path";
import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { getDb } from "../db.js";
import { bus } from "../events.js";
import { getPiBridge } from "../pi-bridge.js";
import { detectAgenticFiles } from "../services/agentic-detector.js";
import {
	generateProjectProfile,
	scanRepoStructure,
} from "../services/import-scanner.js";
import { validateRepoPath } from "../services/path-validator.js";
import { detectScripts, detectStack } from "../services/stack-detector.js";
import type { ImportProjectInput } from "../types.js";
import { buildRunSettings, IMPORT_MODES } from "../types.js";

export function registerImportRoutes(app: FastifyInstance): void {
	app.post<{ Body: ImportProjectInput }>(
		"/api/projects/import",
		async (req, reply) => {
			const { repoPath, name, mode, agentRunSettings } = req.body;

			if (!repoPath || typeof repoPath !== "string") {
				return reply
					.code(400)
					.send({ error: "validation", message: "repoPath is required" });
			}

			if (!mode || !IMPORT_MODES.includes(mode)) {
				return reply.code(400).send({
					error: "validation",
					message: `mode must be one of: ${IMPORT_MODES.join(", ")}`,
				});
			}

			const validation = validateRepoPath(repoPath);
			if (!validation.valid) {
				return reply
					.code(400)
					.send({ error: "validation", message: validation.error });
			}

			const resolvedPath = validation.resolvedPath;
			const projectName = name?.trim() || basename(resolvedPath);

			const reportId = nanoid(12);
			bus.emit("import:started", { id: reportId, repoPath: resolvedPath });

			const stack = detectStack(resolvedPath);
			const scripts = detectScripts(resolvedPath);
			const structure = scanRepoStructure(resolvedPath);
			const agenticFiles = detectAgenticFiles(resolvedPath);

			const projectProfile = generateProjectProfile({
				name: projectName,
				repoPath: resolvedPath,
				stack,
				scripts,
				structure,
				agenticFiles,
			});

			const db = getDb();
			let workspaceId: string | null = null;

			if (mode === "analyze_only") {
				db.prepare(
					`INSERT INTO import_reports
         (id, workspace_id, repo_path, mode, status, detected_stack, detected_scripts, detected_agentic_files, project_profile)
         VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?)`,
				).run(
					reportId,
					null,
					resolvedPath,
					mode,
					JSON.stringify(stack),
					JSON.stringify(scripts),
					JSON.stringify(
						agenticFiles.map((f) => ({
							relativePath: f.relativePath,
							type: f.type,
							size: f.size,
							rulesCount: f.extractedRules.length,
						})),
					),
					projectProfile,
				);
			} else {
				workspaceId = nanoid(12);
				const stackArray = [...stack.languages, ...stack.frameworks];

				db.prepare(
					"INSERT INTO workspaces (id, name, description, repo_path, stack) VALUES (?, ?, ?, ?, ?)",
				).run(
					workspaceId,
					projectName,
					`Imported from ${resolvedPath}`,
					resolvedPath,
					JSON.stringify(stackArray),
				);

				db.prepare(
					`INSERT INTO import_reports
         (id, workspace_id, repo_path, mode, status, detected_stack, detected_scripts, detected_agentic_files, project_profile)
         VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?)`,
				).run(
					reportId,
					workspaceId,
					resolvedPath,
					mode,
					JSON.stringify(stack),
					JSON.stringify(scripts),
					JSON.stringify(
						agenticFiles.map((f) => ({
							relativePath: f.relativePath,
							type: f.type,
							size: f.size,
							rulesCount: f.extractedRules.length,
						})),
					),
					projectProfile,
				);

				if (agentRunSettings) {
					const settings = buildRunSettings(agentRunSettings);
					const settingsId = nanoid(12);
					db.prepare(
						`INSERT INTO agent_run_settings
           (id, flow_id, effort_level, execution_mode, model_id, agent_profile,
            allow_web_research, allow_repo_scan, allow_memory_search,
            max_research_results, max_interview_questions, review_strictness)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					).run(
						settingsId,
						null,
						settings.effortLevel,
						settings.executionMode,
						settings.modelId ?? null,
						settings.agentProfile ?? null,
						settings.allowWebResearch ? 1 : 0,
						settings.allowRepoScan ? 1 : 0,
						settings.allowMemorySearch ? 1 : 0,
						settings.maxResearchResults ?? null,
						settings.maxInterviewQuestions ?? null,
						settings.reviewStrictness,
					);
				}

				bus.emit("workspace:created", { id: workspaceId, name: projectName });
			}

			bus.emit("import:completed", { id: reportId, workspaceId });

			// Trigger Pi agent analysis for migrate_with_review mode
			let actionRunId: string | null = null;
			let actionStatus: string | null = null;

			if (mode === "migrate_with_review" && workspaceId) {
				const bridge = getPiBridge();
				const settings = agentRunSettings
					? buildRunSettings(agentRunSettings)
					: buildRunSettings({});
				const result = bridge.enqueue({
					workspaceId,
					actionType: "import_project_agent_analysis",
					modelId: settings.modelId,
					effortLevel: settings.effortLevel,
					executionMode: settings.executionMode,
					extraContext: {
						reportId,
						repoPath: resolvedPath,
						projectProfile,
						stack,
					},
				});
				actionRunId = result.actionRunId;
				actionStatus = result.status;

				bus.emit("import:pi_analysis_requested", {
					reportId,
					actionRunId: result.actionRunId,
				});
			}

			return reply.code(201).send({
				reportId,
				workspaceId,
				projectName,
				mode,
				repoPath: resolvedPath,
				stack,
				scripts: Object.keys(scripts).slice(0, 20),
				structure: {
					totalFiles: structure.totalFiles,
					directories: structure.directories.length,
					truncated: structure.truncated,
				},
				agenticFiles: agenticFiles.map((f) => ({
					relativePath: f.relativePath,
					type: f.type,
					size: f.size,
					rulesCount: f.extractedRules.length,
					rules: f.extractedRules.slice(0, 5),
				})),
				projectProfile,
				actionRunId,
				actionStatus,
			});
		},
	);

	app.get<{ Params: { id: string } }>(
		"/api/import-reports/:id",
		async (req, reply) => {
			const db = getDb();
			const report = db
				.prepare("SELECT * FROM import_reports WHERE id = ?")
				.get(req.params.id);
			if (!report) {
				return reply
					.code(404)
					.send({ error: "not_found", message: "Import report not found" });
			}
			return reply.send(report);
		},
	);
}
