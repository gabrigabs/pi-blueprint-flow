import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import type { FeatureStatus, FlowStep, StepStatus } from "./config.js";
import type {
	ActionRunStatus,
	ActionType,
	EffortLevel,
	ExecutionMode,
	FeatureType,
	ImportMode,
	PriorityLevel,
	ReviewStrictness,
	RiskLevel,
} from "./types.js";

export interface Project {
	id: string;
	name: string;
	description: string | null;
	repo_path: string | null;
	stack: string;
	archived: number;
	created_at: string;
	updated_at: string;
}

export interface Feature {
	id: string;
	project_id: string;
	title: string;
	description: string | null;
	type: FeatureType;
	risk_level: RiskLevel;
	priority: PriorityLevel;
	current_step: FlowStep;
	status: FeatureStatus;
	created_at: string;
	updated_at: string;
}

export interface Step {
	id: string;
	feature_id: string;
	name: FlowStep;
	status: StepStatus;
	started_at: string | null;
	completed_at: string | null;
}

export interface Artifact {
	id: string;
	feature_id: string;
	step_name: FlowStep;
	type: string;
	filename: string;
	content: string;
	created_at: string;
}

export interface Memory {
	id: string;
	project_id: string;
	category: string;
	content: string;
	source_feature_id: string | null;
	created_at: string;
}

export interface Interview {
	id: string;
	feature_id: string;
	question: string;
	answer: string | null;
	type: string;
	required: number;
	why: string | null;
	created_at: string;
}

export interface AgentRunSettingsRow {
	id: string;
	feature_id: string | null;
	step_name: string | null;
	model_id: string | null;
	agent_profile: string | null;
	effort_level: EffortLevel;
	execution_mode: ExecutionMode;
	allow_web_research: number;
	allow_repo_scan: number;
	allow_memory_search: number;
	max_research_results: number | null;
	max_interview_questions: number | null;
	review_strictness: ReviewStrictness;
	created_at: string;
}

export interface ImportReport {
	id: string;
	project_id: string | null;
	repo_path: string;
	mode: ImportMode;
	status: string;
	detected_stack: string | null;
	detected_scripts: string | null;
	detected_agentic_files: string | null;
	project_profile: string | null;
	migration_plan: string | null;
	created_at: string;
}

