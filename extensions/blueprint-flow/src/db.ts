import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { FlowStep, FeatureStatus, StepStatus } from "./config.js";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Feature {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
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

const SCHEMA = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS features (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  title TEXT NOT NULL,
  description TEXT,
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

CREATE INDEX IF NOT EXISTS idx_features_project ON features(project_id);
CREATE INDEX IF NOT EXISTS idx_steps_feature ON steps(feature_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_feature ON artifacts(feature_id);
CREATE INDEX IF NOT EXISTS idx_memories_project ON memories(project_id);
CREATE INDEX IF NOT EXISTS idx_interviews_feature ON interviews(feature_id);
`;

let db: Database.Database | null = null;

export function initDb(dbPath: string): Database.Database {
  if (db) return db;

  mkdirSync(dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);

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