export interface ActionRunRow {
	id: string;
	project_id: string | null;
	feature_id: string | null;
	action_type: ActionType;
	step_name: string | null;
	status: ActionRunStatus;
	prompt: string | null;
	model_id: string | null;
	effort_level: string | null;
	execution_mode: string | null;
	error: string | null;
	started_at: string | null;
	completed_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface ActionRunEventRow {
	id: string;
	action_run_id: string;
	type: string;
	message: string | null;
	data_json: string | null;
	created_at: string;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  repo_path TEXT,
  stack TEXT DEFAULT '[]',
  archived INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS features (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'feature',
  risk_level TEXT DEFAULT 'auto',
  priority TEXT DEFAULT 'medium',
  current_step TEXT DEFAULT 'intake',
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS steps (
  id TEXT PRIMARY KEY,
  feature_id TEXT NOT NULL REFERENCES features(id),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  started_at TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  feature_id TEXT NOT NULL REFERENCES features(id),
  step_name TEXT NOT NULL,
  type TEXT NOT NULL,
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  source_feature_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
  content,
  category,
  content_rowid='rowid'
);

CREATE TABLE IF NOT EXISTS interviews (
  id TEXT PRIMARY KEY,
  feature_id TEXT NOT NULL REFERENCES features(id),
  question TEXT NOT NULL,
  answer TEXT,
  type TEXT NOT NULL,
  required INTEGER DEFAULT 0,
  why TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_run_settings (
  id TEXT PRIMARY KEY,
  feature_id TEXT REFERENCES features(id),
  step_name TEXT,
  model_id TEXT,
  agent_profile TEXT,
  effort_level TEXT DEFAULT 'balanced',
  execution_mode TEXT DEFAULT 'draft',
  allow_web_research INTEGER DEFAULT 1,
  allow_repo_scan INTEGER DEFAULT 1,
  allow_memory_search INTEGER DEFAULT 1,
  max_research_results INTEGER,
  max_interview_questions INTEGER,
  review_strictness TEXT DEFAULT 'normal',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS import_reports (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  repo_path TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  detected_stack TEXT,
  detected_scripts TEXT,
  detected_agentic_files TEXT,
  project_profile TEXT,
  migration_plan TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS action_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  feature_id TEXT REFERENCES features(id),
  action_type TEXT NOT NULL,
  step_name TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  prompt TEXT,
  model_id TEXT,
  effort_level TEXT,
  execution_mode TEXT,
  error TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS action_run_events (
  id TEXT PRIMARY KEY,
  action_run_id TEXT NOT NULL REFERENCES action_runs(id),
  type TEXT NOT NULL,
  message TEXT,
  data_json TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_features_project ON features(project_id);
CREATE INDEX IF NOT EXISTS idx_steps_feature ON steps(feature_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_feature ON artifacts(feature_id);
CREATE INDEX IF NOT EXISTS idx_memories_project ON memories(project_id);
CREATE INDEX IF NOT EXISTS idx_interviews_feature ON interviews(feature_id);
CREATE INDEX IF NOT EXISTS idx_agent_run_settings_feature ON agent_run_settings(feature_id);
CREATE INDEX IF NOT EXISTS idx_import_reports_project ON import_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_action_runs_feature ON action_runs(feature_id);
CREATE INDEX IF NOT EXISTS idx_action_runs_project ON action_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_action_runs_status ON action_runs(status);
CREATE INDEX IF NOT EXISTS idx_action_run_events_run ON action_run_events(action_run_id);
`;

/** Incremental migrations for existing databases */
const MIGRATIONS = [
	// v0.2.0: Add new columns to projects and features
	`ALTER TABLE projects ADD COLUMN repo_path TEXT`,
	`ALTER TABLE projects ADD COLUMN stack TEXT DEFAULT '[]'`,
	`ALTER TABLE projects ADD COLUMN archived INTEGER DEFAULT 0`,
	`ALTER TABLE features ADD COLUMN type TEXT DEFAULT 'feature'`,
	`ALTER TABLE features ADD COLUMN risk_level TEXT DEFAULT 'auto'`,
	`ALTER TABLE features ADD COLUMN priority TEXT DEFAULT 'medium'`,
];

let db: Database.Database | null = null;

function runMigrations(database: Database.Database): void {
	for (const migration of MIGRATIONS) {
		try {
			database.exec(migration);
		} catch {
			// Column/table already exists — safe to ignore
		}
	}
}

export function initDb(dbPath: string): Database.Database {
	if (db) return db;

	mkdirSync(dirname(dbPath), { recursive: true });

	db = new Database(dbPath);
	db.pragma("journal_mode = WAL");
	db.pragma("foreign_keys = ON");
	db.exec(SCHEMA);
	runMigrations(db);

	return db;
}

export function getDb(): Database.Database {
	if (!db) throw new Error("Database not initialized. Call initDb() first.");
	return db;
}

export function closeDb(): void {
	if (db) {
		db.close();
		db = null;
	}
}

// --- Action Run CRUD ---

export function createActionRun(input: {
	id: string;
	projectId?: string | null;
	featureId?: string | null;
	actionType: ActionType;
	stepName?: string | null;
	prompt?: string | null;
	modelId?: string | null;
	effortLevel?: string | null;
	executionMode?: string | null;
}): ActionRunRow {
	const database = getDb();
	const stmt = database.prepare(`
		INSERT INTO action_runs (id, project_id, feature_id, action_type, step_name, status, prompt, model_id, effort_level, execution_mode)
		VALUES (?, ?, ?, ?, ?, 'created', ?, ?, ?, ?)
	`);
	stmt.run(
		input.id,
		input.projectId ?? null,
		input.featureId ?? null,
		input.actionType,
		input.stepName ?? null,
		input.prompt ?? null,
		input.modelId ?? null,
		input.effortLevel ?? null,
		input.executionMode ?? null,
	);
	return getActionRun(input.id)!;
}

export function getActionRun(id: string): ActionRunRow | null {
	const database = getDb();
	return (
		(database.prepare("SELECT * FROM action_runs WHERE id = ?").get(id) as
			| ActionRunRow
			| undefined) ?? null
	);
}

export function listActionRuns(filters?: {
	featureId?: string;
	projectId?: string;
	status?: ActionRunStatus;
	limit?: number;
}): ActionRunRow[] {
	const database = getDb();
	const conditions: string[] = [];
	const params: unknown[] = [];

	if (filters?.featureId) {
		conditions.push("feature_id = ?");
		params.push(filters.featureId);
	}
	if (filters?.projectId) {
		conditions.push("project_id = ?");
		params.push(filters.projectId);
	}
	if (filters?.status) {
		conditions.push("status = ?");
		params.push(filters.status);
	}

	const where =
		conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
	const limit = filters?.limit ?? 50;

	return database
		.prepare(
			`SELECT * FROM action_runs ${where} ORDER BY created_at DESC LIMIT ?`,
		)
		.all(...params, limit) as ActionRunRow[];
}

export function updateActionRunStatus(
	id: string,
	status: ActionRunStatus,
	error?: string | null,
): ActionRunRow | null {
	const database = getDb();
	const now = new Date().toISOString().replace("T", " ").slice(0, 19);
	const isTerminal = [
		"completed",
		"failed",
		"cancelled",
		"not_connected",
	].includes(status);

	if (isTerminal) {
		database
			.prepare(`
			UPDATE action_runs SET status = ?, error = ?, completed_at = ?, updated_at = ? WHERE id = ?
		`)
			.run(status, error ?? null, now, now, id);
	} else if (status === "injected" || status === "agent_running") {
		database
			.prepare(`
			UPDATE action_runs SET status = ?, started_at = COALESCE(started_at, ?), updated_at = ? WHERE id = ?
		`)
			.run(status, now, now, id);
	} else {
		database
			.prepare(`
			UPDATE action_runs SET status = ?, updated_at = ? WHERE id = ?
		`)
			.run(status, now, id);
	}

	return getActionRun(id);
}

export function createActionRunEvent(input: {
	id: string;
	actionRunId: string;
	type: string;
	message?: string | null;
	dataJson?: string | null;
}): ActionRunEventRow {
	const database = getDb();
	database
		.prepare(`
		INSERT INTO action_run_events (id, action_run_id, type, message, data_json)
		VALUES (?, ?, ?, ?, ?)
	`)
		.run(
			input.id,
			input.actionRunId,
			input.type,
			input.message ?? null,
			input.dataJson ?? null,
		);

	return database
		.prepare("SELECT * FROM action_run_events WHERE id = ?")
		.get(input.id) as ActionRunEventRow;
}

export function listActionRunEvents(
	actionRunId: string,
	limit = 100,
): ActionRunEventRow[] {
	const database = getDb();
	return database
		.prepare(
			"SELECT * FROM action_run_events WHERE action_run_id = ? ORDER BY created_at ASC LIMIT ?",
		)
		.all(actionRunId, limit) as ActionRunEventRow[];
}

export function getActiveActionRun(): ActionRunRow | null {
	const database = getDb();
	const activeStatuses = [
		"queued",
		"waiting_for_pi",
		"injected",
		"agent_running",
		"tool_running",
		"needs_user",
		"saving_artifacts",
	];
	const placeholders = activeStatuses.map(() => "?").join(",");
	return (
		(database
			.prepare(
				`SELECT * FROM action_runs WHERE status IN (${placeholders}) ORDER BY created_at ASC LIMIT 1`,
			)
			.get(...activeStatuses) as ActionRunRow | undefined) ?? null
	);
}
